import React, { useState, useRef } from 'react';
import { 
  Code2, 
  Terminal, 
  Play, 
  Stethoscope, 
  History, 
  Hammer, 
  Sparkles, 
  ChevronRight, 
  Folder, 
  FileCode,
  Layers,
  ArrowUpRight,
  Palette,
  Globe,
  Gamepad2,
  GraduationCap,
  GitBranch,
  Search,
  Plus,
  Settings,
  FolderOpen,
  Upload,
  Edit2,
  Download,
  Trash2
} from 'lucide-react';
import { Project, ActiveTab } from '../../types';
import { ArshxLogo } from '../Brand/ArshxLogo';

interface WorkspaceDashboardProps {
  activeProject: Project;
  projects: Project[];
  onNavigate: (tab: ActiveTab) => void;
  onSelectProject: (projectId: string) => void;
  onOpenAi: () => void;
  onSelectFile: (fileId: string) => void;
  onOpenSettings: () => void;
  onCreateNewProjectModal: () => void;
  onImportZip?: (file: File) => void;
  onRenameProject?: (projectId: string, newName: string) => void;
  onDeleteProject?: (projectId: string) => void;
  onExportZip?: () => void;
}

export const WorkspaceDashboard: React.FC<WorkspaceDashboardProps> = ({
  activeProject,
  projects,
  onNavigate,
  onSelectProject,
  onOpenAi,
  onSelectFile,
  onOpenSettings,
  onCreateNewProjectModal,
  onImportZip,
  onRenameProject,
  onDeleteProject,
  onExportZip,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const zipInputRef = useRef<HTMLInputElement>(null);

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportZip) {
      onImportZip(file);
    }
    if (e.target) e.target.value = '';
  };

  const handleStartRename = (proj: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(proj.id);
    setRenameInput(proj.name);
  };

  const handleSaveRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (renamingId && renameInput.trim() && onRenameProject) {
      onRenameProject(renamingId, renameInput.trim());
    }
    setRenamingId(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#111114] overflow-y-auto p-4 md:p-8 select-none">
      <input
        ref={zipInputRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={handleZipChange}
      />

      <div className="max-w-5xl w-full mx-auto space-y-7 pb-16">
        {/* Brand identity header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ArshxLogo size="md" />
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <h1 className="text-2xl font-black text-[#F7F7FA] tracking-wider">
                  ARSHX
                </h1>
                <span className="w-1.5 h-1.5 rounded-full bg-[#E5222A]" />
              </div>
              <p className="text-[11px] font-bold text-[#E5222A] tracking-[0.2em] mt-1 leading-none uppercase">
                BUILD. CREATE. RISE.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenSettings}
              className="p-2 bg-[#1A1A20] hover:bg-[#24242C] text-[#A5A5B2] hover:text-white rounded-xl border border-[#2B2B38] transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <div className="hidden sm:flex items-center gap-2 bg-[#1A1A20] px-3 py-1.5 rounded-xl border border-[#2B2B38] text-xs font-mono">
              <span className="text-[#A5A5B2]">Active:</span>
              <span className="text-white font-bold">{activeProject.name}</span>
            </div>
          </div>
        </div>

        {/* Hero Card */}
        <div className="bg-[#1A1A20] border border-[#2B2B36] rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
          <div className="relative z-10 max-w-2xl space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#F7F7FA] leading-tight tracking-tight">
              YOUR NEXT IDEA<br />STARTS HERE.
            </h2>
            <p className="text-sm text-[#A5A5B2] font-medium leading-relaxed">
              Your code. Your vision. Your universe. A complete, professional developer workstation for Android, Web, 2D Games, and AI engineering directly on your device.
            </p>
            <div className="pt-2 flex flex-wrap gap-2.5">
              <button
                onClick={() => onNavigate('editor')}
                className="px-5 py-2.5 bg-[#E5222A] hover:bg-[#d01c24] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-[#E5222A]/30 active:scale-95"
              >
                <Code2 className="w-4 h-4" />
                <span>Open Editor</span>
              </button>

              <button
                onClick={() => onNavigate('designer')}
                className="px-4 py-2.5 bg-[#24242C] hover:bg-[#2C2C36] text-[#F7F7FA] border border-[#34343E] rounded-xl text-xs font-semibold transition-all flex items-center gap-2 active:scale-95"
              >
                <Palette className="w-4 h-4 text-[#FF5E65]" />
                <span>AI Designer</span>
              </button>

              <button
                onClick={() => onNavigate('creator')}
                className="px-4 py-2.5 bg-[#24242C] hover:bg-[#2C2C36] text-[#F7F7FA] border border-[#34343E] rounded-xl text-xs font-semibold transition-all flex items-center gap-2 active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-[#FBBF24]" />
                <span>AI Creator</span>
              </button>

              <button
                onClick={onCreateNewProjectModal}
                className="px-4 py-2.5 bg-[#1F1F27] hover:bg-[#282834] text-white rounded-xl text-xs font-semibold border border-[#2E2E3C] transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>New Project</span>
              </button>

              {onImportZip && (
                <button
                  onClick={() => zipInputRef.current?.click()}
                  className="px-4 py-2.5 bg-[#1F1F27] hover:bg-[#282834] text-white rounded-xl text-xs font-semibold border border-[#2E2E3C] transition-all flex items-center gap-1.5"
                  title="Import Project Archive (.ZIP)"
                >
                  <Upload className="w-4 h-4 text-[#67E8F9]" />
                  <span>Import ZIP</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Project Search & Filter */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#A5A5B2]">
                Project Workspaces ({projects.length})
              </h3>
              {onExportZip && (
                <button
                  type="button"
                  onClick={onExportZip}
                  className="text-[11px] text-white bg-[#E5222A] hover:bg-[#d01c24] rounded-lg px-3 py-2 flex items-center gap-1.5 font-semibold"
                  title="Export the selected project as a ZIP archive"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export ZIP
                </button>
              )}
              {onImportZip && (
                <button
                  onClick={() => zipInputRef.current?.click()}
                  className="text-[11px] text-[#67E8F9] hover:underline flex items-center gap-1 font-semibold ml-2"
                >
                  <Upload className="w-3 h-3" />
                  <span>Import Archive</span>
                </button>
              )}
            </div>
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#181820] border border-[#2A2A38] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-[#555566] focus:outline-none focus:border-[#E5222A]"
              />
              <Search className="w-4 h-4 text-[#A5A5B2] absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {filteredProjects.map(proj => {
              const isCurrent = proj.id === activeProject.id;
              return (
                <div
                  key={proj.id}
                  onClick={() => onSelectProject(proj.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all relative group ${
                    isCurrent
                      ? 'bg-[#1D1D26] border-[#E5222A]/60 shadow-md'
                      : 'bg-[#16161C] border-[#262633] hover:border-[#38384A]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-mono text-[10px] font-bold text-[#E5222A] uppercase">
                      {proj.category}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-[#A5A5B2] font-mono">
                        {proj.files.length} files
                      </span>
                      {onRenameProject && (
                        <button
                          type="button"
                          onClick={(e) => handleStartRename(proj, e)}
                          className="p-1 text-[#A5A5B2] hover:text-white rounded transition-opacity"
                          title="Rename project"
                          aria-label={`Rename project ${proj.name}`}
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      )}
                      {onDeleteProject && projects.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteProject(proj.id);
                          }}
                          className="p-1 text-[#A5A5B2] hover:text-[#FF5E65] rounded transition-colors"
                          title={`Delete project ${proj.name}`}
                          aria-label={`Delete project ${proj.name}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">{proj.name}</h4>
                  <p className="text-xs text-[#A5A5B2] line-clamp-2 leading-relaxed">
                    {proj.description}
                  </p>
                  <div className="mt-3 pt-2 border-t border-[#252530] flex items-center justify-between text-[11px] text-[#A5A5B2]">
                    <span className="font-mono">branch: {proj.gitBranch || 'main'}</span>
                    <span className={`font-semibold ${isCurrent ? 'text-[#86EFAC]' : 'text-[#A5A5B2]'}`}>
                      {isCurrent ? 'Active' : 'Open'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Full Suite Feature Grid */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#A5A5B2]">
            Complete Developer Suite
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              {
                id: 'designer',
                tab: 'designer' as ActiveTab,
                title: 'AI Designer',
                desc: 'Generate Jetpack Compose visual UI layouts & themes from prompts',
                icon: Palette,
                color: '#FF5E65',
              },
              {
                id: 'creator',
                tab: 'creator' as ActiveTab,
                title: 'AI Creator',
                desc: 'Plan, generate, and build complete multi-file applications',
                icon: Sparkles,
                color: '#FBBF24',
              },
              {
                id: 'editor',
                tab: 'editor' as ActiveTab,
                title: 'Code Editor',
                desc: 'Real IDE with CodeKeys toolbar, syntax highlighting & line numbers',
                icon: Code2,
                color: '#E5222A',
              },
              {
                id: 'terminal',
                tab: 'terminal' as ActiveTab,
                title: 'Smart Terminal',
                desc: 'Built-in project CLI, isolated JS runner, Gradle pre-flight & Git toolchain',
                icon: Terminal,
                color: '#E5222A',
              },
              {
                id: 'website',
                tab: 'website' as ActiveTab,
                title: 'Website Studio',
                desc: 'HTML5, CSS3 & JS development with responsive WebView live sandbox',
                icon: Globe,
                color: '#67E8F9',
              },
              {
                id: 'game',
                tab: 'game' as ActiveTab,
                title: 'Game Creator',
                desc: '2D Canvas game engine with editable mechanics and touch controls',
                icon: Gamepad2,
                color: '#86EFAC',
              },
              {
                id: 'doctor',
                tab: 'doctor' as ActiveTab,
                title: 'Project Doctor',
                desc: 'Static diagnostics, manifest audits, syntax & one-click AI fixes',
                icon: Stethoscope,
                color: '#86EFAC',
              },
              {
                id: 'timemachine',
                tab: 'timemachine' as ActiveTab,
                title: 'Time Machine',
                desc: 'Git checkpoints, commit snapshots, and visual line diff inspector',
                icon: History,
                color: '#67E8F9',
              },
              {
                id: 'build',
                tab: 'build' as ActiveTab,
                title: 'APK Build Center',
                desc: 'SDK 35 audit, Termux on-device build scripts & ZIP export',
                icon: Hammer,
                color: '#E5222A',
              },
              {
                id: 'academy',
                tab: 'academy' as ActiveTab,
                title: 'Coding Academy',
                desc: 'Interactive masterclasses for Kotlin, Compose, Web, and Termux',
                icon: GraduationCap,
                color: '#F43F5E',
              },
            ].map((tool) => {
              const Icon = tool.icon;
              return (
                <div
                  key={tool.id}
                  onClick={() => onNavigate(tool.tab)}
                  className="bg-[#1A1A20] border border-[#282834] hover:border-[#38384A] rounded-2xl p-4 flex items-start gap-3.5 cursor-pointer transition-all group"
                >
                  <div
                    style={{ color: tool.color }}
                    className="w-10 h-10 rounded-xl bg-[#24242C] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white">{tool.title}</h4>
                      <ChevronRight className="w-3.5 h-3.5 text-[#A5A5B2] group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <p className="text-[11px] text-[#A5A5B2] mt-0.5 leading-snug line-clamp-2">
                      {tool.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Files Quick Jump */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#A5A5B2]">
            Project Files in {activeProject.name}
          </h3>
          <div className="bg-[#16161C] border border-[#262633] rounded-2xl divide-y divide-[#22222D] overflow-hidden">
            {activeProject.files.map((file) => (
              <div
                key={file.id}
                onClick={() => {
                  onSelectFile(file.id);
                  onNavigate('editor');
                }}
                className="px-4 py-3 flex items-center justify-between hover:bg-[#1E1E26] cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileCode className="w-4 h-4 text-[#E5222A]" />
                  <div>
                    <span className="text-xs font-medium text-white font-mono">{file.name}</span>
                    <span className="text-[11px] text-[#A5A5B2] ml-2 font-mono">
                      {file.path}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {file.isEntry && (
                    <span className="text-[10px] bg-[#E5222A]/20 text-[#FF5E65] px-2 py-0.5 rounded font-semibold">
                      Main Entry
                    </span>
                  )}
                  <span className="text-xs text-[#A5A5B2] hover:text-white flex items-center gap-1 font-semibold">
                    Edit <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Specifications & Truthful Disclosure */}
        <div className="text-center pt-4 text-[11px] text-[#A5A5B2] space-y-1">
          <div>ARSHX WORKSTATION · PRODUCTION RELEASE v1.0.0</div>
          <div className="text-[#6B7280]">Target: Android SDK 35 · Kotlin 2.0.21 · Compose BOM 2025.02.00 · Gradle 8.11.1</div>
        </div>
      </div>

      {/* Rename Modal */}
      {renamingId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveRename}
            className="w-full max-w-sm bg-[#1A1A20] border border-[#34343E] rounded-xl p-5 shadow-2xl space-y-4"
          >
            <h3 className="text-sm font-bold text-white">Rename Project</h3>
            <input
              type="text"
              autoFocus
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
              className="w-full bg-[#111114] border border-[#2E2E38] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E5222A]"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRenamingId(null)}
                className="px-3 py-1.5 text-xs text-[#A5A5B2] hover:text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold text-white bg-[#E5222A] hover:bg-[#d01c24] rounded-lg"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
