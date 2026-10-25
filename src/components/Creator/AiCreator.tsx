import React, { useState } from 'react';
import { aiFetch } from '../../utils/gemini';
import { 
  Sparkles, 
  Layers, 
  FolderPlus, 
  FileCode, 
  Check, 
  ArrowRight, 
  RotateCw, 
  Code2, 
  Wrench, 
  ListTree,
  Lightbulb,
  Eye,
  Cpu,
  Copy
} from 'lucide-react';
import { Project, ProjectFile } from '../../types';
import { createNewFile } from '../../utils/fileSystem';

interface AiCreatorProps {
  activeProject: Project;
  onCreateNewProjectWithFiles: (name: string, description: string, files: ProjectFile[]) => void;
  onAddFilesToActiveProject: (files: ProjectFile[]) => void;
  onAskAi: (prompt: string) => Promise<string>;
}

interface PlanStep {
  title: string;
  detail: string;
  files: string[];
}

export const AiCreator: React.FC<AiCreatorProps> = ({
  activeProject,
  onCreateNewProjectWithFiles,
  onAddFilesToActiveProject,
  onAskAi,
}) => {
  const [projectPrompt, setProjectPrompt] = useState('Create a local Markdown Notes & Journal app with categories, tag search, dark mode, and export.');
  const [targetType, setTargetType] = useState<'android' | 'web'>('android');
  const [mode, setMode] = useState<'new_project' | 'add_feature'>('new_project');
  const [isPlanning, setIsPlanning] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [generationSource, setGenerationSource] = useState<'gemini' | 'local' | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<PlanStep[] | null>(null);
  const [previewFiles, setPreviewFiles] = useState<ProjectFile[]>([]);
  const [activePreviewFileId, setActivePreviewFileId] = useState<string | null>(null);
  const [appliedSuccess, setAppliedSuccess] = useState(false);
  const [copiedFile, setCopiedFile] = useState(false);

  const sampleIdeas = [
    { title: 'Markdown Notes App', prompt: 'Create a local Markdown Notes & Journal app with categories, tag search, dark mode, and export.' },
    { title: 'Crypto & Stock Pulse', prompt: 'Create a financial asset tracker with real-time watchlist, candlestick stats, and price alerts.' },
    { title: 'Habit & Routine Streak', prompt: 'Create a daily routine streak tracker with interactive check-ins, heatmap calendar, and notification badges.' },
    { title: 'Audio Voice Memo Studio', prompt: 'Create an audio recording app with visual sound wave pulse, tags, playback speed control, and storage manager.' },
  ];

  const handlePlanAndGenerate = async () => {
    if (!projectPrompt.trim()) return;
    setIsPlanning(true);
    setAiError(null);

    try {
      const response = await aiFetch('/api/ai/creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: projectPrompt.trim(),
          platform: targetType,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || `HTTP error ${response.status}`);
      }
      if (data.project) {
        const proj = data.project;

        // Map plan steps
        if (Array.isArray(proj.architecturePlan) && proj.architecturePlan.length > 0) {
          setGeneratedPlan(proj.architecturePlan.map((s: any, idx: number) => ({
            title: s.step || `Step ${idx + 1}`,
            detail: s.detail || '',
            files: Array.isArray(s.files) ? s.files : [],
          })));
        } else {
          setGeneratedPlan([
            { title: '1. Architecture & Domain Models', detail: 'Data contracts and state representations', files: ['Model.kt'] },
            { title: '2. User Interface Hierarchy', detail: 'Jetpack Compose screens and layouts', files: ['MainActivity.kt'] },
          ]);
        }

        // Map files
        if (Array.isArray(proj.files) && proj.files.length > 0) {
          const files: ProjectFile[] = proj.files.map((f: any, idx: number) => ({
            id: `f-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
            name: f.name || `file_${idx + 1}.txt`,
            path: f.path || f.name || `file_${idx + 1}.txt`,
            language: f.language || (f.name?.endsWith('.kt') ? 'kotlin' : f.name?.endsWith('.html') ? 'html' : 'typescript'),
            content: f.content || '',
            updatedAt: Date.now(),
            isEntry: idx === 0 || f.name === 'MainActivity.kt' || f.name === 'index.html',
          }));
          setPreviewFiles(files);
          setActivePreviewFileId(files[0].id);
        }

        setGenerationSource(data.isFallback ? 'local' : 'gemini');
      }
    } catch (err: any) {
      setAiError(err?.message || 'AI generation failed. Please try again.');
        } finally {
      setIsPlanning(false);
    }
  };

  const handleApplyToWorkspace = () => {
    if (previewFiles.length === 0) return;

    if (mode === 'new_project') {
      const projName = projectPrompt.split(' ').slice(0, 3).join(' ') || 'AI Generated Project';
      onCreateNewProjectWithFiles(projName, projectPrompt, previewFiles);
    } else {
      onAddFilesToActiveProject(previewFiles);
    }

    setAppliedSuccess(true);
    setTimeout(() => {
      setAppliedSuccess(false);
    }, 2500);
  };

  const activeFile = previewFiles.find(f => f.id === activePreviewFileId) || previewFiles[0];

  const handleCopyActiveFileContent = () => {
    if (!activeFile) return;
    navigator.clipboard.writeText(activeFile.content);
    setCopiedFile(true);
    setTimeout(() => setCopiedFile(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0E0E12] overflow-y-auto p-4 md:p-8 select-none">
      <div className="max-w-5xl w-full mx-auto space-y-6 pb-12">

        {aiError && (
          <div role="alert" className="glass-card border-[#E5222A]/40 px-4 py-3 text-xs text-[#FF5E65] flex items-start gap-2">
            <span className="font-bold shrink-0">AI error</span>
            <span className="text-[#F7F7FA]/90">{aiError}</span>
          </div>
        )}
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-[#E5222A]" />
              <h2 className="text-xl font-bold text-white tracking-tight">ARSHX AI Creator</h2>
              {generationSource && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold flex items-center gap-1 ${
                  generationSource === 'gemini' 
                    ? 'bg-[#22C55E]/15 text-[#86EFAC] border border-[#22C55E]/30'
                    : 'bg-[#FBBF24]/15 text-[#FBBF24] border border-[#FBBF24]/30'
                }`}>
                  <Cpu className="w-2.5 h-2.5" />
                  Gemini
                </span>
              )}
            </div>
            <p className="text-xs text-[#A5A5B2]">
              Autonomous project architect. Synthesizes full multi-file projects, models, and features from high-level briefs.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-[#141418] p-1 rounded-lg border border-[#24242C]">
            <button
              onClick={() => setMode('new_project')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                mode === 'new_project' ? 'bg-[#24242C] text-white shadow-xs' : 'text-[#A5A5B2] hover:text-white'
              }`}
            >
              New Project
            </button>
            <button
              onClick={() => setMode('add_feature')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                mode === 'add_feature' ? 'bg-[#24242C] text-white shadow-xs' : 'text-[#A5A5B2] hover:text-white'
              }`}
            >
              Add Feature to {activeProject.name}
            </button>
          </div>
        </div>

        {/* Input Card */}
        <div className="bg-[#16161C] border border-[#24242C] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-[#FBBF24]" />
              <span>Project Specification Brief</span>
            </span>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#A5A5B2]">Target Stack:</span>
              <button
                onClick={() => setTargetType('android')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors ${
                  targetType === 'android'
                    ? 'bg-[#E5222A]/15 text-[#FF5E65] border-[#E5222A]/40'
                    : 'bg-[#1D1D26] text-[#A5A5B2] border-[#2C2C38]'
                }`}
              >
                Kotlin Compose (SDK 35)
              </button>
              <button
                onClick={() => setTargetType('web')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors ${
                  targetType === 'web'
                    ? 'bg-[#E5222A]/15 text-[#FF5E65] border-[#E5222A]/40'
                    : 'bg-[#1D1D26] text-[#A5A5B2] border-[#2C2C38]'
                }`}
              >
                Fullstack Web App
              </button>
            </div>
          </div>

          <textarea
            value={projectPrompt}
            onChange={(e) => setProjectPrompt(e.target.value)}
            rows={4}
            placeholder="Describe what you want to build in detail..."
            className="w-full bg-[#111114] border border-[#2B2B38] rounded-xl p-3.5 text-xs text-white placeholder:text-[#555566] focus:outline-none focus:border-[#E5222A] leading-relaxed"
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {sampleIdeas.map(idea => (
                <button
                  key={idea.title}
                  onClick={() => setProjectPrompt(idea.prompt)}
                  className="px-2.5 py-1 bg-[#1F1F28] hover:bg-[#282834] rounded-lg text-[11px] text-[#A5A5B2] hover:text-white border border-[#2B2B38] transition-colors"
                >
                  {idea.title}
                </button>
              ))}
            </div>

            <button
              onClick={handlePlanAndGenerate}
              disabled={isPlanning || !projectPrompt.trim()}
              className="px-5 py-2.5 bg-[#E5222A] hover:bg-[#d01c24] disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#E5222A]/25 shrink-0"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isPlanning ? 'animate-spin' : ''}`} />
              <span>{isPlanning ? 'Synthesizing Architecture...' : 'Synthesize Project with AI'}</span>
            </button>
          </div>
        </div>

        {/* Generated Architecture Plan & Review */}
        {generatedPlan && (
          <div className="bg-[#16161C] border border-[#262633] rounded-2xl p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListTree className="w-4 h-4 text-[#86EFAC]" />
                <h3 className="text-sm font-bold text-white">Synthesized Architecture & Multi-File Artifacts</h3>
              </div>
              <span className="text-[11px] font-mono text-[#86EFAC] bg-[#22C55E]/10 border border-[#22C55E]/20 px-2.5 py-0.5 rounded-full font-semibold">
                {previewFiles.length} files synthesized
              </span>
            </div>

            {/* Architecture Steps */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {generatedPlan.map((step, idx) => (
                <div key={idx} className="bg-[#111114] border border-[#23232F] rounded-xl p-3.5 space-y-1.5">
                  <h4 className="text-xs font-bold text-white">{step.title}</h4>
                  <p className="text-xs text-[#A5A5B2]">{step.detail}</p>
                  <div className="flex items-center gap-1.5 pt-1">
                    {step.files.map(f => (
                      <span key={f} className="text-[10px] font-mono text-[#FF5E65] bg-[#E5222A]/10 px-2 py-0.5 rounded">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* File Review Tabs & Code Inspector */}
            {previewFiles.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#23232F]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-[#E5222A]" />
                    <span>File Inspector</span>
                  </span>
                  <button
                    onClick={handleCopyActiveFileContent}
                    className="px-2.5 py-1 text-[11px] font-medium bg-[#1D1D26] hover:bg-[#252532] text-white border border-[#2C2C3A] rounded flex items-center gap-1.5"
                  >
                    {copiedFile ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedFile ? 'Copied' : 'Copy Code'}</span>
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {previewFiles.map(file => {
                    const isSelected = file.id === (activePreviewFileId || previewFiles[0].id);
                    return (
                      <button
                        key={file.id}
                        onClick={() => setActivePreviewFileId(file.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                          isSelected
                            ? 'bg-[#E5222A]/20 text-[#FF5E65] border border-[#E5222A]/50 font-bold'
                            : 'bg-[#111114] text-[#A5A5B2] hover:text-white border border-[#22222E]'
                        }`}
                      >
                        <span>{file.name}</span>
                        {file.isEntry && (
                          <span className="text-[9px] bg-[#E5222A] text-white px-1 rounded">entry</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Code Preview Viewport */}
                {activeFile && (
                  <div className="bg-[#101014] border border-[#22222E] rounded-xl overflow-hidden">
                    <div className="h-8 bg-[#15151B] px-3 flex items-center justify-between text-[11px] font-mono text-[#A5A5B2] border-b border-[#20202A]">
                      <span>{activeFile.path}</span>
                      <span>{activeFile.content.split('\n').length} lines</span>
                    </div>
                    <pre className="p-4 font-mono text-xs text-[#E2E8F0] overflow-auto max-h-72 select-text leading-relaxed">
                      {activeFile.content}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Action to Apply */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={handleApplyToWorkspace}
                className="px-6 py-3 bg-[#E5222A] hover:bg-[#d01c24] text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xl shadow-[#E5222A]/30 active:scale-95"
              >
                {appliedSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>Project Applied to Workspace!</span>
                  </>
                ) : (
                  <>
                    <span>{mode === 'new_project' ? 'Create Project & Launch Workspace' : `Apply to ${activeProject.name}`}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
