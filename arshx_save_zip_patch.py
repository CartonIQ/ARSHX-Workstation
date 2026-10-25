from pathlib import Path
import re
import shutil
import sys

root = Path.cwd()

app_path = root / "src/App.tsx"
dashboard_path = root / "src/components/Home/WorkspaceDashboard.tsx"
topnav_path = root / "src/components/Header/TopNav.tsx"
main_path = root / "android/app/src/main/java/com/arshx/workstation/MainActivity.java"
plugin_path = root / "android/app/src/main/java/com/arshx/workstation/ArshxZipSaverPlugin.java"

files = [app_path, dashboard_path, topnav_path, main_path]
missing = [str(p.relative_to(root)) for p in files if not p.is_file()]
if missing:
    print("STOP: Required files not found:", ", ".join(missing))
    sys.exit(1)

app = app_path.read_text()
dashboard = dashboard_path.read_text()
topnav = topnav_path.read_text()
main = main_path.read_text()

def require(condition, message):
    if not condition:
        raise RuntimeError(message)

require("import { Capacitor } from '@capacitor/core';" in app,
        "Unexpected Capacitor import in App.tsx")
require("const handleExportZip = async () => {" in app,
        "Could not locate handleExportZip")
require("onExportZip={handleExportZip}" in app,
        "Could not locate App ZIP handler bindings")
require("onExportZip?: () => void;" in dashboard,
        "Could not locate optional dashboard export prop")
require("onExportZip: () => void;" in topnav,
        "Could not locate TopNav export prop")
require("onClick={onExportZip}" in dashboard,
        "Could not locate dashboard Export ZIP button")
require("onClick={onExportZip}" in topnav,
        "Could not locate TopNav Export ZIP button")
require("registerPlugin(ShellPlugin.class);" in main,
        "Could not locate existing ShellPlugin registration")
require("ArshxZipSaver" not in app and not plugin_path.exists(),
        "Save ZIP code already exists; refusing to overwrite it")

# Prepare all changes in memory before modifying any source file.
new_app = app.replace(
    "import { Capacitor } from '@capacitor/core';",
    "import { Capacitor, registerPlugin } from '@capacitor/core';",
    1
)

plugin_ts = """
interface ArshxZipSaverPlugin {
  saveZip(options: { filename: string; data: string }): Promise<{
    saved?: boolean;
    canceled?: boolean;
  }>;
}

const ArshxZipSaver = registerPlugin<ArshxZipSaverPlugin>('ArshxZipSaver');

"""
app_match = re.search(
    r"(?m)^(?:export default )?function App\s*\(",
    new_app
)
if not app_match:
    app_match = re.search(r"(?m)^const App\s*=", new_app)
require(app_match is not None, "Could not locate the App component declaration")
new_app = new_app[:app_match.start()] + plugin_ts + new_app[app_match.start():]

save_handler = """  const handleSaveZip = async () => {
    if (!activeProject) {
      alert('Open a project before saving its ZIP.');
      return;
    }

    const filename =
      `${activeProject.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.zip`;

    try {
      const blob = await exportProjectZip(activeProject);

      if (!Capacitor.isNativePlatform()) {
        triggerDownload(blob, filename);
        return;
      }

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result;
          if (typeof result !== 'string') {
            reject(new Error('Could not read exported ZIP.'));
            return;
          }
          resolve(result.split(',')[1] || '');
        };
        reader.onerror = () =>
          reject(reader.error || new Error('ZIP conversion failed.'));
        reader.readAsDataURL(blob);
      });

      const result = await ArshxZipSaver.saveZip({ filename, data: base64 });

      if (result.canceled) {
        console.info('Save ZIP cancelled by user.');
      }
    } catch (err) {
      console.error('Save ZIP error:', err);
      alert('Could not save ZIP. Please try again.');
    }
  };

"""

new_app = new_app.replace(
    "  const handleExportZip = async () => {",
    save_handler + "  const handleExportZip = async () => {",
    1
)
new_app = new_app.replace(
    "onExportZip={handleExportZip}",
    "onExportZip={handleExportZip} onSaveZip={handleSaveZip}"
)

new_dashboard = dashboard.replace(
    "onExportZip?: () => void;",
    "onExportZip?: () => void;\n  onSaveZip?: () => void;",
    1
)
new_dashboard = new_dashboard.replace(
    "  onExportZip,\n",
    "  onExportZip,\n  onSaveZip,\n",
    1
)
dashboard_button = """              {onExportZip && (
                <button
                  type="button"
                  onClick={onExportZip}"""
require(dashboard_button in new_dashboard,
        "Dashboard button structure differs from expected source")

save_dashboard_button = """{onSaveZip && (
  <button
    type="button"
    onClick={onSaveZip}
    className="text-[11px] text-white bg-[#292929] hover:bg-[#3b3b3b] rounded-lg px-3 py-2 flex items-center gap-1.5 font-semibold"
    title="Save the project ZIP to a chosen folder"
  >
    <Download className="w-3.5 h-3.5" />
    Save ZIP
  </button>
)}
"""
new_dashboard = new_dashboard.replace(
    dashboard_button, save_dashboard_button + dashboard_button, 1
)

new_topnav = topnav.replace(
    "onExportZip: () => void;",
    "onExportZip: () => void;\n  onSaveZip: () => void;",
    1
)
new_topnav = new_topnav.replace(
    "  onExportZip,\n",
    "  onExportZip,\n  onSaveZip,\n",
    1
)
topnav_button = """        <button
          onClick={onExportZip}"""
require(topnav_button in new_topnav,
        "TopNav button structure differs from expected source")

save_topnav_button = """<button
  onClick={onSaveZip}
  className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#292929] rounded-lg hover:bg-[#3b3b3b] active:scale-95 transition-all flex items-center gap-1.5 whitespace-nowrap"
  title="Save the project ZIP to a chosen folder"
>
  <Download className="w-3.5 h-3.5" />
  <span>Save ZIP</span>
</button>
"""
new_topnav = new_topnav.replace(
    topnav_button, save_topnav_button + topnav_button, 1
)

new_main = main.replace(
    "registerPlugin(ShellPlugin.class);",
    "registerPlugin(ShellPlugin.class);\n"
    "        registerPlugin(ArshxZipSaverPlugin.class);",
    1
)

plugin_java = r'''package com.arshx.workstation;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.ActivityCallback;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.OutputStream;

@CapacitorPlugin(name = "ArshxZipSaver")
public class ArshxZipSaverPlugin extends Plugin {
    private byte[] pendingZipBytes;

    @PluginMethod
    public void saveZip(PluginCall call) {
        if (pendingZipBytes != null) {
            call.reject("A ZIP save operation is already in progress.");
            return;
        }

        String filename = call.getString("filename");
        String data = call.getString("data");

        if (filename == null || filename.trim().isEmpty()
                || data == null || data.isEmpty()) {
            call.reject("A filename and ZIP data are required.");
            return;
        }

        try {
            pendingZipBytes = Base64.decode(data, Base64.DEFAULT);

            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("application/zip");
            intent.putExtra(Intent.EXTRA_TITLE, filename);

            startActivityForResult(call, intent, "saveZipResult");
        } catch (Exception e) {
            pendingZipBytes = null;
            call.reject("Could not open the Android Save As dialog.", e);
        }
    }

    @ActivityCallback
    private void saveZipResult(PluginCall call, ActivityResult result) {
        byte[] zipBytes = pendingZipBytes;
        pendingZipBytes = null;

        if (call == null) {
            return;
        }

        if (result.getResultCode() != Activity.RESULT_OK
                || result.getData() == null
                || result.getData().getData() == null) {
            JSObject response = new JSObject();
            response.put("saved", false);
            response.put("canceled", true);
            call.resolve(response);
            return;
        }

        Uri destination = result.getData().getData();

        if (zipBytes == null) {
            call.reject("ZIP data was lost. Please try saving again.");
            return;
        }

        try (OutputStream output =
                     getContext().getContentResolver().openOutputStream(destination, "w")) {
            if (output == null) {
                call.reject("Android could not open the selected destination.");
                return;
            }

            output.write(zipBytes);
            output.flush();

            JSObject response = new JSObject();
            response.put("saved", true);
            response.put("canceled", false);
            call.resolve(response);
        } catch (Exception e) {
            call.reject("Could not write the ZIP to the selected location.", e);
        }
    }
}
'''

changes = {
    app_path: new_app,
    dashboard_path: new_dashboard,
    topnav_path: new_topnav,
    main_path: new_main,
    plugin_path: plugin_java,
}

# Back up changed existing files before writing anything.
backup_dir = root / "backups" / "save-zip-patch"
backup_dir.mkdir(parents=True, exist_ok=True)
for path in [app_path, dashboard_path, topnav_path, main_path]:
    backup = backup_dir / path.relative_to(root)
    backup.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, backup)

try:
    for path, content in changes.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content)
except Exception:
    print("Write failed; restoring original source files.")
    for path in [app_path, dashboard_path, topnav_path, main_path]:
        backup = backup_dir / path.relative_to(root)
        if backup.exists():
            shutil.copy2(backup, path)
    if plugin_path.exists():
        plugin_path.unlink()
    raise

print("PATCH APPLIED.")
print("Backups:", backup_dir)
print("Added native Save ZIP dialog and separate UI buttons.")
print("Existing Export ZIP handler was preserved.")
