import React, { useState, useEffect, useMemo } from 'react';
import { 
  RotateCw, 
  Smartphone, 
  Tablet, 
  Monitor, 
  ExternalLink, 
  X
} from 'lucide-react';
import { Project, ProjectFile } from '../../types';

interface LivePreviewPaneProps {
  activeProject: Project;
  activeFile?: ProjectFile;
  onOpenFullLab?: () => void;
  onClosePreview?: () => void;
  compact?: boolean;
}

export const LivePreviewPane: React.FC<LivePreviewPaneProps> = ({
  activeProject,
  activeFile,
  onOpenFullLab,
  onClosePreview,
  compact = false,
}) => {
  const [deviceMode, setDeviceMode] = useState<'mobile' | 'tablet' | 'desktop'>(
    () => (typeof window !== 'undefined' && window.innerWidth < 768 ? 'desktop' : 'mobile')
  );
  const [reloadKey, setReloadKey] = useState(0);
  const [debouncedContent, setDebouncedContent] = useState<string>(activeFile?.content || '');
  const [consoleLogs, setConsoleLogs] = useState<Array<{ type: string; message: string; timestamp: string }>>([]);

  // Debounce active file content updates for smooth typing
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedContent(activeFile?.content || '');
    }, 300);
    return () => clearTimeout(handler);
  }, [activeFile?.content]);

  // Determine project files, incorporating latest activeFile content
  const currentFiles = useMemo(() => {
    return activeProject.files.map(f => {
      if (activeFile && f.id === activeFile.id) {
        return { ...f, content: debouncedContent };
      }
      return f;
    });
  }, [activeProject.files, activeFile, debouncedContent]);

  const htmlFile = currentFiles.find(f => f.language === 'html' || f.name.endsWith('.html'));
  const cssFile = currentFiles.find(f => f.language === 'css' || f.name.endsWith('.css'));
  const jsFile = currentFiles.find(f => f.language === 'javascript' || f.name.endsWith('.js'));
  const kotlinFile = currentFiles.find(f => f.language === 'kotlin' || f.name.endsWith('.kt'));
  const isMarkdown = activeFile?.name.endsWith('.md') || activeFile?.language === 'markdown';

  // Generate preview HTML
  const previewHtml = useMemo(() => {
    // 1. Markdown document preview
    if (isMarkdown && activeFile) {
      const rawMd = debouncedContent
        .replace(/^# (.*$)/gim, '<h1 style="color:#FFF;font-size:24px;font-weight:800;border-bottom:1px solid #2B2B38;padding-bottom:8px;margin-bottom:16px;">$1</h1>')
        .replace(/^## (.*$)/gim, '<h2 style="color:#FFF;font-size:18px;font-weight:700;margin-top:20px;margin-bottom:12px;">$1</h2>')
        .replace(/^### (.*$)/gim, '<h3 style="color:#E5222A;font-size:15px;font-weight:600;margin-top:16px;margin-bottom:8px;">$1</h3>')
        .replace(/^\> (.*$)/gim, '<blockquote style="border-left:3px solid #E5222A;padding-left:12px;color:#A5A5B2;margin:12px 0;">$1</blockquote>')
        .replace(/```([\s\S]*?)```/gm, '<pre style="background:#16161C;padding:12px;border-radius:8px;border:1px solid #2B2B38;overflow-x:auto;color:#86EFAC;font-family:monospace;font-size:12px;margin:12px 0;"><code>$1</code></pre>')
        .replace(/`([^`]+)`/g, '<code style="background:#24242C;padding:2px 6px;border-radius:4px;color:#FF7B80;font-family:monospace;font-size:12px;">$1</code>')
        .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#FFF;">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em style="color:#CBD5E1;">$1</em>')
        .replace(/\n/g, '<br/>');

      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { background:#111114; color:#F7F7FA; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; padding:24px; line-height:1.6; }
    p { margin-bottom:12px; color:#D1D5DB; }
    hr { border:0; border-top:1px solid #24242C; margin:20px 0; }
  </style>
</head>
<body>
  ${rawMd}
</body>
</html>`;
    }

    // 2. Interactive Web project preview (HTML + CSS + JS)
    if (htmlFile) {
      let doc = htmlFile.content;

      // Ensure viewport meta
      if (!doc.includes('viewport')) {
        doc = doc.replace('<head>', '<head><meta name="viewport" content="width=device-width, initial-scale=1.0">');
      }

      // Inject CSS
      if (cssFile) {
        if (doc.includes('</head>')) {
          doc = doc.replace('</head>', `<style>${cssFile.content}</style></head>`);
        } else {
          doc = `<style>${cssFile.content}</style>` + doc;
        }
      }

      // Console & error interceptor script
      const telemetryScript = `
        <script>
          (function() {
            function report(type, msg) {
              window.parent.postMessage({ type: 'arshx-console', level: type, text: String(msg) }, '*');
            }
            const _log = console.log;
            const _err = console.error;
            const _warn = console.warn;
            console.log = function(...args) { _log.apply(console, args); report('log', args.join(' ')); };
            console.error = function(...args) { _err.apply(console, args); report('error', args.join(' ')); };
            console.warn = function(...args) { _warn.apply(console, args); report('warn', args.join(' ')); };
            window.onerror = function(msg, url, line) {
              report('error', 'Line ' + line + ': ' + msg);
            };
          })();
        </script>
      `;

      if (doc.includes('<head>')) {
        doc = doc.replace('<head>', '<head>' + telemetryScript);
      } else {
        doc = telemetryScript + doc;
      }

      // Inject JS
      if (jsFile) {
        if (doc.includes('</body>')) {
          doc = doc.replace('</body>', `<script>${jsFile.content}</script></body>`);
        } else {
          doc = doc + `<script>${jsFile.content}</script>`;
        }
      }

      return doc;
    }

    // 3. Android Kotlin / Jetpack Compose dynamic simulation
    // Extract dynamic strings from Kotlin source if available
    const ktCode = (kotlinFile ? kotlinFile.content : debouncedContent) || '';

    // Extract headline: look for Text("...") or hero-heading
    let headline = 'YOUR NEXT IDEA<br>STARTS HERE.';
    const textMatches = Array.from(ktCode.matchAll(/Text\(\s*"([^"]+)"/g)).map(m => m[1]);
    const cleanMatches = textMatches.filter(t => t.length > 2 && !t.startsWith('//') && !t.includes('{') && !t.includes('}'));
    
    // Find potential hero text
    const foundHero = cleanMatches.find(t => t.includes('STARTS HERE') || t.includes('WELCOME') || t.includes('ARSHX') || t.length > 15);
    if (foundHero) {
      headline = foundHero.replace(/\\n/g, '<br>');
    }

    // Find custom button text or fallback
    const buttonTextMatch = ktCode.match(/Button\s*\([^)]*\)[\s\S]*?Text\(\s*"([^"]+)"/);
    const buttonLabel = buttonTextMatch ? buttonTextMatch[1] : 'Open workspace';

    // Find custom app title
    const appTitleMatch = ktCode.match(/Text\(\s*"([A-Z0-9\s_-]{3,15})",\s*fontSize/);
    const appTitle = appTitleMatch ? appTitleMatch[1] : (activeProject.name || 'ARSHX');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ARSHX Compose Live Preview</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; -webkit-tap-highlight-color: transparent; }
    body { background-color: #111114; color: #F7F7FA; min-height: 100vh; padding: 18px 16px 84px; display: flex; flex-direction: column; }
    .status-bar { display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 700; color: #85858F; margin-bottom: 14px; padding: 0 4px; }
    .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
    .brand-row { display: flex; align-items: center; gap: 10px; }
    .brand-box { width: 40px; height: 40px; background: #E5222A; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 24px; color: #fff; box-shadow: 0 4px 14px rgba(229,34,42,0.35); }
    .brand-title { font-size: 19px; font-weight: 900; letter-spacing: 1.5px; }
    .brand-tag { font-size: 9px; font-weight: 700; color: #E5222A; letter-spacing: 1.2px; }
    .badge { background: #1F1F27; color: #86EFAC; border: 1px solid #2B2B38; font-size: 10px; font-weight: 700; padding: 4px 8px; border-radius: 6px; }
    
    .hero-card { background: #1A1A20; border-radius: 20px; padding: 20px; margin-bottom: 18px; border: 1px solid #2B2B36; }
    .hero-heading { font-size: 22px; font-weight: 800; line-height: 1.25; margin-bottom: 8px; color: #FFFFFF; }
    .hero-sub { font-size: 12px; color: #A5A5B2; margin-bottom: 18px; }
    .arshx-btn { width: 100%; height: 46px; background: #E5222A; color: #fff; border: none; border-radius: 12px; font-weight: 700; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: transform 0.1s, opacity 0.2s; }
    .arshx-btn:active { transform: scale(0.98); opacity: 0.9; }

    .counter-widget { background: #141418; border: 1px solid #252530; border-radius: 14px; padding: 14px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center; }
    .counter-title { font-size: 12px; color: #A5A5B2; font-weight: 600; }
    .counter-controls { display: flex; align-items: center; gap: 10px; }
    .c-btn { width: 32px; height: 32px; border-radius: 8px; background: #252530; color: #fff; border: none; font-size: 16px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .c-btn:active { background: #E5222A; }
    .c-val { font-size: 18px; font-weight: 800; color: #E5222A; min-width: 24px; text-align: center; }

    .section-title { font-size: 11px; font-weight: 700; letter-spacing: 1.2px; color: #85858F; margin-bottom: 10px; text-transform: uppercase; }
    .stat-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 18px; }
    .stat-card { background: #1A1A20; border-radius: 14px; padding: 14px; border: 1px solid #2A2A35; }
    .stat-val { font-size: 22px; font-weight: 800; color: #F7F7FA; margin-top: 6px; }
    .stat-lbl { font-size: 10px; color: #A5A5B2; font-weight: 600; text-transform: uppercase; }

    .list-item { background: #1A1A20; border-radius: 14px; padding: 14px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; border: 1px solid #24242F; cursor: pointer; transition: background 0.15s; }
    .list-item:active { background: #22222C; }
    .list-left { display: flex; align-items: center; gap: 12px; }
    .icon-box { width: 36px; height: 36px; border-radius: 10px; background: #24242C; display: flex; align-items: center; justify-content: center; font-size: 16px; color: #E5222A; }
    .item-title { font-size: 13px; font-weight: 600; color: #FFFFFF; }
    .item-desc { font-size: 11px; color: #A5A5B2; }

    .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; height: 60px; background: #151519; border-top: 1px solid #24242C; display: flex; align-items: center; justify-content: space-around; font-size: 10px; color: #A5A5B2; z-index: 50; }
    .nav-item { display: flex; flex-direction: column; align-items: center; gap: 3px; cursor: pointer; padding: 4px 8px; border-radius: 8px; }
    .nav-item.active { color: #E5222A; font-weight: 700; }
    .nav-icon { font-size: 18px; }

    #toast { display:none; position:fixed; bottom:74px; left:50%; transform:translateX(-50%); background:#24242C; color:#fff; border:1px solid #E5222A; border-radius:10px; padding:10px 18px; font-size:12px; z-index:99; box-shadow:0 6px 20px rgba(0,0,0,0.6); font-weight:600; text-align:center; min-width:220px; }
  </style>
</head>
<body>
  <div class="status-bar">
    <span>12:00</span>
    <span style="display:flex;gap:6px;align-items:center;">
      <span>5G</span>
      <span>📶</span>
      <span>100% 🔋</span>
    </span>
  </div>

  <div class="header">
    <div class="brand-row">
      <div class="brand-box">A</div>
      <div>
        <div class="brand-title">${appTitle}</div>
        <div class="brand-tag">BUILD. CREATE. RISE.</div>
      </div>
    </div>
    <span class="badge">SDK 35 · Compose</span>
  </div>

  <div class="hero-card">
    <h2 class="hero-heading">${headline}</h2>
    <p class="hero-sub">Your code. Your vision. Your universe.</p>
    <button id="openBtn" class="arshx-btn">
      <span>+</span> ${buttonLabel}
    </button>
  </div>

  <div class="counter-widget">
    <div>
      <div class="counter-title">Interactive Compose State</div>
      <div style="font-size:10px;color:#85858F;">remember { mutableStateOf(count) }</div>
    </div>
    <div class="counter-controls">
      <button class="c-btn" id="decBtn">-</button>
      <span class="c-val" id="countVal">0</span>
      <button class="c-btn" id="incBtn">+</button>
    </div>
  </div>

  <div class="section-title">WORKSPACE OVERVIEW</div>
  <div class="stat-row">
    <div class="stat-card">
      <div class="stat-lbl">Active Files</div>
      <div class="stat-val">${activeProject.files.length}</div>
    </div>
    <div class="stat-card">
      <div class="stat-lbl">Build Target</div>
      <div class="stat-val" style="color: #E5222A;">API 35</div>
    </div>
  </div>

  <div class="section-title">QUICK ACCESS</div>
  <div class="list-item" onclick="showToast('Code Editor selected · Ready for editing')">
    <div class="list-left">
      <div class="icon-box">⚡</div>
      <div>
        <div class="item-title">Code Editor</div>
        <div class="item-desc">Write and inspect source files</div>
      </div>
    </div>
    <span style="color: #A5A5B2;">&gt;</span>
  </div>

  <div class="list-item" onclick="showToast('Smart Terminal selected · Sandbox ready')">
    <div class="list-left">
      <div class="icon-box">&gt;_</div>
      <div>
        <div class="item-title">Smart Terminal</div>
        <div class="item-desc">Built-in CLI & Gradle pre-flight</div>
      </div>
    </div>
    <span style="color: #A5A5B2;">&gt;</span>
  </div>

  <div class="list-item" onclick="showToast('Build Center selected · Release workflow ready')">
    <div class="list-left">
      <div class="icon-box">📦</div>
      <div>
        <div class="item-title">Build Center</div>
        <div class="item-desc">Release configuration and verification</div>
      </div>
    </div>
    <span style="color: #A5A5B2;">&gt;</span>
  </div>

  <div class="bottom-nav">
    <div class="nav-item active" onclick="showNavToast('Home', this)">
      <span class="nav-icon">⊞</span>
      <span>Home</span>
    </div>
    <div class="nav-item" onclick="showNavToast('Projects', this)">
      <span class="nav-icon">📁</span>
      <span>Projects</span>
    </div>
    <div class="nav-item" onclick="showNavToast('Editor', this)">
      <span class="nav-icon">&lt;/&gt;</span>
      <span>Editor</span>
    </div>
    <div class="nav-item" onclick="showNavToast('Terminal', this)">
      <span class="nav-icon">&gt;_</span>
      <span>Terminal</span>
    </div>
    <div class="nav-item" onclick="showNavToast('Tools', this)">
      <span class="nav-icon">⚙</span>
      <span>Tools</span>
    </div>
  </div>

  <div id="toast"></div>

  <script>
    let toastTimeout;
    function showToast(msg) {
      const t = document.getElementById("toast");
      if (t) {
        t.textContent = msg;
        t.style.display = "block";
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => { t.style.display = "none"; }, 2500);
      }
    }

    function showNavToast(screen, el) {
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      el.classList.add('active');
      showToast(screen + ' screen activated');
    }

    let count = 0;
    const countVal = document.getElementById("countVal");
    document.getElementById("incBtn")?.addEventListener("click", () => {
      count++;
      if (countVal) countVal.textContent = count;
    });
    document.getElementById("decBtn")?.addEventListener("click", () => {
      if (count > 0) count--;
      if (countVal) countVal.textContent = count;
    });

    document.getElementById("openBtn")?.addEventListener("click", () => {
      showToast("Workspace opened · Compose UI active");
    });
  </script>
</body>
</html>`;
  }, [htmlFile, cssFile, jsFile, kotlinFile, isMarkdown, debouncedContent, activeFile, activeProject, reloadKey]);

  // Listen to messages from the preview iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'arshx-console') {
        const time = new Date().toLocaleTimeString();
        setConsoleLogs(prev => [...prev.slice(-49), {
          type: e.data.level || 'log',
          message: e.data.text || '',
          timestamp: time,
        }]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const previewEngineLabel = useMemo(() => {
    if (isMarkdown) return 'Markdown Viewer';
    if (htmlFile) return 'Web Engine';
    return 'Compose Simulator';
  }, [isMarkdown, htmlFile]);

  return (
    <div className={`flex-1 flex flex-col h-full bg-[#0C0C0F] ${compact ? '' : 'border-l border-[#24242C]'} overflow-hidden select-none`}>
      {/* Preview Sub-Header / Control Bar */}
      <div className="h-10 bg-[#15151A] border-b border-[#24242C] px-3 flex items-center justify-between text-xs text-[#A5A5B2] shrink-0">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" title="Live Preview Synchronized" />
            <span className="font-bold text-white tracking-wide">Live Preview</span>
          </div>
          <span className="text-[#3E3E4C]">·</span>
          <span className="text-[11px] text-[#E5222A] font-medium truncate">
            {previewEngineLabel}
          </span>
        </div>

        {/* Device Switcher & Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Device Viewport Selector */}
          <div className="max-md:hidden flex items-center gap-0.5 bg-[#101014] p-0.5 rounded-md border border-[#272733]">
            <button
              onClick={() => setDeviceMode('mobile')}
              className={`p-1 rounded transition-colors ${
                deviceMode === 'mobile' ? 'bg-[#252530] text-white shadow-xs' : 'text-[#85858F] hover:text-white'
              }`}
              title="Mobile Phone Viewport (390px)"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDeviceMode('tablet')}
              className={`p-1 rounded transition-colors ${
                deviceMode === 'tablet' ? 'bg-[#252530] text-white shadow-xs' : 'text-[#85858F] hover:text-white'
              }`}
              title="Tablet Viewport (720px)"
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDeviceMode('desktop')}
              className={`p-1 rounded transition-colors ${
                deviceMode === 'desktop' ? 'bg-[#252530] text-white shadow-xs' : 'text-[#85858F] hover:text-white'
              }`}
              title="Full Width Responsive"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Reload Button */}
          <button
            onClick={() => setReloadKey(k => k + 1)}
            className="p-1.5 hover:bg-[#24242C] rounded-md text-[#A5A5B2] hover:text-white transition-colors"
            title="Reload Preview"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          {/* Full Lab / Maximize */}
          {onOpenFullLab && (
            <button
              onClick={onOpenFullLab}
              className="p-1.5 hover:bg-[#24242C] rounded-md text-[#A5A5B2] hover:text-white transition-colors hidden sm:block"
              title="Open in Dedicated Preview Lab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Close preview split pane */}
          {onClosePreview && (
            <button
              onClick={onClosePreview}
              className="p-1.5 hover:bg-[#24242C] rounded-md text-[#A5A5B2] hover:text-white transition-colors"
              title="Close Preview Pane (Switch to Code Only)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Preview Stage */}
      <div className="flex-1 bg-[#09090C] overflow-auto flex items-center justify-center p-0 md:p-4 relative">
        <div
          className={`transition-all duration-200 shadow-2xl overflow-hidden flex flex-col bg-[#111114] max-w-full ${
            deviceMode === 'mobile'
              ? 'w-[375px] max-w-full h-[660px] max-h-[82vh] rounded-[24px] sm:rounded-[32px] border-4 sm:border-[6px] border-[#252530] ring-1 ring-[#3A3A4A]'
              : deviceMode === 'tablet'
              ? 'w-[680px] max-w-full h-[680px] max-h-[82vh] rounded-xl border border-[#2E2E3A]'
              : 'w-full h-full rounded-none md:rounded-md border-0 md:border border-[#24242C]'
          }`}
        >
          {/* Simulated Mobile Camera Notch */}
          {deviceMode === 'mobile' && (
            <div className="h-5 bg-[#16161B] flex items-center justify-center shrink-0">
              <div className="w-16 h-3 bg-[#252530] rounded-full" />
            </div>
          )}

          {/* Sandboxed Live iframe */}
          <iframe
            key={reloadKey}
            srcDoc={previewHtml}
            title="ARSHX Live Preview"
            sandbox="allow-scripts allow-modals allow-same-origin"
            className="w-full flex-1 border-0 bg-[#111114]"
          />
        </div>
      </div>

      {/* In-Preview Console Footer (if any logs exist) */}
      {consoleLogs.length > 0 && (
        <div className="h-20 bg-[#0E0E12] border-t border-[#1F1F28] px-3 py-1.5 overflow-y-auto font-mono text-[11px] text-[#A5A5B2] shrink-0">
          <div className="flex items-center justify-between text-[10px] text-[#85858F] uppercase font-bold mb-1">
            <span>Console output</span>
            <button onClick={() => setConsoleLogs([])} className="hover:text-white">Clear</button>
          </div>
          {consoleLogs.slice(-3).map((log, i) => (
            <div key={i} className={`truncate ${log.type === 'error' ? 'text-[#FF5E65]' : 'text-[#86EFAC]'}`}>
              <span className="text-[#64748B]">[{log.timestamp}]</span> {log.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
