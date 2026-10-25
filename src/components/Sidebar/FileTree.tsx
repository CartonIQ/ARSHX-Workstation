import React, { useState, useRef } from 'react';
import { 
  Folder, 
  FolderOpen, 
  FileCode, 
  FileText, 
  FileJson, 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronRight,
  Layers,
  Sparkles,
  Check,
  X,
  Upload,
  Edit2
} from 'lucide-react';
import { Project, ProjectFile } from '../../types';
import { detectLanguage } from '../../utils/syntax';

interface FileTreeProps {
  projects: Project[];
  activeProject: Project;
  onSelectProject: (projectId: string) => void;
  onSelectFile: (fileId: string) => void;
  onCreateFile: (name: string, path: string) => void;
  onDeleteFile: (fileId: string) => void;
  onCreateProject: (name: string, category: 'android' | 'web' | 'automation') => void;
  onRenameProject?: (projectId: string, newName: string) => void;
  onImportZip?: (file: File) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const FileTree: React.FC<FileTreeProps> = ({
  projects,
  activeProject,
  onSelectProject,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  onCreateProject,
  onRenameProject,
  onImportZip,
  isOpen,
  onToggle,
}) => {
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectCategory, setNewProjectCategory] = useState<'android' | 'web' | 'automation'>('android');
  
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const zipInputRef = useRef<HTMLInputElement>(null);

  const handleCreateFileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newFileName.trim();
    if (!clean) return;
    onCreateFile(clean, clean);
    setNewFileName('');
    setShowNewFileModal(false);
  };

  const handleCreateProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newProjectName.trim();
    if (!clean) return;
    onCreateProject(clean, newProjectCategory);
    setNewProjectName('');
    setShowProjectModal(false);
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = renameValue.trim();
    if (clean && onRenameProject) {
      onRenameProject(activeProject.id, clean);
    }
    setShowRenameModal(false);
  };

  const handleZipFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportZip) {
      onImportZip(file);
    }
    if (e.target) e.target.value = '';
  };

  const getFileIcon = (file: ProjectFile) => {
    switch (file.language) {
      case 'kotlin':
        return <span className="text-[#FF5E65] font-bold text-xs">K</span>;
      case 'typescript':
      case 'javascript':
        return <span className="text-[#FBBF24] font-bold text-xs">JS</span>;
      case 'html':
        return <span className="text-[#F43F5E] font-bold text-xs">&lt;&gt;</span>;
      case 'css':
        return <span className="text-[#67E8F9] font-bold text-xs">#</span>;
      case 'json':
        return <FileJson className="w-3.5 h-3.5 text-[#A5A5B2]" />;
      case 'markdown':
        return <FileText className="w-3.5 h-3.5 text-[#93C5FD]" />;
      default:
        return <FileCode className="w-3.5 h-3.5 text-[#A5A5B2]" />;
    }
  };

  return (
    <aside
      aria-label="Project files"
      className={`absolute lg:static inset-y-0 left-0 z-30 w-[82vw] max-w-72 lg:w-64 lg:max-w-none bg-[#141418] border-r border-[#24242C] flex flex-col shrink-0 h-full overflow-hidden select-none shadow-2xl lg:shadow-none transition-transform duration-200 ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
    >
      {/* Hidden ZIP file input */}
      <input
        ref={zipInputRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={handleZipFileChange}
      />

      {/* Project Selector Header */}
      <div className="p-3 border-b border-[#24242C]">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#A5A5B2]">
            Project Workspace
          </span>
          <div className="flex items-center gap-2">
            {onImportZip && (
              <button
                onClick={() => zipInputRef.current?.click()}
                className="text-[11px] text-[#A5A5B2] hover:text-white font-medium flex items-center gap-1 transition-colors"
                title="Import Project Archive (.ZIP)"
              >
                <Upload className="w-3 h-3 text-[#67E8F9]" />
                <span>Import</span>
              </button>
            )}
            <button
              onClick={() => setShowProjectModal(true)}
              className="text-[11px] text-[#E5222A] hover:text-[#FF5E65] font-medium flex items-center gap-1 transition-colors"
              title="Create New Project"
            >
              <Plus className="w-3 h-3" />
              <span>New</span>
            </button>
          </div>
        </div>

        {/* Project Dropdown & Rename Trigger */}
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <select
              value={activeProject.id}
              onChange={(e) => onSelectProject(e.target.value)}
              className="w-full bg-[#1A1A20] text-xs font-semibold text-[#F7F7FA] border border-[#2E2E38] rounded-lg pl-2.5 pr-7 py-1.5 appearance-none cursor-pointer focus:outline-none focus:border-[#E5222A]"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#1A1A20] text-white">
                  {p.name} ({p.category})
                </option>
              ))}
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#A5A5B2]">
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>

          {onRenameProject && (
            <button
              onClick={() => {
                setRenameValue(activeProject.name);
                setShowRenameModal(true);
              }}
              className="p-1.5 bg-[#1A1A20] hover:bg-[#24242C] text-[#A5A5B2] hover:text-white rounded-lg border border-[#2E2E38] transition-colors"
              title="Rename active project"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Files Header & New File Trigger */}
      <div className="px-3 py-2 flex items-center justify-between text-xs text-[#A5A5B2] border-b border-[#1F1F26]">
        <span className="font-semibold text-[11px] text-[#A5A5B2]">FILES ({activeProject.files.length})</span>
        <button
          onClick={() => setShowNewFileModal(true)}
          className="p-1 hover:bg-[#24242C] rounded text-[#A5A5B2] hover:text-[#F7F7FA] transition-colors"
          title="Add File"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5 font-mono text-xs">
        {activeProject.files.map((file) => {
          const isActive = file.id === activeProject.activeFileId;
          return (
            <div
              key={file.id}
              onClick={() => onSelectFile(file.id)}
              className={`group flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer transition-colors ${
                isActive
                  ? 'bg-[#24242C] text-white font-medium border-l-2 border-[#E5222A]'
                  : 'text-[#A5A5B2] hover:text-[#F7F7FA] hover:bg-[#1A1A20]'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="shrink-0">{getFileIcon(file)}</span>
                <span className="truncate">{file.name}</span>
                {file.isEntry && (
                  <span className="text-[9px] px-1 bg-[#E5222A]/20 text-[#FF5E65] rounded font-sans font-semibold">
                    entry
                  </span>
                )}
                {file.isDirty && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E5222A] shrink-0" title="Unsaved changes" />
                )}
              </div>

              {/* Delete button (hidden unless hovered, prevented on entry files) */}
              {activeProject.files.length > 1 && !file.isEntry && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete ${file.name}?`)) {
                      onDeleteFile(file.id);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-[#E5222A] transition-opacity"
                  title="Delete File"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Workspace Footer Info */}
      <div className="p-3 border-t border-[#24242C] text-[11px] text-[#A5A5B2] bg-[#111114]">
        <div className="flex items-center justify-between">
          <span>Branch</span>
          <span className="text-[#F7F7FA] font-mono font-medium">{activeProject.gitBranch || 'main'}</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span>Target</span>
          <span className="text-[#E5222A] font-semibold">{activeProject.category.toUpperCase()}</span>
        </div>
      </div>

      {/* New File Modal */}
      {showNewFileModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateFileSubmit}
            className="w-full max-w-sm bg-[#1A1A20] border border-[#34343E] rounded-xl p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Create New File</h3>
              <button
                type="button"
                onClick={() => setShowNewFileModal(false)}
                className="text-[#A5A5B2] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="text-xs text-[#A5A5B2] block mb-1">File Name & Extension</label>
              <input
                type="text"
                autoFocus
                placeholder="e.g. MyComponent.kt or utils.js"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                className="w-full bg-[#111114] border border-[#2E2E38] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E5222A]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewFileModal(false)}
                className="px-3 py-1.5 text-xs text-[#A5A5B2] hover:text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold text-white bg-[#E5222A] hover:bg-[#d01c24] rounded-lg"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Rename Project Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleRenameSubmit}
            className="w-full max-w-sm bg-[#1A1A20] border border-[#34343E] rounded-xl p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Rename Project</h3>
              <button
                type="button"
                onClick={() => setShowRenameModal(false)}
                className="text-[#A5A5B2] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="text-xs text-[#A5A5B2] block mb-1">Project Name</label>
              <input
                type="text"
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="w-full bg-[#111114] border border-[#2E2E38] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E5222A]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRenameModal(false)}
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

      {/* New Project Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateProjectSubmit}
            className="w-full max-w-sm bg-[#1A1A20] border border-[#34343E] rounded-xl p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">New Workspace Project</h3>
              <button
                type="button"
                onClick={() => setShowProjectModal(false)}
                className="text-[#A5A5B2] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="text-xs text-[#A5A5B2] block mb-1">Project Name</label>
              <input
                type="text"
                autoFocus
                placeholder="e.g. My Android App or Web Script"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="w-full bg-[#111114] border border-[#2E2E38] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E5222A]"
              />
            </div>
            <div>
              <label className="text-xs text-[#A5A5B2] block mb-1">Project Template Type</label>
              <select
                value={newProjectCategory}
                onChange={(e) => setNewProjectCategory(e.target.value as any)}
                className="w-full bg-[#111114] border border-[#2E2E38] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E5222A]"
              >
                <option value="android">Android Jetpack Compose (SDK 35)</option>
                <option value="web">Fullstack Web App (HTML/CSS/JS)</option>
                <option value="automation">Termux Shell / Automation</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowProjectModal(false)}
                className="px-3 py-1.5 text-xs text-[#A5A5B2] hover:text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold text-white bg-[#E5222A] hover:bg-[#d01c24] rounded-lg"
              >
                Create Project
              </button>
            </div>
          </form>
        </div>
      )}
    </aside>
  );
};
