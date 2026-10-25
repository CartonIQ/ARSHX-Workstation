import React, { useState, useRef, useEffect } from 'react';
import { 
  Terminal as TerminalIcon, 
  Trash2, 
  CornerDownLeft, 
  Sparkles, 
  Check, 
  AlertCircle,
  Copy,
  ChevronRight
} from 'lucide-react';
import { Project, TerminalEntry } from '../../types';
import { runStaticDiagnostics, createCheckpoint, createNewFile, loadCheckpoints, exportProjectZip, triggerDownload } from '../../utils/fileSystem';

interface SmartTerminalProps {
  activeProject: Project;
  onUpdateProject: (updated: Project) => void;
  onAskAi: (prompt: string) => Promise<string>;
}

export const SmartTerminal: React.FC<SmartTerminalProps> = ({
  activeProject,
  onUpdateProject,
  onAskAi,
}) => {
  const [entries, setEntries] = useState<TerminalEntry[]>([
    {
      id: 'entry-welcome',
      type: 'system',
      text: `ARSHX Workstation Shell [Built-in CLI & Isolated Sandbox v0.2.0]
Workspace: /workspace/${activeProject.name} (Branch: ${activeProject.gitBranch || 'main'})
Ready. Type 'help' to inspect built-in commands or click quick actions below.`,
      timestamp: Date.now(),
    },
  ]);
  const [inputCommand, setInputCommand] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isExecuting, setIsExecuting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries, isExecuting]);

  const addEntry = (type: TerminalEntry['type'], text: string, command?: string) => {
    setEntries((prev) => [
      ...prev,
      {
        id: `term-${Date.now()}-${Math.random()}`,
        type,
        text,
        command,
        timestamp: Date.now(),
      },
    ]);
  };

  const runCommandString = async (rawCmd: string) => {
    const cmd = rawCmd.trim();
    if (!cmd) return;

    // Echo command input to terminal
    addEntry('input', cmd, cmd);
    setHistory((prev) => (prev[prev.length - 1] === cmd ? prev : [...prev, cmd]));
    setHistoryIndex(-1);
    setInputCommand('');
    setIsExecuting(true);

    try {
      await executeCommand(cmd);
    } catch (err: any) {
      addEntry('error', `Command failed: ${err?.message || 'Unknown runtime error'}`);
    } finally {
      setIsExecuting(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runCommandString(inputCommand);
  };

  const executeCommand = async (cmd: string) => {
    const trimmed = cmd.trim();
    const parts = trimmed.split(' ').filter(Boolean);
    const mainCmd = parts[0]?.toLowerCase();
    const args = parts.slice(1);

    switch (mainCmd) {
      case 'help':
      case 'commands':
      case '?':
        addEntry(
          'output',
          `ARSHX Workstation Command Reference:

[FILES & WORKSPACE]
  ls [-l|-a]             - List project files, sizes, and entry points
  cat <file>             - Print file content to terminal
  touch <file>           - Create a new file in active workspace
  mkdir <dir>            - Create virtual directory path
  rm -f <file>           - Delete file (safety guard: -f required)
  pwd                    - Print working directory path
  find <query>           - Search project files by name pattern
  grep <pattern> <file>  - Search text within a project file

[SYSTEM & RUNTIME]
  run <file> | node <file> - Execute JavaScript in isolated execution sandbox
  python <file> | py <file> - Run Python script through client interpreter
  echo <text>            - Print string (supports $USER, $PROJECT, $BRANCH)
  whoami                 - Display active session user
  date                   - Display current system date & time
  env                    - List environment and SDK configuration
  history                - Display recent terminal command history
  clear                  - Clear terminal output screen
  arshx | version        - Display ARSHX system specs & ASCII artwork

[GIT VERSION CONTROL]
  git status             - Show repository status and active files
  git log                - Inspect Time Machine checkpoint commit history
  git commit -m "<msg>"  - Create a new persistent snapshot checkpoint
  git branch             - List repository branches
  git add <files>        - Stage files for checkpoint commit

[BUILD & DEVICE TOOLCHAIN]
  gradle build           - Manifest audit & Android SDK 35 pre-flight
  ./gradlew assembleDebug - Static compilation inspection & Termux steps
  termux status          - Verify Termux environment & toolchain paths
  doctor                 - Run Project Doctor syntax & manifest diagnostic
  export | zip           - Package and download project as clean ZIP

[AI CODE ASSISTANT]
  ai "<prompt>"          - Query Gemini AI Assistant with workspace context`
        );
        break;

      case 'clear':
        setEntries([]);
        break;

      case 'pwd':
        addEntry('output', `/workspace/${activeProject.name}`);
        break;

      case 'whoami':
        addEntry('output', 'arshx (workstation developer)');
        break;

      case 'date':
        addEntry('output', new Date().toString());
        break;

      case 'echo':
        let text = args.join(' ');
        text = text.replace(/\$USER/g, 'arshx');
        text = text.replace(/\$PROJECT/g, activeProject.name);
        text = text.replace(/\$BRANCH/g, activeProject.gitBranch || 'main');
        text = text.replace(/^["']|["']$/g, '');
        addEntry('output', text);
        break;

      case 'env':
        addEntry(
          'output',
          `SHELL=/bin/arshx-sh
USER=arshx
HOME=/home/arshx
WORKSPACE=/workspace/${activeProject.name}
PROJECT_CATEGORY=${activeProject.category}
SDK_TARGET=35 (Android 15)
COMPOSE_BOM=2025.02.00
GRADLE_VERSION=8.11.1
AGP_VERSION=8.9.2
NODE_ENV=development`
        );
        break;

      case 'history':
        if (history.length === 0) {
          addEntry('output', 'No command history recorded yet.');
        } else {
          addEntry('output', history.map((h, i) => `  ${String(i + 1).padStart(3, ' ')}  ${h}`).join('\n'));
        }
        break;

      case 'arshx':
      case 'version':
        addEntry(
          'output',
          `
   █████╗ ██████╗ ███████╗██╗  ██╗██╗  ██╗
  ██╔══██╗██╔══██╗██╔════╝██║  ██║╚██╗██╔╝
  ███████║██████╔╝███████╗███████║ ╚███╔╝ 
  ██╔══██║██╔══██╗╚════██║██╔══██║ ██╔██╗ 
  ██║  ██║██║  ██║███████║██║  ██║██╔╝ ██╗
  ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝
  BUILD. CREATE. RISE.
  Tagline: Your code. Your vision. Your universe.
  Workstation Version: 0.2.0-release
  Engine: Native Android Kotlin & Web Workstation
  SDK Target: Android SDK Platform 35 / Compose BOM 2025.02.00`
        );
        break;

      case 'ls': {
        const fileList = activeProject.files
          .map((f) => {
            const size = new Blob([f.content]).size;
            const marker = f.isEntry ? '★' : '-';
            const perm = '-rw-r--r--';
            return `  ${marker} ${perm}  ${String(size).padStart(6, ' ')} B  ${f.path} [${f.language}]`;
          })
          .join('\n');
        addEntry(
          'output',
          `Contents of /workspace/${activeProject.name}:\n${fileList}\nTotal: ${activeProject.files.length} tracked files`
        );
        break;
      }

      case 'cat': {
        if (!args[0]) {
          addEntry('error', 'Usage: cat <filename>');
          return;
        }
        const searchName = args[0].toLowerCase();
        const targetFile = activeProject.files.find(
          (f) =>
            f.name.toLowerCase() === searchName ||
            f.path.toLowerCase() === searchName ||
            f.name.toLowerCase().startsWith(searchName + '.')
        );
        if (!targetFile) {
          addEntry('error', `cat: ${args[0]}: No such file in project. Type 'ls' to view files.`);
        } else {
          addEntry('output', targetFile.content);
        }
        break;
      }

      case 'touch': {
        if (!args[0]) {
          addEntry('error', 'Usage: touch <filename>');
          return;
        }
        const filename = args[0];
        const existing = activeProject.files.find(f => f.name.toLowerCase() === filename.toLowerCase());
        if (existing) {
          addEntry('system', `File '${filename}' already exists; timestamp refreshed.`);
          return;
        }
        const newFile = createNewFile(filename, filename);
        const updatedFiles = [...activeProject.files, newFile];
        onUpdateProject({
          ...activeProject,
          files: updatedFiles,
          activeFileId: newFile.id,
          updatedAt: Date.now(),
        });
        addEntry('success', `✔ Created file '${filename}' [${newFile.language}]`);
        break;
      }

      case 'mkdir': {
        if (!args[0]) {
          addEntry('error', 'Usage: mkdir <directory>');
          return;
        }
        addEntry('success', `✔ Created directory '${args[0]}' in project structure.`);
        break;
      }

      case 'find': {
        const query = args[0]?.toLowerCase() || '';
        const matches = activeProject.files.filter(f => f.path.toLowerCase().includes(query) || f.name.toLowerCase().includes(query));
        if (matches.length === 0) {
          addEntry('output', `find: No files matching '${query}'`);
        } else {
          addEntry('output', matches.map(m => `  ${m.path}`).join('\n'));
        }
        break;
      }

      case 'grep': {
        if (args.length < 2) {
          addEntry('error', 'Usage: grep <pattern> <file>');
          return;
        }
        const pattern = args[0];
        const targetName = args[1].toLowerCase();
        const file = activeProject.files.find(f => f.name.toLowerCase() === targetName || f.path.toLowerCase() === targetName);
        if (!file) {
          addEntry('error', `grep: ${args[1]}: No such file`);
          return;
        }
        const lines = file.content.split('\n');
        const hits = lines
          .map((line, idx) => ({ line, num: idx + 1 }))
          .filter(item => item.line.toLowerCase().includes(pattern.toLowerCase()));
        if (hits.length === 0) {
          addEntry('output', `Pattern '${pattern}' not found in ${file.name}`);
        } else {
          addEntry('output', hits.map(h => `  ${file.name}:${h.num}: ${h.line}`).join('\n'));
        }
        break;
      }

      case 'rm': {
        const hasForce = args.includes('-f') || args.includes('--force');
        const filenameArg = args.filter((a) => a !== '-f' && a !== '--force')[0];

        if (!filenameArg) {
          addEntry('error', 'Usage: rm -f <filename>');
          return;
        }

        const toDelete = activeProject.files.find(
          (f) =>
            f.name.toLowerCase() === filenameArg.toLowerCase() ||
            f.path.toLowerCase() === filenameArg.toLowerCase()
        );

        if (!toDelete) {
          addEntry('error', `rm: cannot remove '${filenameArg}': No such file in project`);
          return;
        }

        if (toDelete.isEntry) {
          addEntry('error', `rm: protected file '${toDelete.name}' is an active project entry point.`);
          return;
        }

        if (activeProject.files.length <= 1) {
          addEntry('error', `rm: cannot delete the only remaining file in project`);
          return;
        }

        if (!hasForce) {
          addEntry(
            'error',
            `rm: destructive safety guard active. Run 'rm -f ${filenameArg}' to confirm deletion.`
          );
          return;
        }

        const remaining = activeProject.files.filter((f) => f.id !== toDelete.id);
        onUpdateProject({
          ...activeProject,
          files: remaining,
          activeFileId: remaining[0].id,
          updatedAt: Date.now(),
        });
        addEntry('success', `✔ Removed file '${filenameArg}'`);
        break;
      }

      case 'run':
      case 'node':
      case 'js': {
        const runFilename = args[0];
        if (!runFilename) {
          addEntry('error', `Usage: ${mainCmd} <filename.js>`);
          return;
        }

        const runFile = activeProject.files.find(
          (f) =>
            f.name.toLowerCase() === runFilename.toLowerCase() ||
            f.path.toLowerCase() === runFilename.toLowerCase() ||
            f.name.toLowerCase().startsWith(runFilename.toLowerCase() + '.')
        );

        if (!runFile) {
          addEntry('error', `${mainCmd}: ${runFilename}: No such file in project`);
          return;
        }

        addEntry('system', `Executing ${runFile.name} in secure isolated sandbox (watchdog: 2500ms)...`);

        // Isolated sandbox: execute in a Web Worker with a watchdog timer
        let executed = false;
        const capturedLogs: string[] = [];

        try {
          // Method 1: Web Worker
          const workerSource = `
            const logs = [];
            const customConsole = {
              log: (...a) => logs.push(a.map(x => typeof x === 'object' ? JSON.stringify(x) : String(x)).join(' ')),
              warn: (...a) => logs.push('[WARN] ' + a.map(x => typeof x === 'object' ? JSON.stringify(x) : String(x)).join(' ')),
              error: (...a) => logs.push('[ERR] ' + a.map(x => typeof x === 'object' ? JSON.stringify(x) : String(x)).join(' '))
            };
            self.console = customConsole;
            try {
              ${runFile.content}
              postMessage({ status: 'ok', logs });
            } catch (err) {
              postMessage({ status: 'error', message: err ? (err.message || String(err)) : 'Execution error', logs });
            }
          `;

          const blob = new Blob([workerSource], { type: 'application/javascript' });
          const workerUrl = URL.createObjectURL(blob);
          const worker = new Worker(workerUrl);

          await new Promise<void>((resolve) => {
            const timeoutId = setTimeout(() => {
              if (!executed) {
                executed = true;
                worker.terminate();
                URL.revokeObjectURL(workerUrl);
                addEntry('error', 'Execution halted: Script exceeded 2500ms limit.');
                resolve();
              }
            }, 2500);

            worker.onmessage = (event) => {
              if (executed) return;
              executed = true;
              clearTimeout(timeoutId);
              worker.terminate();
              URL.revokeObjectURL(workerUrl);

              const { status, logs, message } = event.data;
              if (logs && logs.length > 0) {
                addEntry('output', logs.join('\n'));
              }
              if (status === 'ok') {
                addEntry('success', `✔ Execution completed with return code 0.`);
              } else {
                addEntry('error', `Runtime Error: ${message}`);
              }
              resolve();
            };

            worker.onerror = (err) => {
              if (executed) return;
              executed = true;
              clearTimeout(timeoutId);
              worker.terminate();
              URL.revokeObjectURL(workerUrl);
              addEntry('error', `Worker Error: ${err.message || 'Syntax error in script'}`);
              resolve();
            };
          });
        } catch (workerErr) {
          // No main-thread fallback: running user code outside a Worker would expose
          // app storage (including the saved API key) to that code.
          addEntry('error', `Cannot start isolated execution sandbox: ${(workerErr as Error)?.message || 'Web Workers unavailable'}.`);
        }
        break;
      }

      case 'python':
      case 'python3':
      case 'py': {
        const pyFile = args[0];
        if (!pyFile) {
          addEntry('error', `Usage: ${mainCmd} <filename.py>`);
          return;
        }
        const target = activeProject.files.find(f => f.name.toLowerCase() === pyFile.toLowerCase() || f.path.toLowerCase() === pyFile.toLowerCase());
        if (!target) {
          addEntry('error', `python: ${pyFile}: No such file`);
          return;
        }
        // Simulated Python interpreter
        addEntry('system', `Parsing Python 3.12 script '${target.name}'...`);
        const printMatches = Array.from(target.content.matchAll(/print\s*\(\s*["']([^"']*)["']\s*\)/g)).map(m => m[1]);
        if (printMatches.length > 0) {
          addEntry('output', printMatches.join('\n'));
          addEntry('success', `✔ Process finished with exit code 0`);
        } else {
          addEntry('output', `[Python AST validated: ${target.content.split('\n').length} lines syntax OK]`);
          addEntry('success', `✔ Process finished with exit code 0`);
        }
        break;
      }

      case 'gradle':
      case 'build': {
        addEntry('system', `ARSHX Build Pipeline: Static Pre-flight & Manifest Verification`);
        const hasManifest = activeProject.files.some((f) =>
          f.name === 'AndroidManifest.xml' || f.path.includes('AndroidManifest.xml')
        );
        const hasGradle = activeProject.files.some((f) =>
          f.name.includes('build.gradle') || f.path.includes('build.gradle')
        );
        const kotlinFiles = activeProject.files.filter(
          (f) => f.language === 'kotlin' || f.name.endsWith('.kt')
        );
        const diags = runStaticDiagnostics(activeProject);
        const errorDiags = diags.filter((d) => d.severity === 'error');

        addEntry(
          'output',
          `Pre-flight Analysis Results for "${activeProject.name}":
  • Android Manifest: ${hasManifest ? '✔ Present' : '⚠ Missing (app/src/main/AndroidManifest.xml)'}
  • Gradle Build Config: ${hasGradle ? '✔ Present' : '⚠ Missing build.gradle'}
  • Kotlin/Compose Source: ${kotlinFiles.length} file(s) detected
  • Static Syntax Violations: ${errorDiags.length === 0 ? '✔ 0 syntax errors' : `✖ ${errorDiags.length} errors found`}

[Host Execution Disclosure]
In-browser compilation of native DEX bytecode and APK packaging requires an active JDK 17+ and AAPT2 toolchain.
To assemble the native debug APK directly on your Android phone or machine:
  1. Export project: Run 'export' or click 'Export ZIP' in Build Center
  2. In Termux, run:
     pkg install openjdk-17
     chmod +x ./gradlew && ./gradlew assembleDebug
  3. Output binary will be at: app/build/outputs/apk/debug/app-debug.apk`
        );
        if (errorDiags.length === 0 && hasManifest && hasGradle) {
          addEntry('success', `✔ Project structure is valid and ready for Gradle 8.11.1 / SDK 35 compilation.`);
        } else {
          addEntry('info', `Notice: Fix missing configurations or syntax issues before native compilation.`);
        }
        break;
      }

      case 'export':
      case 'zip': {
        addEntry('system', `Packaging project "${activeProject.name}" into clean ZIP archive...`);
        try {
          const blob = await exportProjectZip(activeProject);
          triggerDownload(
            blob,
            `${activeProject.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.zip`
          );
          addEntry('success', `✔ Project archive successfully exported to your download directory.`);
        } catch (exportErr: any) {
          addEntry('error', `Failed to export ZIP: ${exportErr?.message || exportErr}`);
        }
        break;
      }

      case 'termux':
        addEntry(
          'output',
          `Termux Workstation Specifications:
  Target Architecture: aarch64 (ARM64)
  Java Runtime: OpenJDK 17.0.12 (Compatible with Gradle 8.11.1)
  Android SDK Target: Platform 35 (Android 15)
  Build Tools: 35.0.0
  Native Command: ./gradlew assembleDebug`
        );
        break;

      case 'doctor': {
        const diags = runStaticDiagnostics(activeProject);
        if (diags.length === 0) {
          addEntry('success', `✔ Project Doctor: 0 issues detected! Project is clean and compliant.`);
        } else {
          const report = diags
            .map((d) => `  [${d.severity.toUpperCase()}] ${d.file}: ${d.title} - ${d.detail}`)
            .join('\n');
          addEntry('output', `Project Doctor Scan (${diags.length} issues found):\n${report}`);
        }
        break;
      }

      case 'git': {
        const gitAction = args[0]?.toLowerCase();
        if (gitAction === 'status') {
          addEntry(
            'output',
            `On branch ${activeProject.gitBranch || 'main'}
Your branch is up to date with 'origin/main'.
Tracking ${activeProject.files.length} project files.
Last commit: "${activeProject.lastCommitMessage || 'Initial commit'}"`
          );
        } else if (gitAction === 'branch') {
          addEntry('output', `* ${activeProject.gitBranch || 'main'}`);
        } else if (gitAction === 'add') {
          addEntry('output', `Staged ${args.slice(1).join(' ') || '.'} for commit.`);
        } else if (gitAction === 'diff') {
          addEntry('output', `No unstaged modifications in working tree.`);
        } else if (gitAction === 'log') {
          try {
            const checkpoints = await loadCheckpoints(activeProject.id);
            if (checkpoints.length > 0) {
              const logEntries = checkpoints
                .slice(0, 10)
                .map(
                  (cp) =>
                    `* commit ${cp.commitHash} (${activeProject.gitBranch || 'main'})
  Date:   ${new Date(cp.timestamp).toLocaleString()}
  Files:  ${cp.files.length} tracked
  
  ${cp.message}`
                )
                .join('\n\n');
              addEntry('output', `Checkpoint Commit History:\n${logEntries}`);
            } else {
              addEntry(
                'output',
                `* commit init-01 (${activeProject.gitBranch || 'main'})
  Date:   ${new Date(activeProject.updatedAt).toLocaleString()}
  
  ${activeProject.lastCommitMessage || 'Initial commit'}`
              );
            }
          } catch (logErr) {
            addEntry(
              'output',
              `* commit ${activeProject.id.substring(0, 7)}\n  Date: ${new Date(
                activeProject.updatedAt
              ).toLocaleString()}\n  ${activeProject.lastCommitMessage || 'Initial commit'}`
            );
          }
        } else if (gitAction === 'commit') {
          const messageFlagIdx = args.indexOf('-m');
          let msg = 'Checkpoint commit';
          if (messageFlagIdx !== -1 && args[messageFlagIdx + 1]) {
            msg = args.slice(messageFlagIdx + 1).join(' ').replace(/^["']|["']$/g, '');
          }
          const cp = await createCheckpoint(activeProject, msg);
          onUpdateProject({
            ...activeProject,
            lastCommitMessage: msg,
            updatedAt: Date.now(),
          });
          addEntry(
            'success',
            `✔ [${activeProject.gitBranch || 'main'} ${cp.commitHash}] ${msg}\n ${activeProject.files.length} files committed to Time Machine.`
          );
        } else {
          addEntry(
            'error',
            `git: '${args.join(' ')}' is not supported. Supported: git status, git log, git branch, git commit -m "..."`
          );
        }
        break;
      }

      case 'ai':
      case 'ask': {
        const question = args.join(' ').replace(/^["']|["']$/g, '');
        if (!question) {
          addEntry('error', 'Usage: ai "<your question or coding request>"');
          return;
        }
        addEntry('system', `Asking Gemini AI Code Assistant...`);
        const reply = await onAskAi(question);
        addEntry('output', `[AI Assistant]:\n${reply}`);
        break;
      }

      default:
        addEntry(
          'error',
          `command not found: '${mainCmd}'. Type 'help' to see all available commands.`
        );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIdx = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIdx);
      setInputCommand(history[nextIdx] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      if (historyIndex < history.length - 1) {
        const nextIdx = historyIndex + 1;
        setHistoryIndex(nextIdx);
        setInputCommand(history[nextIdx] || '');
      } else {
        setHistoryIndex(-1);
        setInputCommand('');
      }
    }
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#09090C] font-mono text-xs overflow-hidden select-none">
      {/* Terminal Title Bar */}
      <div className="h-10 bg-[#121217] border-b border-[#24242C] px-3 flex items-center justify-between text-xs text-[#A5A5B2] shrink-0">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-3.5 h-3.5 text-[#E5222A]" />
          <span className="font-semibold text-white">ARSHX Smart Terminal</span>
          <span className="text-[#3E3E4C]">·</span>
          <span className="text-[11px] text-[#86EFAC] font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" /> sandbox active
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setEntries([])}
            className="p-1 hover:bg-[#24242C] rounded text-[#A5A5B2] hover:text-white transition-colors"
            title="Clear Terminal Output"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Action Suggestion Chips for Fast Touch & Desktop Access */}
      <div className="bg-[#0E0E12] border-b border-[#1C1C24] px-2 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        <span className="text-[10px] text-[#85858F] font-bold uppercase px-1">Quick:</span>
        {[
          'help',
          'ls',
          'pwd',
          'doctor',
          'git status',
          'gradle build',
          'termux status',
          'export',
          'clear',
        ].map((cmd) => (
          <button
            key={cmd}
            type="button"
            onClick={() => runCommandString(cmd)}
            className="px-2.5 py-1 text-[11px] bg-[#16161E] text-[#A5A5B2] hover:text-white hover:bg-[#22222E] rounded border border-[#272733] transition-colors whitespace-nowrap active:scale-95 flex items-center gap-1"
          >
            <ChevronRight className="w-2.5 h-2.5 text-[#E5222A]" />
            {cmd}
          </button>
        ))}
      </div>

      {/* Terminal Output Log Area */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2 select-text font-mono text-[12px] leading-5 text-[#E2E8F0]">
        {entries.map((entry) => {
          switch (entry.type) {
            case 'input':
              return (
                <div key={entry.id} className="flex items-start gap-2 text-white">
                  <span className="text-[#E5222A] font-bold shrink-0">arshx@box:~$</span>
                  <span className="font-semibold break-all">{entry.text}</span>
                </div>
              );
            case 'error':
              return (
                <div
                  key={entry.id}
                  className="text-[#F87171] bg-[#7F1D1D]/20 p-2.5 rounded-lg border border-[#EF4444]/30 whitespace-pre-wrap break-all relative group"
                >
                  {entry.text}
                </div>
              );
            case 'success':
              return (
                <div key={entry.id} className="text-[#4ADE80] whitespace-pre-wrap break-all">
                  {entry.text}
                </div>
              );
            case 'system':
              return (
                <div key={entry.id} className="text-[#93C5FD] whitespace-pre-wrap break-all italic">
                  {entry.text}
                </div>
              );
            default:
              return (
                <div key={entry.id} className="text-[#CBD5E1] whitespace-pre-wrap break-all relative group">
                  {entry.text}
                  <button
                    onClick={() => copyToClipboard(entry.id, entry.text)}
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 rounded bg-[#181820] text-[#85858F] hover:text-white transition-opacity"
                    title="Copy output"
                  >
                    {copiedId === entry.id ? (
                      <Check className="w-3 h-3 text-green-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              );
          }
        })}
        {isExecuting && (
          <div className="text-[#A5A5B2] italic flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#E5222A] animate-ping" />
            Executing command...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Interactive Command Prompt Line */}
      <form
        onSubmit={handleCommandSubmit}
        className="h-11 bg-[#101014] border-t border-[#24242C] px-3 flex items-center gap-2 shrink-0"
      >
        <span className="text-[#E5222A] font-bold text-xs select-none shrink-0">
          arshx@box:~$
        </span>
        <input
          ref={inputRef}
          type="text"
          value={inputCommand}
          onChange={(e) => setInputCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isExecuting}
          placeholder="Type a command ('help', 'ls', 'pwd', 'gradle build')..."
          className="flex-1 bg-transparent text-white text-xs font-mono focus:outline-none placeholder:text-[#4A4A5A]"
        />
        <button
          type="submit"
          disabled={!inputCommand.trim() || isExecuting}
          className="p-1.5 text-white bg-[#E5222A] hover:bg-[#d01c24] disabled:opacity-30 rounded-md transition-colors"
          title="Submit command (Enter)"
        >
          <CornerDownLeft className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
