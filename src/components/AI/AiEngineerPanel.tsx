import React, { useState, useRef, useEffect } from 'react';
import { aiFetch } from '../../utils/gemini';
import { 
  Sparkles, 
  Send, 
  X, 
  Copy, 
  Check, 
  Wrench, 
  BookOpen, 
  Zap, 
  Code2, 
  Terminal,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { Project, ProjectFile, AiChatMessage } from '../../types';

interface AiEngineerPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeProject: Project;
  activeFile?: ProjectFile;
  onApplyCodeToEditor: (code: string) => void;
  aiAvailable: boolean;
}

export const AiEngineerPanel: React.FC<AiEngineerPanelProps> = ({
  isOpen,
  onClose,
  activeProject,
  activeFile,
  onApplyCodeToEditor,
  aiAvailable,
}) => {
  const [messages, setMessages] = useState<AiChatMessage[]>([
    {
      id: 'msg-init',
      role: 'assistant',
      content: `Hello! I am your ARSHX AI Code Engineer.
I am tuned for native Android Jetpack Compose, Kotlin, Web development, and Termux tooling.
How can I elevate your project today?`,
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const userMsg: AiChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await aiFetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          fileContext: activeFile
            ? {
                filename: activeFile.name,
                language: activeFile.language,
                content: activeFile.content,
              }
            : undefined,
          history: messages.slice(-6).map((m) => ({
            role: m.role,
            text: m.content,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to communicate with AI server.');
      }

      // Extract code block if present
      const replyText = data.reply || '';
      let codeSnippet: AiChatMessage['codeSnippet'] = undefined;
      const codeMatch = replyText.match(/```([a-zA-Z0-9_-]+)?\n([\s\S]*?)```/);
      if (codeMatch) {
        codeSnippet = {
          language: codeMatch[1] || 'kotlin',
          code: codeMatch[2].trim(),
          filename: activeFile?.name,
        };
      }

      const assistantMsg: AiChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: replyText,
        timestamp: Date.now(),
        codeSnippet,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-err`,
          role: 'assistant',
          content: `AI Connection Notice: ${err?.message || 'Add your Gemini key in Settings > AI.'}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = async (action: 'fix' | 'explain' | 'optimize' | 'compose' | 'termux') => {
    if (!activeFile && (action === 'fix' || action === 'explain' || action === 'optimize')) {
      alert('Please open a file in the editor first to perform this action.');
      return;
    }

    let prompt = '';
    switch (action) {
      case 'fix':
        prompt = `Analyze ${activeFile?.name} for bugs, unbalanced brackets, missing imports or runtime crashes, and provide the fixed code.`;
        break;
      case 'explain':
        prompt = `Explain the architecture and logic of ${activeFile?.name} step-by-step.`;
        break;
      case 'optimize':
        prompt = `Refactor ${activeFile?.name} for optimal performance, cleaner structure, and Android SDK 35 compliance.`;
        break;
      case 'compose':
        prompt = `Generate a modern Jetpack Compose Composable component with ARSHX Red (#E5222A) accent, smooth animations, and Material 3 design.`;
        break;
      case 'termux':
        prompt = `Provide the exact Termux commands to compile this project with Android SDK 35 and Gradle 8.11.1 on an aarch64 Android device.`;
        break;
    }

    await handleSendMessage(prompt);
  };

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <aside className="w-80 sm:w-96 bg-[#16161B] border-l border-[#24242C] flex flex-col h-full z-20 shrink-0 select-none shadow-2xl">
      {/* Header */}
      <div className="h-14 bg-[#141418] border-b border-[#24242C] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#E5222A] flex items-center justify-center text-white">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide">ARSHX AI ENGINEER</h3>
            <p className="text-[10px] text-[#A5A5B2]">
              Powered by Gemini (your key)
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-[#24242C] rounded-lg text-[#A5A5B2] hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Action Bar */}
      <div className="p-2.5 bg-[#121216] border-b border-[#22222A] flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        <button
          onClick={() => handleQuickAction('fix')}
          className="px-2.5 py-1 text-[11px] font-medium bg-[#1F1F27] hover:bg-[#2A2A35] text-white rounded-md border border-[#2C2C38] flex items-center gap-1 shrink-0 transition-colors"
        >
          <Wrench className="w-3 h-3 text-[#E5222A]" />
          <span>Fix Code</span>
        </button>
        <button
          onClick={() => handleQuickAction('explain')}
          className="px-2.5 py-1 text-[11px] font-medium bg-[#1F1F27] hover:bg-[#2A2A35] text-white rounded-md border border-[#2C2C38] flex items-center gap-1 shrink-0 transition-colors"
        >
          <BookOpen className="w-3 h-3 text-[#67E8F9]" />
          <span>Explain</span>
        </button>
        <button
          onClick={() => handleQuickAction('optimize')}
          className="px-2.5 py-1 text-[11px] font-medium bg-[#1F1F27] hover:bg-[#2A2A35] text-white rounded-md border border-[#2C2C38] flex items-center gap-1 shrink-0 transition-colors"
        >
          <Zap className="w-3 h-3 text-[#FBBF24]" />
          <span>Optimize</span>
        </button>
        <button
          onClick={() => handleQuickAction('compose')}
          className="px-2.5 py-1 text-[11px] font-medium bg-[#1F1F27] hover:bg-[#2A2A35] text-white rounded-md border border-[#2C2C38] flex items-center gap-1 shrink-0 transition-colors"
        >
          <Code2 className="w-3 h-3 text-[#FF5E65]" />
          <span>Compose UI</span>
        </button>
        <button
          onClick={() => handleQuickAction('termux')}
          className="px-2.5 py-1 text-[11px] font-medium bg-[#1F1F27] hover:bg-[#2A2A35] text-white rounded-md border border-[#2C2C38] flex items-center gap-1 shrink-0 transition-colors"
        >
          <Terminal className="w-3 h-3 text-[#86EFAC]" />
          <span>Termux CLI</span>
        </button>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs select-text">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.role === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[90%] rounded-2xl p-3 leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#E5222A] text-white rounded-br-xs'
                  : 'bg-[#1F1F27] text-[#E2E8F0] border border-[#2C2C38] rounded-bl-xs'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>

              {/* Code snippet action box */}
              {msg.codeSnippet && (
                <div className="mt-2.5 pt-2 border-t border-[#343442] flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono text-[#A5A5B2]">
                    {msg.codeSnippet.language} snippet
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleCopyCode(msg.codeSnippet!.code, msg.id)}
                      className="px-2 py-1 bg-[#141418] hover:bg-[#2A2A35] rounded text-[10px] text-white font-medium flex items-center gap-1 transition-colors"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-green-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => onApplyCodeToEditor(msg.codeSnippet!.code)}
                      className="px-2 py-1 bg-[#E5222A] hover:bg-[#d01c24] rounded text-[10px] text-white font-semibold flex items-center gap-1 transition-colors"
                      title="Replace active editor content with this code"
                    >
                      <span>Apply to File</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-[#A5A5B2] text-xs py-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#E5222A]" />
            <span>ARSHX Engineer thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-3 bg-[#141418] border-t border-[#24242C] flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
          placeholder="Ask to write code, fix bugs, or explain..."
          className="flex-1 bg-[#1A1A20] border border-[#2E2E38] rounded-lg px-3 py-2 text-xs text-white placeholder:text-[#555566] focus:outline-none focus:border-[#E5222A]"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="p-2 bg-[#E5222A] hover:bg-[#d01c24] disabled:opacity-30 text-white rounded-lg transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </aside>
  );
};
