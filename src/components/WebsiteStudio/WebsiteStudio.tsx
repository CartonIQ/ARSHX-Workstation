import React, { useState, useMemo } from 'react';
import { 
  Globe, 
  RotateCw, 
  Smartphone, 
  Tablet, 
  Monitor, 
  Download, 
  FileCode, 
  Terminal, 
  Sparkles,
  Check,
  Copy,
  ExternalLink
} from 'lucide-react';
import { Project, ProjectFile } from '../../types';

interface WebsiteStudioProps {
  activeProject: Project;
  onSaveFile: (name: string, content: string) => void;
  onAskAi: (prompt: string) => Promise<string>;
}

export const WebsiteStudio: React.FC<WebsiteStudioProps> = ({
  activeProject,
  onSaveFile,
  onAskAi,
}) => {
  const [activeTab, setActiveTab] = useState<'html' | 'css' | 'js'>('html');
  const [deviceSize, setDeviceSize] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');
  const [reloadKey, setReloadKey] = useState(0);
  const [showConsole, setShowConsole] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    '[ARSHX Studio] Local sandbox environment active',
    '[WebView] Viewport initialized with viewport meta tag',
  ]);

  // Find or initialize HTML, CSS, JS files
  const existingHtml = activeProject.files.find(f => f.name.endsWith('.html'))?.content;
  const existingCss = activeProject.files.find(f => f.name.endsWith('.css'))?.content;
  const existingJs = activeProject.files.find(f => f.name.endsWith('.js'))?.content;

  const [htmlCode, setHtmlCode] = useState(existingHtml || `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ARSHX Web App</title>
</head>
<body>
  <div class="hero">
    <div class="logo">A</div>
    <h1>ARSHX WEB STUDIO</h1>
    <p>BUILD. CREATE. RISE. - Your code. Your vision.</p>
    <button id="actionBtn" class="btn">Launch Reaction</button>
    <div id="output" class="output-box">Status: Ready</div>
  </div>
</body>
</html>`);

  const [cssCode, setCssCode] = useState(existingCss || `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

body {
  background: #111114;
  color: #F7F7FA;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.hero {
  text-align: center;
  max-width: 440px;
  background: #1A1A20;
  padding: 32px 24px;
  border-radius: 24px;
  border: 1px solid #282834;
}

.logo {
  width: 50px;
  height: 50px;
  background: #E5222A;
  border-radius: 14px;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 900;
  color: #fff;
  box-shadow: 0 4px 16px rgba(229, 34, 42, 0.4);
}

h1 {
  font-size: 20px;
  font-weight: 900;
  letter-spacing: 2px;
  margin-bottom: 8px;
}

p {
  color: #A5A5B2;
  font-size: 13px;
  margin-bottom: 24px;
}

.btn {
  background: #E5222A;
  color: #fff;
  border: none;
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: transform 0.1s;
}

.btn:active {
  transform: scale(0.96);
}

.output-box {
  margin-top: 20px;
  padding: 10px;
  background: #111114;
  border-radius: 8px;
  font-family: monospace;
  font-size: 12px;
  color: #86EFAC;
}`);

  const [jsCode, setJsCode] = useState(existingJs || `let count = 0;
const btn = document.getElementById("actionBtn");
const output = document.getElementById("output");

btn?.addEventListener("click", () => {
  count++;
  output.textContent = "Reaction triggered #" + count + " at " + new Date().toLocaleTimeString();
  console.log("[USER] Action clicked, cycle:", count);
});`);

  // Bundle complete iframe source
  const fullDocument = useMemo(() => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${cssCode}</style>
  <script>
    // Capture iframe logs into parent
    const origLog = console.log;
    console.log = function(...args) {
      origLog.apply(console, args);
      window.parent.postMessage({ type: 'CONSOLE_LOG', msg: args.join(' ') }, '*');
    };
  </script>
</head>
<body>
  ${htmlCode.replace(/<!DOCTYPE html>|<html[\s\S]*?<body[^>]*>|<\/body>[\s\S]*?<\/html>/gi, '')}
  <script>${jsCode}</script>
</body>
</html>`;
  }, [htmlCode, cssCode, jsCode]);

  const handleSaveToProject = () => {
    onSaveFile('index.html', htmlCode);
    onSaveFile('style.css', cssCode);
    onSaveFile('app.js', jsCode);
    alert('Saved website files to active project!');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0E0E12] overflow-hidden select-none">
      {/* Top Header */}
      <div className="h-14 bg-[#141418] border-b border-[#24242C] px-4 md:px-6 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <Globe className="w-5 h-5 text-[#E5222A]" />
          <div>
            <h2 className="text-sm font-bold text-white">ARSHX Website Studio</h2>
            <p className="text-[11px] text-[#A5A5B2]">
              HTML5, CSS3 & JavaScript responsive workspace with live sandbox.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Save to Project */}
          <button
            onClick={handleSaveToProject}
            className="px-3 py-1.5 bg-[#E5222A] hover:bg-[#d01c24] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-[#E5222A]/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Save to Project</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Column: Code Editor */}
        <div className="w-full md:w-1/2 flex flex-col bg-[#111114] border-r border-[#24242C] overflow-hidden">
          {/* File Switcher Tabs */}
          <div className="h-10 bg-[#141418] border-b border-[#24242C] px-2 flex items-center gap-1 shrink-0">
            <button
              onClick={() => setActiveTab('html')}
              className={`px-3 py-1.5 text-xs font-mono rounded-t-md font-semibold transition-colors ${
                activeTab === 'html'
                  ? 'bg-[#111114] text-white border-t-2 border-[#E5222A]'
                  : 'text-[#A5A5B2] hover:text-white'
              }`}
            >
              index.html
            </button>
            <button
              onClick={() => setActiveTab('css')}
              className={`px-3 py-1.5 text-xs font-mono rounded-t-md font-semibold transition-colors ${
                activeTab === 'css'
                  ? 'bg-[#111114] text-white border-t-2 border-[#E5222A]'
                  : 'text-[#A5A5B2] hover:text-white'
              }`}
            >
              style.css
            </button>
            <button
              onClick={() => setActiveTab('js')}
              className={`px-3 py-1.5 text-xs font-mono rounded-t-md font-semibold transition-colors ${
                activeTab === 'js'
                  ? 'bg-[#111114] text-white border-t-2 border-[#E5222A]'
                  : 'text-[#A5A5B2] hover:text-white'
              }`}
            >
              app.js
            </button>
          </div>

          {/* Text Area */}
          <div className="flex-1 p-3 overflow-hidden">
            <textarea
              value={activeTab === 'html' ? htmlCode : activeTab === 'css' ? cssCode : jsCode}
              onChange={(e) => {
                const val = e.target.value;
                if (activeTab === 'html') setHtmlCode(val);
                else if (activeTab === 'css') setCssCode(val);
                else setJsCode(val);
              }}
              spellCheck={false}
              className="w-full h-full bg-transparent text-[#F7F7FA] font-mono text-xs leading-5 resize-none focus:outline-none overflow-auto selection:bg-[#E5222A]/30"
            />
          </div>
        </div>

        {/* Right Column: Live Web Preview */}
        <div className="w-full md:w-1/2 flex flex-col bg-[#08080B] overflow-hidden">
          {/* Preview Controls Bar */}
          <div className="h-10 bg-[#121216] border-b border-[#24242C] px-3 flex items-center justify-between text-xs text-[#A5A5B2] shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-white">Live WebView</span>
              <span className="text-[#A5A5B2]">·</span>
              <span className="text-[10px] text-[#86EFAC] font-mono">http://localhost:sandbox</span>
            </div>

            <div className="flex items-center gap-1">
              <div className="flex items-center bg-[#181820] p-1 rounded-md border border-[#262633]">
                <button
                  onClick={() => setDeviceSize('mobile')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 ${
                    deviceSize === 'mobile' ? 'bg-[#24242C] text-white' : 'hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3 h-3" />
                  <span>390px</span>
                </button>
                <button
                  onClick={() => setDeviceSize('tablet')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 ${
                    deviceSize === 'tablet' ? 'bg-[#24242C] text-white' : 'hover:text-white'
                  }`}
                >
                  <Tablet className="w-3 h-3" />
                  <span>720px</span>
                </button>
                <button
                  onClick={() => setDeviceSize('desktop')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 ${
                    deviceSize === 'desktop' ? 'bg-[#24242C] text-white' : 'hover:text-white'
                  }`}
                >
                  <Monitor className="w-3 h-3" />
                  <span>100%</span>
                </button>
              </div>

              <button
                onClick={() => setReloadKey(k => k + 1)}
                className="p-1 hover:bg-[#24242C] rounded text-[#A5A5B2] hover:text-white"
                title="Reload"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Sandboxed Stage */}
          <div className="flex-1 p-2 sm:p-4 overflow-auto flex items-center justify-center">
            <div
              className={`transition-all duration-300 shadow-2xl overflow-hidden bg-white max-w-full ${
                deviceSize === 'mobile'
                  ? 'w-[360px] max-w-full h-[640px] max-h-[85vh] rounded-[24px] sm:rounded-[32px] border-4 sm:border-[6px] border-[#22222C]'
                  : deviceSize === 'tablet'
                  ? 'w-[640px] max-w-full h-[640px] max-h-[85vh] rounded-2xl'
                  : 'w-full h-full rounded-lg'
              }`}
            >
              <iframe
                key={reloadKey}
                srcDoc={fullDocument}
                title="ARSHX Web App Preview"
                sandbox="allow-scripts allow-modals"
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
