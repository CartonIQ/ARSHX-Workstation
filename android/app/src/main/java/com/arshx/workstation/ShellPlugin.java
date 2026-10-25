package com.arshx.workstation;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Real Android shell for ARSHX.
 *
 * Runs /system/bin/sh as an ordinary child process of the app (same sandbox and
 * permissions as the app, no root). I/O is over pipes, not a PTY, so full-screen
 * programs (vim, top) and job control are not supported; the web layer does line
 * editing and echo. Project files are mirrored into app-private storage so shell
 * commands operate on the same files as the editor.
 */
@CapacitorPlugin(name = "ArshxShell")
public class ShellPlugin extends Plugin {

    private static final int MAX_FILES = 500;
    private static final long MAX_FILE_BYTES = 1024 * 1024;
    private static final int MAX_SESSIONS = 6;

    private final Map<String, Process> sessions = new ConcurrentHashMap<>();

    private File projectsRoot() {
        File f = new File(getContext().getFilesDir(), "projects");
        //noinspection ResultOfMethodCallIgnored
        f.mkdirs();
        return f;
    }

    private File homeDir() {
        File f = new File(getContext().getFilesDir(), "home");
        //noinspection ResultOfMethodCallIgnored
        f.mkdirs();
        return f;
    }

    /** Project ids come from the web layer: restrict to a safe directory name. */
    private static String safeId(String id) {
        if (id == null) return null;
        String s = id.replaceAll("[^A-Za-z0-9_.-]", "_");
        if (s.isEmpty() || s.equals(".") || s.equals("..")) return null;
        return s;
    }

    /** Resolves rel inside base, rejecting traversal (.., absolute paths, symlink escapes). */
    private static File resolveInside(File base, String rel) throws IOException {
        if (rel == null || rel.isEmpty() || rel.startsWith("/") || rel.contains("\u0000")) {
            throw new IOException("Invalid path");
        }
        File target = new File(base, rel).getCanonicalFile();
        String basePath = base.getCanonicalPath() + File.separator;
        if (!target.getPath().startsWith(basePath)) throw new IOException("Path escapes project");
        return target;
    }

    @PluginMethod
    public void start(PluginCall call) {
        String id = safeId(call.getString("id"));
        String projectId = safeId(call.getString("projectId"));
        if (id == null) {
            call.reject("Invalid session id");
            return;
        }
        if (sessions.containsKey(id)) {
            call.reject("Session already running");
            return;
        }
        if (sessions.size() >= MAX_SESSIONS) {
            call.reject("Too many open sessions");
            return;
        }
        File cwd = projectId != null ? new File(projectsRoot(), projectId) : homeDir();
        //noinspection ResultOfMethodCallIgnored
        cwd.mkdirs();

        try {
            ProcessBuilder pb = new ProcessBuilder("/system/bin/sh", "-i");
            pb.directory(cwd);
            pb.redirectErrorStream(true);
            Map<String, String> env = pb.environment();
            env.put("HOME", homeDir().getAbsolutePath());
            env.put("TMPDIR", getContext().getCacheDir().getAbsolutePath());
            env.put("TERM", "xterm-256color");
            env.put("PS1", "$PWD $ ");
            env.put("PWD", cwd.getAbsolutePath());

            final Process proc = pb.start();
            sessions.put(id, proc);
            final String sid = id;

            Thread reader = new Thread(() -> {
                char[] buf = new char[4096];
                try (Reader r = new InputStreamReader(proc.getInputStream(), StandardCharsets.UTF_8)) {
                    int n;
                    while ((n = r.read(buf)) != -1) {
                        JSObject ev = new JSObject();
                        ev.put("id", sid);
                        ev.put("data", new String(buf, 0, n));
                        notifyListeners("data", ev);
                    }
                } catch (IOException ignored) {
                    // stream closed when the process ends
                }
                int code = -1;
                try {
                    code = proc.waitFor();
                } catch (InterruptedException ignored) {
                    Thread.currentThread().interrupt();
                }
                sessions.remove(sid, proc);
                JSObject ev = new JSObject();
                ev.put("id", sid);
                ev.put("code", code);
                notifyListeners("exit", ev);
            }, "arshx-shell-" + id);
            reader.setDaemon(true);
            reader.start();

            JSObject res = new JSObject();
            res.put("cwd", cwd.getAbsolutePath());
            call.resolve(res);
        } catch (IOException e) {
            call.reject("Could not start shell: " + e.getMessage());
        }
    }

    @PluginMethod
    public void write(PluginCall call) {
        String id = safeId(call.getString("id"));
        String data = call.getString("data");
        Process p = id == null ? null : sessions.get(id);
        if (p == null || data == null) {
            call.reject("No such session");
            return;
        }
        try {
            OutputStream os = p.getOutputStream();
            os.write(data.getBytes(StandardCharsets.UTF_8));
            os.flush();
            call.resolve();
        } catch (IOException e) {
            call.reject("Write failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void kill(PluginCall call) {
        String id = safeId(call.getString("id"));
        Process p = id == null ? null : sessions.remove(id);
        if (p != null) p.destroyForcibly();
        call.resolve();
    }

    @PluginMethod
    public void syncProject(PluginCall call) {
        String projectId = safeId(call.getString("projectId"));
        JSArray files = call.getArray("files");
        if (projectId == null || files == null) {
            call.reject("projectId and files are required");
            return;
        }
        try {
            File base = new File(projectsRoot(), projectId);
            //noinspection ResultOfMethodCallIgnored
            base.mkdirs();
            int written = 0;
            for (int i = 0; i < files.length() && i < MAX_FILES; i++) {
                JSONObject f = files.getJSONObject(i);
                String path = f.optString("path", "");
                String content = f.optString("content", "");
                File target = resolveInside(base, path);
                File parent = target.getParentFile();
                if (parent != null) //noinspection ResultOfMethodCallIgnored
                    parent.mkdirs();
                try (java.io.FileOutputStream fos = new java.io.FileOutputStream(target)) {
                    fos.write(content.getBytes(StandardCharsets.UTF_8));
                }
                written++;
            }
            JSObject res = new JSObject();
            res.put("written", written);
            res.put("dir", base.getAbsolutePath());
            call.resolve(res);
        } catch (JSONException | IOException e) {
            call.reject("Sync failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void readProject(PluginCall call) {
        String projectId = safeId(call.getString("projectId"));
        if (projectId == null) {
            call.reject("projectId is required");
            return;
        }
        File base = new File(projectsRoot(), projectId);
        JSArray out = new JSArray();
        List<File> stack = new ArrayList<>();
        stack.add(base);
        int skipped = 0;
        try {
            String basePath = base.getCanonicalPath() + File.separator;
            while (!stack.isEmpty()) {
                File dir = stack.remove(stack.size() - 1);
                File[] children = dir.listFiles();
                if (children == null) continue;
                for (File c : children) {
                    // never follow symlinks out of the project
                    if (!c.getCanonicalPath().startsWith(basePath)) { skipped++; continue; }
                    if (c.isDirectory()) {
                        String n = c.getName();
                        if (n.equals(".git") || n.equals("node_modules") || n.equals("build")) continue;
                        stack.add(c);
                    } else if (c.isFile()) {
                        if (out.length() >= MAX_FILES || c.length() > MAX_FILE_BYTES) { skipped++; continue; }
                        byte[] bytes = readAll(c);
                        if (looksBinary(bytes)) { skipped++; continue; }
                        JSObject o = new JSObject();
                        o.put("path", c.getCanonicalPath().substring(basePath.length()));
                        o.put("content", new String(bytes, StandardCharsets.UTF_8));
                        out.put(o);
                    }
                }
            }
            JSObject res = new JSObject();
            res.put("files", out);
            res.put("skipped", skipped);
            call.resolve(res);
        } catch (IOException e) {
            call.reject("Read failed: " + e.getMessage());
        }
    }

    private static byte[] readAll(File f) throws IOException {
        try (FileInputStream in = new FileInputStream(f)) {
            byte[] data = new byte[(int) f.length()];
            int off = 0;
            while (off < data.length) {
                int n = in.read(data, off, data.length - off);
                if (n < 0) break;
                off += n;
            }
            return data;
        }
    }

    private static boolean looksBinary(byte[] b) {
        int n = Math.min(b.length, 4096);
        for (int i = 0; i < n; i++) if (b[i] == 0) return true;
        return false;
    }

    @Override
    protected void handleOnDestroy() {
        for (Process p : sessions.values()) p.destroyForcibly();
        sessions.clear();
    }
}
