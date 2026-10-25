import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import {
  Plus, X, Upload, Download, Minus, Copy, ClipboardPaste, Sparkles, Bookmark, Loader2, Play, Pencil, AlertTriangle,
} from 'lucide-react';
import { Project } from '../../types';
import { ArshxShell } from '../../utils/nativeShell';
import { LineEditor } from '../../utils/lineEditor';
import { mergeShellFiles } from '../../utils/projectSync';
import { COMMAND_PROMPT, extractCommand, isRiskyCommand } from '../../utils/shellAi';

interface NativeShellProps {
  activeProject: Project;
  onUpdateProject: (updated: Project) => void;
  onAskAi: (prompt: string) => Promise<string>;
}

interface SessionInfo { id: string; title: string; exited: boolean }

interface Runtime {
  term: Terminal;
  fit: FitAddon;
  editor: LineEditor;
  procId: string;
  procCount: number;
  restarting: boolean;
  disposeObserver: () => void;
}

const HISTORY_KEY = 'arshx_shell_history_v1';
const FONT_KEY = 'arshx_shell_font_v1';
const SNIPPETS_KEY = 'arshx_shell_snippets_v1';
const DEFAULT_SNIPPETS = ['ls -la', 'pwd', 'cat '];

const load = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const save = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full/unavailable */ }
};

const QUICK_KEYS: { label: string; data: string; aria?: string }[] = [
  { label: 'Tab', data: '\t' },
  { label: '↑', data: '\x1b[A', aria: 'History up' },
  { label: '↓', data: '\x1b[B', aria: 'History down' },
  { label: '←', data: '\x1b[D', aria: 'Cursor left' },
  { label: '→', data: '\x1b[C', aria: 'Cursor right' },
  { label: '/', data: '/' }, { label: '-', data: '-' }, { label: '|', data: '|' },
  { label: '~', data: '~' }, { label: '_', data: '_' }, { label: '$', data: '$' },
  { label: '"', data: '"' }, { label: "'", data: "'" }, { label: '>', data: '>' },
  { label: '&', data: '&' }, { label: '*', data: '*' },
];

export const NativeShell: React.FC<NativeShellProps> = ({ activeProject, onUpdateProject, onAskAi }) => {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [ctrl, setCtrl] = useState(false);
  const [fontSize, setFontSize] = useState<number>(() => load(FONT_KEY, 13));
  const [snippets, setSnippets] = useState<string[]>(() => load(SNIPPETS_KEY, DEFAULT_SNIPPETS));
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [aiTask, setAiTask] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiCommand, setAiCommand] = useState<string | null>(null);
  const [showAi, setShowAi] = useState(false);

  const runtimes = useRef(new Map<string, Runtime>());
  const procToSession = useRef(new Map<string, string>());
  const lastPushed = useRef(new Map<string, string>());
  const lastCommand = useRef('');
  const counter = useRef(0);
  const ctrlRef = useRef(false);
  const projectRef = useRef(activeProject);
  const sessionsRef = useRef<SessionInfo[]>([]);
  const history = useRef<string[]>(load(HISTORY_KEY, []));

  ctrlRef.current = ctrl;
  projectRef.current = activeProject;
  sessionsRef.current = sessions;

  const flash = useCallback((kind: 'ok' | 'error', text: string) => {
    setNotice({ kind, text });
    window.setTimeout(() => setNotice((n) => (n && n.text === text ? null : n)), 4000);
  }, []);

  /* ---- project <-> shell sync ---- */
  const pushChanged = useCallback(async (): Promise<void> => {
    const p = projectRef.current;
    const changed = p.files.filter((f) => lastPushed.current.get(f.path) !== f.content);
    if (changed.length === 0) return;
    await ArshxShell.syncProject({
      projectId: p.id,
      files: changed.map((f) => ({ path: f.path, content: f.content })),
    });
    changed.forEach((f) => lastPushed.current.set(f.path, f.content));
  }, []);

  const pullChanges = async () => {
    try {
      const { files, skipped } = await ArshxShell.readProject({ projectId: projectRef.current.id });
      const { project, updated, added } = mergeShellFiles(projectRef.current, files);
      files.forEach((f) => lastPushed.current.set(f.path, f.content));
      if (updated + added > 0) onUpdateProject(project);
      flash('ok', updated + added === 0
        ? 'No changes to pull.'
        : `Pulled ${updated} updated, ${added} new file(s)${skipped ? `; ${skipped} skipped (binary/large)` : ''}.`);
    } catch (e: any) {
      flash('error', e?.message || 'Could not read shell files.');
    }
  };

  /* ---- process control ---- */
  const startProcess = useCallback(async (sessionId: string) => {
    const rt = runtimes.current.get(sessionId);
    if (!rt) return;
    rt.procCount += 1;
    rt.procId = `${sessionId}-p${rt.procCount}`;
    procToSession.current.set(rt.procId, sessionId);
    try {
      await pushChanged();
      await ArshxShell.start({ id: rt.procId, projectId: projectRef.current.id });
    } catch (e: any) {
      procToSession.current.delete(rt.procId);
      rt.term.write(`\r\n\x1b[31mCould not start shell: ${e?.message || e}\x1b[0m\r\n`);
      setSessions((s) => s.map((x) => (x.id === sessionId ? { ...x, exited: true } : x)));
    }
  }, [pushChanged]);

  const send = useCallback((sessionId: string, text: string) => {
    const rt = runtimes.current.get(sessionId);
    if (!rt) return;
    ArshxShell.write({ id: rt.procId, data: text }).catch((e: any) => {
      rt.term.write(`\r\n\x1b[31m${e?.message || 'Write failed'}\x1b[0m\r\n`);
    });
  }, []);

  const restartProcess = useCallback(async (sessionId: string, reason: string) => {
    const rt = runtimes.current.get(sessionId);
    if (!rt || rt.restarting) return;
    rt.restarting = true;
    const old = rt.procId;
    procToSession.current.delete(old);
    try { await ArshxShell.kill({ id: old }); } catch { /* already gone */ }
    rt.term.write(`\x1b[33m[${reason}]\x1b[0m\r\n`);
    setSessions((s) => s.map((x) => (x.id === sessionId ? { ...x, exited: false } : x)));
    await startProcess(sessionId);
    rt.restarting = false;
  }, [startProcess]);

  const feedInput = useCallback(async (sessionId: string, raw: string) => {
    const rt = runtimes.current.get(sessionId);
    if (!rt) return;
    let d = raw;
    if (ctrlRef.current && d.length === 1) {
      const c = d.toUpperCase().charCodeAt(0);
      if (c >= 64 && c <= 95) d = String.fromCharCode(c - 64);
      setCtrl(false);
    }
    const r = rt.editor.feed(d);
    if (r.echo) rt.term.write(r.echo);
    if (r.lines.length) {
      try { await pushChanged(); } catch (e: any) { flash('error', e?.message || 'Could not sync files to shell.'); }
      for (const line of r.lines) {
        send(sessionId, line + '\n');
        if (line.trim()) lastCommand.current = line;
      }
      history.current = rt.editor.getHistory();
      save(HISTORY_KEY, history.current);
    }
    if (r.interrupt) await restartProcess(sessionId, 'Ctrl+C: shell restarted');
    if (r.eof) send(sessionId, 'exit\n');
  }, [flash, pushChanged, restartProcess, send]);

  /* ---- sessions ---- */
  const createSession = useCallback(() => {
    if (sessionsRef.current.length >= 6) { flash('error', 'Maximum of 6 terminal tabs.'); return; }
    counter.current += 1;
    const id = `t${Date.now().toString(36)}${counter.current}`;
    const title = `Shell ${counter.current}`;
    setSessions((s) => [...s, { id, title, exited: false }]);
    setActiveId(id);
  }, [flash]);

  const closeSession = useCallback(async (id: string) => {
    const rt = runtimes.current.get(id);
    if (rt) {
      procToSession.current.delete(rt.procId);
      try { await ArshxShell.kill({ id: rt.procId }); } catch { /* ignore */ }
      rt.disposeObserver();
      rt.term.dispose();
      runtimes.current.delete(id);
    }
    const remaining = sessionsRef.current.filter((s) => s.id !== id);
    setSessions(remaining);
    setActiveId((cur) => (cur === id ? remaining[remaining.length - 1]?.id || '' : cur));
  }, []);

  // global process events
  useEffect(() => {
    let disposed = false;
    const handles: { remove: () => Promise<void> }[] = [];
    (async () => {
      const d = await ArshxShell.addListener('data', (e) => {
        const sid = procToSession.current.get(e.id);
        runtimes.current.get(sid || '')?.term.write(e.data.replace(/\r?\n/g, '\r\n'));
      });
      const x = await ArshxShell.addListener('exit', (e) => {
        const sid = procToSession.current.get(e.id);
        if (!sid) return; // replaced or closed
        const rt = runtimes.current.get(sid);
        rt?.term.write(`\r\n\x1b[33m[process exited with code ${e.code}] — tap + or restart\x1b[0m\r\n`);
        setSessions((s) => s.map((i) => (i.id === sid ? { ...i, exited: true } : i)));
      });
      if (disposed) { d.remove(); x.remove(); } else handles.push(d, x);
    })();
    return () => {
      disposed = true;
      handles.forEach((h) => h.remove());
      runtimes.current.forEach((rt) => {
        ArshxShell.kill({ id: rt.procId }).catch(() => {});
        rt.disposeObserver();
        rt.term.dispose();
      });
      runtimes.current.clear();
      procToSession.current.clear();
    };
  }, []);

  useEffect(() => { if (sessions.length === 0) createSession(); }, [sessions.length, createSession]);

  // apply font size to all terminals
  useEffect(() => {
    save(FONT_KEY, fontSize);
    runtimes.current.forEach((rt) => { rt.term.options.fontSize = fontSize; try { rt.fit.fit(); } catch { /* hidden */ } });
  }, [fontSize]);

  /* ---- toolbar actions ---- */
  const active = runtimes.current.get(activeId);

  const copySelection = async () => {
    const text = active?.term.getSelection();
    if (!text) { flash('error', 'Select text in the terminal first.'); return; }
    try { await navigator.clipboard.writeText(text); flash('ok', 'Copied.'); }
    catch { flash('error', 'Clipboard unavailable.'); }
  };

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) await feedInput(activeId, text);
    } catch { flash('error', 'Clipboard unavailable. Long-press in the terminal to paste.'); }
  };

  const runCommand = (cmd: string) => {
    const rt = runtimes.current.get(activeId);
    if (!rt) return;
    rt.term.write(rt.editor.setLine(cmd));
    void feedInput(activeId, '\r');
  };

  const insertCommand = (cmd: string) => {
    const rt = runtimes.current.get(activeId);
    if (rt) { rt.term.write(rt.editor.setLine(cmd)); rt.term.focus(); }
  };

  const saveSnippet = () => {
    const cmd = lastCommand.current.trim();
    if (!cmd) { flash('error', 'Run a command first, then save it.'); return; }
    if (snippets.includes(cmd)) { flash('ok', 'Already saved.'); return; }
    const next = [...snippets, cmd].slice(-20);
    setSnippets(next); save(SNIPPETS_KEY, next); flash('ok', 'Saved to shortcuts.');
  };

  const removeSnippet = (s: string) => {
    const next = snippets.filter((x) => x !== s);
    setSnippets(next); save(SNIPPETS_KEY, next);
  };

  const askAi = async () => {
    const task = aiTask.trim();
    if (!task || aiBusy) return;
    setAiBusy(true); setAiCommand(null);
    try {
      const reply = await onAskAi(COMMAND_PROMPT(task));
      if (reply.startsWith('AI Response Note:')) { flash('error', reply.replace('AI Response Note:', '').trim()); return; }
      const cmd = extractCommand(reply);
      if (!cmd) flash('error', 'The AI did not return a command. Try rephrasing.');
      else setAiCommand(cmd);
    } finally { setAiBusy(false); }
  };

  /* ---- per-session view ---- */
  const attach = useCallback((sessionId: string, el: HTMLDivElement | null) => {
    if (!el || runtimes.current.has(sessionId)) return;
    const term = new Terminal({
      fontSize,
      fontFamily: "'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace",
      cursorBlink: true,
      convertEol: true,
      scrollback: 5000,
      theme: {
        background: '#0A0A0F', foreground: '#F1F1F6', cursor: '#FF4D55', selectionBackground: 'rgba(255,77,85,0.35)',
        black: '#1B1B26', red: '#FF5E65', green: '#86EFAC', yellow: '#FBBF24', blue: '#7AA2FF',
        magenta: '#D58CFF', cyan: '#67E8F9', white: '#E4E4EC',
      },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(el);
    const editor = new LineEditor(history.current);
    const ro = new ResizeObserver(() => { try { if (el.offsetParent) fit.fit(); } catch { /* ignore */ } });
    ro.observe(el);
    const rt: Runtime = { term, fit, editor, procId: '', procCount: 0, restarting: false, disposeObserver: () => ro.disconnect() };
    runtimes.current.set(sessionId, rt);
    term.onData((d) => { void feedInput(sessionId, d); });
    term.write(`\x1b[1;31mARSHX\x1b[0m native shell — project: ${projectRef.current.name}\r\n`);
    term.write('\x1b[90mReal Android sh in app storage. Pipe-based: no vim/top. Ctrl+C restarts the shell.\x1b[0m\r\n');
    try { fit.fit(); } catch { /* ignore */ }
    void startProcess(sessionId);
  }, [feedInput, fontSize, startProcess]);

  useEffect(() => {
    const rt = runtimes.current.get(activeId);
    if (rt) window.setTimeout(() => { try { rt.fit.fit(); } catch { /* ignore */ } rt.term.focus(); }, 30);
  }, [activeId]);

  const activeInfo = sessions.find((s) => s.id === activeId);
  const risky = aiCommand ? isRiskyCommand(aiCommand) : false;

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0">
      {/* Tabs + actions */}
      <div className="flex items-center gap-1 px-2 py-1.5 overflow-x-auto shrink-0 border-b border-[#24242C]">
        {sessions.map((s) => (
          <div key={s.id} className={`flex items-center rounded-lg shrink-0 ${s.id === activeId ? 'bg-white/12 text-white' : 'text-[#B4B4C2]'}`}>
            <button onClick={() => setActiveId(s.id)} className="px-3 min-h-[40px] text-xs font-semibold flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${s.exited ? 'bg-[#FBBF24]' : 'bg-[#22C55E]'}`} />
              {s.title}
            </button>
            <button onClick={() => closeSession(s.id)} aria-label={`Close ${s.title}`} className="px-2 min-h-[40px] text-[#85858F] hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <button onClick={createSession} aria-label="New terminal tab" className="btn-ghost !min-h-[40px] !px-3 shrink-0"><Plus className="w-4 h-4" /></button>
        <div className="flex-1" />
        <button onClick={() => setShowAi(!showAi)} aria-pressed={showAi} aria-label="AI command helper" className={`btn-ghost !min-h-[40px] !px-3 shrink-0 ${showAi ? '!border-[#E5222A]/60' : ''}`}><Sparkles className="w-4 h-4 text-[#FF4D55]" /></button>
        <button onClick={() => pushChanged().then(() => flash('ok', 'Editor changes sent to shell.')).catch((e) => flash('error', e?.message || 'Sync failed'))} aria-label="Send editor files to shell" className="btn-ghost !min-h-[40px] !px-3 shrink-0"><Upload className="w-4 h-4" /></button>
        <button onClick={pullChanges} aria-label="Pull shell changes into project" className="btn-ghost !min-h-[40px] !px-3 shrink-0"><Download className="w-4 h-4" /></button>
        <button onClick={copySelection} aria-label="Copy selection" className="btn-ghost !min-h-[40px] !px-3 shrink-0"><Copy className="w-4 h-4" /></button>
        <button onClick={paste} aria-label="Paste" className="btn-ghost !min-h-[40px] !px-3 shrink-0"><ClipboardPaste className="w-4 h-4" /></button>
        <button onClick={() => setFontSize((f) => Math.max(9, f - 1))} aria-label="Smaller text" className="btn-ghost !min-h-[40px] !px-2.5 shrink-0"><Minus className="w-4 h-4" /></button>
        <button onClick={() => setFontSize((f) => Math.min(24, f + 1))} aria-label="Larger text" className="btn-ghost !min-h-[40px] !px-2.5 shrink-0"><Plus className="w-4 h-4" /></button>
      </div>

      {/* AI command helper */}
      {showAi && (
        <div className="px-3 py-2 space-y-2 shrink-0 border-b border-[#24242C]">
          <div className="flex gap-2">
            <input
              value={aiTask}
              onChange={(e) => setAiTask(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && askAi()}
              placeholder="Describe what you want to do…"
              className="glass-input flex-1 min-w-0"
              aria-label="Describe the command you need"
            />
            <button onClick={askAi} disabled={aiBusy || !aiTask.trim()} className="btn-primary shrink-0">
              {aiBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>Suggest</span>
            </button>
          </div>
          {aiCommand && (
            <div className="glass-card p-3 space-y-2">
              <code className="block font-mono text-xs text-[#86EFAC] break-all">{aiCommand}</code>
              {risky && (
                <p className="text-[11px] text-[#FBBF24] flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> This looks destructive. Check it carefully before running.</p>
              )}
              <div className="flex gap-2">
                <button onClick={() => { runCommand(aiCommand); setAiCommand(null); }} className="btn-primary !min-h-[40px]"><Play className="w-3.5 h-3.5" /> Run</button>
                <button onClick={() => { insertCommand(aiCommand); setAiCommand(null); }} className="btn-ghost !min-h-[40px]"><Pencil className="w-3.5 h-3.5" /> Edit first</button>
                <button onClick={() => setAiCommand(null)} className="btn-ghost !min-h-[40px]">Dismiss</button>
              </div>
            </div>
          )}
        </div>
      )}

      {notice && (
        <div role="status" className={`px-3 py-1.5 text-[11px] font-semibold shrink-0 ${notice.kind === 'ok' ? 'text-[#86EFAC]' : 'text-[#FF5E65]'}`}>{notice.text}</div>
      )}

      {/* Terminal viewports (all kept mounted so tabs keep their state) */}
      <div className="flex-1 min-h-0 relative">
        {sessions.map((s) => (
          <div
            key={s.id}
            ref={(el) => attach(s.id, el)}
            className={`absolute inset-0 p-1.5 ${s.id === activeId ? '' : 'invisible pointer-events-none'}`}
            onClick={() => runtimes.current.get(s.id)?.term.focus()}
          />
        ))}
        {activeInfo?.exited && (
          <button onClick={() => restartProcess(activeId, 'shell restarted')} className="btn-primary absolute bottom-3 right-3 z-10">Restart shell</button>
        )}
      </div>

      {/* Shortcuts */}
      <div className="flex items-center gap-1.5 px-2 pt-1.5 overflow-x-auto shrink-0">
        <button onClick={saveSnippet} aria-label="Save last command as shortcut" className="btn-ghost !min-h-[36px] !px-2.5 shrink-0"><Bookmark className="w-3.5 h-3.5" /></button>
        {snippets.map((s) => (
          <span key={s} className="flex items-center shrink-0 rounded-lg bg-white/8 border border-white/10">
            <button onClick={() => insertCommand(s)} className="px-2.5 min-h-[36px] text-[11px] font-mono text-[#E4E4EC]">{s}</button>
            <button onClick={() => removeSnippet(s)} aria-label={`Remove shortcut ${s}`} className="pr-2 text-[#85858F] hover:text-white"><X className="w-3 h-3" /></button>
          </span>
        ))}
      </div>

      {/* Extra keys */}
      <div className="flex items-center gap-1 px-2 py-1.5 overflow-x-auto shrink-0" style={{ paddingBottom: '0.375rem' }}>
        <button
          onClick={() => setCtrl(!ctrl)}
          aria-pressed={ctrl}
          className={`min-w-[44px] min-h-[40px] px-2.5 rounded-lg text-xs font-bold shrink-0 border ${ctrl ? 'bg-[#E5222A] border-[#FF4D55] text-white' : 'bg-white/8 border-white/10 text-[#E4E4EC]'}`}
        >Ctrl</button>
        {QUICK_KEYS.map((k) => (
          <button
            key={k.label}
            aria-label={k.aria}
            onClick={() => { void feedInput(activeId, k.data); runtimes.current.get(activeId)?.term.focus(); }}
            className="min-w-[40px] min-h-[40px] px-2.5 rounded-lg text-xs font-bold shrink-0 bg-white/8 border border-white/10 text-[#E4E4EC] active:bg-white/20"
          >{k.label}</button>
        ))}
      </div>
    </div>
  );
};
