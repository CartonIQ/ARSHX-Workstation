import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Copy, 
  Check, 
  Search, 
  RotateCcw, 
  RotateCw, 
  Sparkles, 
  AlignLeft, 
  X, 
  Play,
  FileCode,
  CheckCircle2,
  Save,
  Columns,
  Eye,
  Code2, PanelLeft } from 'lucide-react';
import { ProjectFile, Project } from '../../types';
import { CodeKeysBar } from './CodeKeysBar';
import { getLanguageLabel } from '../../utils/syntax';
import { LivePreviewPane } from '../Preview/LivePreviewPane';

interface CodeEditorProps {
  activeFile: ProjectFile | undefined;
  activeProject: Project;
  onUpdateContent: (content: string) => void;
  onSelectFile: (fileId: string) => void;
  onOpenAiWithAction: (action: string, filename: string, content: string) => void;
  onRunPreview?: () => void;
  onToggleFiles?: () => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  activeFile,
  activeProject,
  onUpdateContent,
  onSelectFile,
  onOpenAiWithAction,
  onRunPreview,
  onToggleFiles,
}) => {
  const [copied, setCopied] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [dirtyMap, setDirtyMap] = useState<Record<string, boolean>>({});
  const [justSaved, setJustSaved] = useState(false);
  const [viewMode, setViewMode] = useState<'code' | 'split' | 'preview'>(() => {
    return typeof window !== 'undefined' && window.innerWidth >= 1024 ? 'split' : 'code';
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // Initialize history when file changes
  useEffect(() => {
    if (activeFile) {
      setHistory([activeFile.content]);
      setHistoryIdx(0);
    }
  }, [activeFile?.id]);

  const updateCursorPosition = useCallback(() => {
    if (!textareaRef.current || !activeFile) return;
    const pos = textareaRef.current.selectionStart;
    const textBefore = activeFile.content.substring(0, pos);
    const line = textBefore.split('\n').length;
    const lastLineStart = textBefore.lastIndexOf('\n');
    const col = pos - (lastLineStart === -1 ? 0 : lastLineStart + 1) + 1;
    setCursorPos({ line, col });
  }, [activeFile]);

  const handleManualSave = useCallback(() => {
    if (!activeFile) return;
    setDirtyMap(prev => ({ ...prev, [activeFile.id]: false }));
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  }, [activeFile]);

  // Keyboard shortcut listener (Ctrl+S, Ctrl+F, Ctrl+Z, Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;
      if (isCmdOrCtrl && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleManualSave();
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setShowSearch(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleManualSave]);

  if (!activeFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-[#A5A5B2] p-8">
        <FileCode className="w-12 h-12 text-[#E5222A] mb-3 opacity-60" />
        <p className="font-semibold text-base text-[#F7F7FA]">No file selected</p>
        <p className="text-xs text-[#A5A5B2] mt-1">Select a file from the project explorer to start coding.</p>
      </div>
    );
  }

  const lines = activeFile.content.split('\n');

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onUpdateContent(val);
    setDirtyMap(prev => ({ ...prev, [activeFile.id]: true }));
    
    // Add to local undo history
    if (val !== history[historyIdx]) {
      const nextHistory = history.slice(0, historyIdx + 1);
      nextHistory.push(val);
      if (nextHistory.length > 50) nextHistory.shift();
      setHistory(nextHistory);
      setHistoryIdx(nextHistory.length - 1);
    }
    updateCursorPosition();
  };

  const handleKeyDownTextarea = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const spaces = '    '; // 4 spaces indent
      const current = activeFile.content;
      const updated = current.substring(0, start) + spaces + current.substring(end);
      onUpdateContent(updated);
      setDirtyMap(prev => ({ ...prev, [activeFile.id]: true }));

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + spaces.length;
          textareaRef.current.selectionEnd = start + spaces.length;
          updateCursorPosition();
        }
      }, 0);
    }
  };

  const handleInsertSymbol = (symbol: string) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const current = activeFile.content;
    const updated = current.substring(0, start) + symbol + current.substring(end);
    onUpdateContent(updated);
    setDirtyMap(prev => ({ ...prev, [activeFile.id]: true }));

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + symbol.length, start + symbol.length);
        updateCursorPosition();
      }
    }, 10);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUndo = () => {
    if (historyIdx > 0) {
      const target = history[historyIdx - 1];
      setHistoryIdx(historyIdx - 1);
      onUpdateContent(target);
      setDirtyMap(prev => ({ ...prev, [activeFile.id]: true }));
    }
  };

  const handleRedo = () => {
    if (historyIdx < history.length - 1) {
      const target = history[historyIdx + 1];
      setHistoryIdx(historyIdx + 1);
      onUpdateContent(target);
      setDirtyMap(prev => ({ ...prev, [activeFile.id]: true }));
    }
  };

  const handleSearchReplace = (replaceAll: boolean = false) => {
    if (!searchTerm) return;
    if (replaceAll) {
      const replaced = activeFile.content.split(searchTerm).join(replaceTerm);
      onUpdateContent(replaced);
      setDirtyMap(prev => ({ ...prev, [activeFile.id]: true }));
    } else {
      const idx = activeFile.content.indexOf(searchTerm);
      if (idx !== -1) {
        const replaced = activeFile.content.substring(0, idx) + replaceTerm + activeFile.content.substring(idx + searchTerm.length);
        onUpdateContent(replaced);
        setDirtyMap(prev => ({ ...prev, [activeFile.id]: true }));
      }
    }
  };

  const handleFormatCode = () => {
    try {
      if (activeFile.language === 'json') {
        const parsed = JSON.parse(activeFile.content);
        onUpdateContent(JSON.stringify(parsed, null, 2));
      } else {
        const cleaned = activeFile.content
          .split('\n')
          .map(l => l.trimEnd())
          .join('\n');
        onUpdateContent(cleaned);
      }
      setDirtyMap(prev => ({ ...prev, [activeFile.id]: true }));
    } catch {}
  };

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const isCurrentDirty = !!dirtyMap[activeFile.id];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0E0E12] overflow-hidden select-none">
      {/* File Tabs Bar */}
      <div className="h-10 bg-[#141418] border-b border-[#24242C] px-2 flex items-center gap-1 overflow-x-auto shrink-0 no-scrollbar">
        {activeProject.files.map((file) => {
          const isCurrent = file.id === activeFile.id;
          const isDirty = !!dirtyMap[file.id];
          return (
            <div
              key={file.id}
              onClick={() => onSelectFile(file.id)}
              className={`h-8 px-3 rounded-t-md cursor-pointer flex items-center gap-2 text-xs font-mono transition-colors shrink-0 ${
                isCurrent
                  ? 'bg-[#0E0E12] text-white border-t-2 border-[#E5222A] font-semibold'
                  : 'text-[#A5A5B2] hover:text-[#F7F7FA] hover:bg-[#1A1A20]'
              }`}
            >
              <span>{file.name}</span>
              {isDirty && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#E5222A] shrink-0" title="Unsaved changes" />
              )}
            </div>
          );
        })}
      </div>

      {/* Editor Action Header */}
      <div className="h-10 bg-[#16161C] border-b border-[#24242C] px-3 flex items-center justify-between text-xs text-[#A5A5B2] shrink-0 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
          {onToggleFiles && (
            <button
              onClick={onToggleFiles}
              aria-label="Open files"
              className="lg:hidden shrink-0 -ml-1 p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-md text-[#F7F7FA] bg-white/10 hover:bg-white/15"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          )}
          <span className="font-mono text-white font-medium flex items-center gap-1.5 truncate">
            {activeFile.name}
            {isCurrentDirty && (
              <span className="text-[10px] text-[#FF5E65] font-sans font-bold">●</span>
            )}
          </span>
          <span className="text-[#3E3E4C] hidden sm:inline">·</span>
          <span className="text-[11px] text-[#FF5E65] font-semibold hidden xs:inline">
            {getLanguageLabel(activeFile.language)}
          </span>
          <span className="text-[#3E3E4C] hidden md:inline">·</span>
          <span className="font-mono text-[11px] text-[#85858F] tabular-nums hidden md:inline">
            {lines.length} lines
          </span>
        </div>

        {/* Center View Mode Switcher (Code / Split / Preview) */}
        <div className="flex items-center gap-0.5 bg-[#101014] p-0.5 rounded-lg border border-[#272733] shrink-0">
          <button
            onClick={() => setViewMode('code')}
            className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
              viewMode === 'code' ? 'bg-[#252530] text-white shadow-xs' : 'text-[#85858F] hover:text-white'
            }`}
            title="Code View Only"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Code</span>
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`max-lg:hidden px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
              viewMode === 'split' ? 'bg-[#252530] text-white shadow-xs' : 'text-[#85858F] hover:text-white'
            }`}
            title="Split View (Code + Live Preview)"
          >
            <Columns className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Split</span>
          </button>
          <button
            onClick={() => setViewMode('preview')}
            className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
              viewMode === 'preview' ? 'bg-[#252530] text-white shadow-xs' : 'text-[#85858F] hover:text-white'
            }`}
            title="Live Preview Only"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Preview</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Quick Preview Toggle / Run button */}
          <button
            onClick={() => {
              const phone = typeof window !== 'undefined' && window.innerWidth < 1024;
              if (viewMode === 'code') {
                setViewMode(phone ? 'preview' : 'split');
              } else if (viewMode === 'split') {
                setViewMode('preview');
              } else {
                setViewMode('code');
              }
            }}
            className="px-2.5 py-1 text-xs font-semibold text-white bg-[#E5222A] hover:bg-[#d01c24] rounded-md transition-colors flex items-center gap-1.5 shadow-xs"
            title="Toggle Live Preview"
          >
            <Play className="w-3 h-3 fill-current" />
            <span className="hidden sm:inline">
              {viewMode === 'code' ? 'Run Preview' : viewMode === 'split' ? 'Full Preview' : 'Show Code'}
            </span>
          </button>

          {/* Save status button */}
          <button
            onClick={handleManualSave}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${
              justSaved
                ? 'bg-[#22C55E]/20 text-[#86EFAC] border border-[#22C55E]/40'
                : isCurrentDirty
                ? 'bg-[#E5222A] text-white hover:bg-[#d01c24]'
                : 'bg-[#1D1D26] text-[#A5A5B2] hover:text-white border border-[#2B2B38]'
            }`}
            title="Save File (Ctrl+S / Cmd+S)"
          >
            {justSaved ? (
              <>
                <Check className="w-3 h-3 text-[#86EFAC]" />
                <span className="hidden md:inline">Saved</span>
              </>
            ) : (
              <>
                <Save className="w-3 h-3" />
                <span className="hidden md:inline">{isCurrentDirty ? 'Save' : 'Saved'}</span>
              </>
            )}
          </button>

          {/* AI Fix / Assist */}
          <button
            onClick={() => onOpenAiWithAction('fix', activeFile.name, activeFile.content)}
            className="px-2 py-1 text-xs font-medium text-white bg-[#E5222A]/20 hover:bg-[#E5222A]/30 border border-[#E5222A]/50 rounded-md transition-colors flex items-center gap-1 hidden sm:flex"
            title="Inspect and Fix Bugs with AI"
          >
            <Sparkles className="w-3 h-3 text-[#E5222A]" />
            <span className="hidden md:inline">AI Fix</span>
          </button>

          {/* Search toggle */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-1.5 rounded-md hover:bg-[#24242C] transition-colors ${showSearch ? 'text-[#E5222A] bg-[#24242C]' : 'text-[#A5A5B2] hover:text-white'}`}
            title="Find & Replace (Ctrl+F)"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          {/* Undo */}
          <button
            onClick={handleUndo}
            disabled={historyIdx <= 0}
            className="p-1.5 rounded-md hover:bg-[#24242C] disabled:opacity-30 text-[#A5A5B2] hover:text-white transition-colors hidden xs:block"
            title="Undo"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Redo */}
          <button
            onClick={handleRedo}
            disabled={historyIdx >= history.length - 1}
            className="p-1.5 rounded-md hover:bg-[#24242C] disabled:opacity-30 text-[#A5A5B2] hover:text-white transition-colors hidden xs:block"
            title="Redo"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          {/* Format */}
          <button
            onClick={handleFormatCode}
            className="p-1.5 rounded-md hover:bg-[#24242C] text-[#A5A5B2] hover:text-white transition-colors hidden md:block"
            title="Format Code"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>

          {/* Copy code */}
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md hover:bg-[#24242C] text-[#A5A5B2] hover:text-white transition-colors"
            title="Copy Code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Editor Main Workspace Area (Code / Split / Preview) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Code Workspace (visible in 'code' or 'split') */}
        {viewMode !== 'preview' && (
          <div className={`flex flex-col overflow-hidden ${
            viewMode === 'split' ? 'w-full lg:w-1/2 h-1/2 lg:h-full border-b lg:border-b-0 lg:border-r border-[#24242C]' : 'w-full h-full'
          }`}>
            {/* Find & Replace Bar */}
            {showSearch && (
              <div className="bg-[#181820] border-b border-[#2C2C38] px-3 py-2 flex flex-wrap items-center gap-2 text-xs shrink-0">
                <input
                  type="text"
                  placeholder="Find text..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-[#111114] border border-[#34343E] rounded px-2 py-1 text-white text-xs font-mono focus:outline-none focus:border-[#E5222A]"
                />
                <input
                  type="text"
                  placeholder="Replace with..."
                  value={replaceTerm}
                  onChange={(e) => setReplaceTerm(e.target.value)}
                  className="bg-[#111114] border border-[#34343E] rounded px-2 py-1 text-white text-xs font-mono focus:outline-none focus:border-[#E5222A]"
                />
                <button
                  onClick={() => handleSearchReplace(false)}
                  className="px-2 py-1 bg-[#24242C] hover:bg-[#2E2E38] text-white rounded font-medium"
                >
                  Replace Next
                </button>
                <button
                  onClick={() => handleSearchReplace(true)}
                  className="px-2 py-1 bg-[#24242C] hover:bg-[#2E2E38] text-white rounded font-medium"
                >
                  Replace All
                </button>
                <button
                  onClick={() => setShowSearch(false)}
                  className="p-1 text-[#A5A5B2] hover:text-white ml-auto"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Line Numbers Column + Textarea */}
            <div className="flex-1 flex overflow-hidden relative font-mono text-[13px] leading-[22px]">
              <div
                ref={lineNumbersRef}
                className="w-12 bg-[#0C0C10] border-r border-[#1E1E26] py-3 text-right pr-3 text-[#4A4A5A] select-none overflow-hidden shrink-0"
              >
                {lines.map((_, idx) => {
                  const isCurrentLine = idx + 1 === cursorPos.line;
                  return (
                    <div
                      key={idx}
                      className={`tabular-nums ${isCurrentLine ? 'text-[#FF5E65] font-semibold' : ''}`}
                    >
                      {idx + 1}
                    </div>
                  );
                })}
              </div>

              {/* Textarea Code Buffer */}
              <div className="flex-1 relative h-full overflow-hidden">
                <textarea
                  ref={textareaRef}
                  value={activeFile.content}
                  onChange={handleTextChange}
                  onKeyDown={handleKeyDownTextarea}
                  onKeyUp={updateCursorPosition}
                  onClick={updateCursorPosition}
                  onScroll={handleScroll}
                  spellCheck={false}
                  className="w-full h-full bg-transparent text-[#F7F7FA] p-3 resize-none focus:outline-none font-mono text-[13px] leading-[22px] overflow-auto whitespace-pre selection:bg-[#E5222A]/30"
                  placeholder="Type your code here..."
                />
              </div>
            </div>

            {/* CodeKeys Toolbar */}
            <CodeKeysBar
              language={activeFile.language}
              onInsert={handleInsertSymbol}
            />
          </div>
        )}

        {/* Live Preview Pane (visible in 'split' or 'preview') */}
        {viewMode !== 'code' && (
          <div className={`${
            viewMode === 'split' ? 'w-full lg:w-1/2 h-1/2 lg:h-full' : 'w-full h-full'
          } flex flex-col overflow-hidden`}>
            <LivePreviewPane
              activeProject={activeProject}
              activeFile={activeFile}
              compact={viewMode === 'split'}
              onClosePreview={() => setViewMode('code')}
              onOpenFullLab={onRunPreview}
            />
          </div>
        )}
      </div>

      {/* Footer Status Bar */}
      <div className="h-6 bg-[#111114] border-t border-[#1F1F28] px-3 flex items-center justify-between text-[11px] text-[#A5A5B2] select-none font-mono shrink-0">
        <div className="flex items-center gap-3">
          <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
          <span>·</span>
          <span>UTF-8</span>
          <span>·</span>
          <span>LF</span>
          <span className="hidden sm:inline">·</span>
          <span className="hidden sm:inline text-[#E5222A]">
            {viewMode === 'split' ? 'Split View Active' : viewMode === 'preview' ? 'Preview Active' : 'Editor View'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[#86EFAC] flex items-center gap-1 font-sans">
            <CheckCircle2 className="w-3 h-3 text-[#22C55E]" /> Auto-saved
          </span>
        </div>
      </div>
    </div>
  );
};
