import React, { useState, useEffect } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { 
  Project, 
  ProjectFile, 
  ActiveTab, 
  DoctorDiagnostic,
  EditorSettings
} from './types';
import { 
  loadStoredProjects, 
  loadStoredProjectsSync,
  saveProjects, 
  createNewFile, 
  exportProjectZip, 
  importProjectZip,
  triggerDownload 
} from './utils/fileSystem';
import { TopNav } from './components/Header/TopNav';
import { BottomNav } from './components/Mobile/BottomNav';
import { FileTree } from './components/Sidebar/FileTree';
import { WorkspaceDashboard } from './components/Home/WorkspaceDashboard';
import { CodeEditor } from './components/Editor/CodeEditor';
import { DevToolkit } from './components/Toolkit/DevToolkit';
import { TerminalHub } from './components/Terminal/TerminalHub';
import { LivePreviewLab } from './components/Preview/LivePreviewLab';
import { ProjectDoctor } from './components/Doctor/ProjectDoctor';
import { AiEngineerPanel } from './components/AI/AiEngineerPanel';
import { AiCreator } from './components/Creator/AiCreator';
import { WebsiteStudio } from './components/WebsiteStudio/WebsiteStudio';
import { AcademyTab } from './academy/AcademyTab';
import { SettingsModal } from './components/Settings/SettingsModal';
import { SplashScreen } from './components/Splash/SplashScreen';
import { aiFetch, hasApiKey, subscribeAiConfig } from './utils/gemini';


interface ArshxZipSaverPlugin {
  saveZip(options: { filename: string; data: string }): Promise<{
    saved?: boolean;
    canceled?: boolean;
  }>;
}

const ArshxZipSaver = registerPlugin<ArshxZipSaverPlugin>('ArshxZipSaver');

export default function App() {
  const [projects, setProjects] = useState<Project[]>(() => loadStoredProjectsSync());
  const [activeProjectId, setActiveProjectId] = useState<string>(() => projects[0]?.id || '');
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [mobileFrameMode, setMobileFrameMode] = useState<boolean>(false);
  const [isAiOpen, setIsAiOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isFilesOpen, setIsFilesOpen] = useState(false);
  const [aiAvailable, setAiAvailable] = useState<boolean>(() => hasApiKey());
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const hasSeen = sessionStorage.getItem('arshx_splash_shown');
      return !hasSeen;
    }
    return true;
  });

  const [editorSettings, setEditorSettings] = useState<EditorSettings>({
    fontSize: 13,
    tabSize: 4,
    wordWrap: false,
    autoSave: true,
    showLineNumbers: true,
  });

  // AI is available whenever the user has stored a Gemini key on this device
  useEffect(() => subscribeAiConfig(() => setAiAvailable(hasApiKey())), []);

  // Asynchronously load projects from IndexedDB on startup
  useEffect(() => {
    loadStoredProjects()
      .then(stored => {
        if (stored && stored.length > 0) {
          setProjects(stored);
        }
      })
      .catch(err => console.warn('Could not load stored projects from IndexedDB:', err));
  }, []);

  // Save changes to localStorage & IndexedDB on project modification
  useEffect(() => {
    if (projects.length > 0) {
      saveProjects(projects);
    }
  }, [projects]);

  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];
  const activeFile = activeProject?.files.find(f => f.id === activeProject.activeFileId) || activeProject?.files[0];

  const handleUpdateProject = (updated: Project) => {
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const handleSelectFile = (fileId: string) => {
    if (!activeProject) return;
    handleUpdateProject({
      ...activeProject,
      activeFileId: fileId,
    });
  };

  const handleUpdateContent = (content: string) => {
    if (!activeProject || !activeFile) return;
    const updatedFiles = activeProject.files.map(f => 
      f.id === activeFile.id ? { ...f, content, updatedAt: Date.now(), isDirty: false } : f
    );
    handleUpdateProject({
      ...activeProject,
      files: updatedFiles,
      updatedAt: Date.now(),
    });
  };

  const handleCreateFile = (name: string, path: string) => {
    if (!activeProject) return;
    const newFile = createNewFile(name, path);
    handleUpdateProject({
      ...activeProject,
      files: [...activeProject.files, newFile],
      activeFileId: newFile.id,
      updatedAt: Date.now(),
    });
    setActiveTab('editor');
  };

  const handleDeleteFile = (fileId: string) => {
    if (!activeProject || activeProject.files.length <= 1) return;
    const remaining = activeProject.files.filter(f => f.id !== fileId);
    handleUpdateProject({
      ...activeProject,
      files: remaining,
      activeFileId: remaining[0].id,
      updatedAt: Date.now(),
    });
  };

  const handleRenameProject = (projectId: string, newName: string) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, name: newName, updatedAt: Date.now() } : p));
  };

  const handleDeleteProject = (projectId: string) => {
    const target = projects.find(p => p.id === projectId);
    if (!target) return;

    if (projects.length <= 1) {
      alert('Create another project before deleting the last project.');
      return;
    }

    if (!window.confirm(`Delete project "${target.name}" and all its stored files? Export a ZIP first if you need a backup.`)) {
      return;
    }

    const remaining = projects.filter(p => p.id !== projectId);
    setProjects(remaining);

    if (activeProjectId === projectId) {
      setActiveProjectId(remaining[0].id);
      setActiveTab('home');
    }
  };

  const handleCreateProject = (name: string, category: 'android' | 'web' | 'automation') => {
    const newProj: Project = {
      id: `proj-${Date.now()}`,
      name,
      description: `${name} (${category}) created in ARSHX Workstation`,
      category,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      gitBranch: 'main',
      lastCommitMessage: 'Initialize project structure',
      activeFileId: 'f-init',
      files: [
        category === 'android'
          ? createNewFile('MainActivity.kt', 'app/src/main/java/com/arshx/MainActivity.kt')
          : category === 'web'
          ? createNewFile('index.html', 'index.html')
          : createNewFile('script.sh', 'script.sh'),
      ],
    };

    setProjects(prev => [newProj, ...prev]);
    setActiveProjectId(newProj.id);
    setActiveTab('editor');
  };

  const handleCreateNewProjectWithFiles = (name: string, description: string, files: ProjectFile[]) => {
    const newProj: Project = {
      id: `proj-${Date.now()}`,
      name,
      description,
      category: files.some(f => f.name.endsWith('.kt')) ? 'android' : 'web',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      gitBranch: 'main',
      lastCommitMessage: 'Synthesized via ARSHX AI Creator',
      activeFileId: files[0]?.id || 'f-init',
      files,
    };

    setProjects(prev => [newProj, ...prev]);
    setActiveProjectId(newProj.id);
    setActiveTab('editor');
  };

  const handleAddFilesToActiveProject = (newFiles: ProjectFile[]) => {
    if (!activeProject) return;
    handleUpdateProject({
      ...activeProject,
      files: [...activeProject.files, ...newFiles],
      activeFileId: newFiles[0]?.id || activeProject.activeFileId,
      updatedAt: Date.now(),
    });
    setActiveTab('editor');
  };

  const handleSaveFileToActiveProject = (filename: string, content: string) => {
    if (!activeProject) return;
    const existingIndex = activeProject.files.findIndex(f => f.name === filename);
    let updatedFiles: ProjectFile[];

    if (existingIndex !== -1) {
      updatedFiles = activeProject.files.map((f, i) => i === existingIndex ? { ...f, content, updatedAt: Date.now(), isDirty: false } : f);
    } else {
      const created = createNewFile(filename, filename);
      created.content = content;
      updatedFiles = [...activeProject.files, created];
    }

    handleUpdateProject({
      ...activeProject,
      files: updatedFiles,
      updatedAt: Date.now(),
    });
  };

  const handleSaveZip = async () => {
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

  const handleExportZip = async () => {
    if (!activeProject) {
      alert('Open a project before exporting.');
      return;
    }

    const filename = `${activeProject.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.zip`;

    try {
      const blob = await exportProjectZip(activeProject);

      if (Capacitor.isNativePlatform()) {
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
          reader.onerror = () => reject(reader.error || new Error('ZIP conversion failed.'));
          reader.readAsDataURL(blob);
        });

        const path = `exports/${filename}`;
        await Filesystem.writeFile({
          path,
          data: base64,
          directory: Directory.Cache,
          recursive: true,
        });

        const file = await Filesystem.getUri({
          path,
          directory: Directory.Cache,
        });

        await Share.share({
          title: 'Export ARSHX project',
          text: `Project ZIP: ${activeProject.name}`,
          url: file.uri,
          dialogTitle: 'Share or save project ZIP',
        });
      } else {
        triggerDownload(blob, filename);
      }
    } catch (err) {
      console.error('Export error:', err);
      alert('Could not export ZIP. Please try again and check the app logs if it continues.');
    }
  };

  const handleImportZip = async (file: File) => {
    try {
      const result = await importProjectZip(file);
      if (!result.success) {
        alert(`ZIP Import Failed:\n${result.errors.join('\n')}`);
        return;
      }

      const hasKotlin = result.files.some(f => f.name.endsWith('.kt'));
      const hasHtml = result.files.some(f => f.name.endsWith('.html'));

      const importedProject: Project = {
        id: `proj-zip-${Date.now()}`,
        name: result.projectName || file.name.replace(/\.zip$/i, ''),
        description: `Imported archive from ${file.name} (${result.files.length} files)`,
        category: hasKotlin ? 'android' : hasHtml ? 'web' : 'automation',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        gitBranch: 'main',
        lastCommitMessage: `Imported from ${file.name}`,
        activeFileId: result.files[0]?.id || 'f-init',
        files: result.files,
      };

      setProjects(prev => [importedProject, ...prev]);
      setActiveProjectId(importedProject.id);
      setActiveTab('editor');

      if (result.warnings.length > 0) {
        alert(`Project "${importedProject.name}" imported successfully!\n\nNote:\n${result.warnings.slice(0, 3).join('\n')}`);
      }
    } catch (err: any) {
      alert(`Could not import ZIP: ${err?.message || 'Invalid format'}`);
    }
  };

  const handleRestoreCheckpoint = (restoredFiles: ProjectFile[], msg: string) => {
    if (!activeProject) return;
    handleUpdateProject({
      ...activeProject,
      files: restoredFiles,
      lastCommitMessage: `Restored: ${msg}`,
      updatedAt: Date.now(),
    });
    alert(`Successfully restored project state to: ${msg}`);
  };

  const handleFixWithAi = (issue: DoctorDiagnostic) => {
    setIsAiOpen(true);
    const target = activeProject.files.find(f => f.name === issue.file);
    if (target) {
      handleSelectFile(target.id);
    }
  };

  const handleApplyCodeToEditor = (code: string) => {
    handleUpdateContent(code);
    setIsAiOpen(false);
    setActiveTab('editor');
  };

  const handleAskAi = async (prompt: string): Promise<string> => {
    try {
      const res = await aiFetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          fileContext: activeFile ? {
            filename: activeFile.name,
            language: activeFile.language,
            content: activeFile.content,
          } : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI generation failed');
      return data.reply;
    } catch (e: any) {
      return `AI Response Note: ${e.message}`;
    }
  };

  // Render the current view according to active tab
  const renderActiveView = () => {
    switch (activeTab) {
      case 'home':
        return (
          <WorkspaceDashboard
            activeProject={activeProject}
            projects={projects}
            onNavigate={(tab) => setActiveTab(tab)}
            onSelectProject={(id) => setActiveProjectId(id)}
            onOpenAi={() => setIsAiOpen(true)}
            onSelectFile={(id) => handleSelectFile(id)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onCreateNewProjectModal={() => handleCreateProject(`App Project ${projects.length + 1}`, 'android')}
            onImportZip={handleImportZip}
            onRenameProject={handleRenameProject}
            onDeleteProject={handleDeleteProject}
            onExportZip={handleExportZip} onSaveZip={handleSaveZip}
          />
        );
      case 'creator':
        return (
          <AiCreator
            activeProject={activeProject}
            onCreateNewProjectWithFiles={handleCreateNewProjectWithFiles}
            onAddFilesToActiveProject={handleAddFilesToActiveProject}
            onAskAi={handleAskAi}
          />
        );
      case 'editor':
        return (
          <div className="flex-1 flex overflow-hidden relative">
            {isFilesOpen && (
              <div
                className="lg:hidden absolute inset-0 z-20 bg-black/55 backdrop-blur-[2px]"
                onClick={() => setIsFilesOpen(false)}
                aria-hidden="true"
              />
            )}
            <FileTree
              projects={projects}
              activeProject={activeProject}
              onSelectProject={(id) => setActiveProjectId(id)}
              onSelectFile={(id) => { handleSelectFile(id); setIsFilesOpen(false); }}
              onCreateFile={(n, p) => { handleCreateFile(n, p); setIsFilesOpen(false); }}
              onDeleteFile={handleDeleteFile}
              onCreateProject={handleCreateProject}
              onRenameProject={handleRenameProject}
              onImportZip={handleImportZip}
              isOpen={isFilesOpen}
              onToggle={() => setIsFilesOpen(false)}
            />
            <CodeEditor
              activeFile={activeFile}
              activeProject={activeProject}
              onUpdateContent={handleUpdateContent}
              onSelectFile={handleSelectFile}
              onOpenAiWithAction={(action, filename, content) => {
                setIsAiOpen(true);
              }}
              onRunPreview={() => setActiveTab('preview')}
              onToggleFiles={() => setIsFilesOpen((v) => !v)}
            />
          </div>
        );
      case 'terminal':
        return (
          <TerminalHub
            activeProject={activeProject}
            onUpdateProject={handleUpdateProject}
            onAskAi={handleAskAi}
          />
        );
      case 'preview':
        return <LivePreviewLab activeProject={activeProject} />;
      case 'website':
        return (
          <WebsiteStudio
            activeProject={activeProject}
            onSaveFile={handleSaveFileToActiveProject}
            onAskAi={handleAskAi}
          />
        );
      case 'doctor':
        return (
          <ProjectDoctor
            activeProject={activeProject}
            onFixWithAi={handleFixWithAi}
            onNavigateToFile={(name) => {
              const file = activeProject.files.find(f => f.name === name);
              if (file) {
                handleSelectFile(file.id);
                setActiveTab('editor');
              }
            }}
          />
        );
      case 'toolkit':
        return <DevToolkit />;
      case 'academy':
        return <AcademyTab />;
      default:
        return null;
    }
  };

  const appContent = (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <TopNav
        activeTab={activeTab}
        onTabChange={(t) => setActiveTab(t)}
        activeProject={activeProject}
        mobileFrameMode={mobileFrameMode}
        onToggleMobileFrame={() => setMobileFrameMode(!mobileFrameMode)}
        onExportZip={handleExportZip} onSaveZip={handleSaveZip}
        onImportZip={handleImportZip}
        onOpenAi={() => setIsAiOpen(!isAiOpen)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        aiAvailable={aiAvailable}
      />

      <div className="flex-1 flex overflow-hidden relative app-content-pad">
        {renderActiveView()}

        {/* AI Engineer Side Drawer */}
        <AiEngineerPanel
          isOpen={isAiOpen}
          onClose={() => setIsAiOpen(false)}
          activeProject={activeProject}
          activeFile={activeFile}
          onApplyCodeToEditor={handleApplyCodeToEditor}
          aiAvailable={aiAvailable}
        />
      </div>

      {/* Settings & Privacy Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        editorSettings={editorSettings}
        onUpdateEditorSettings={setEditorSettings}
        projects={projects}
        onImportBackup={(imported) => {
          setProjects(imported);
          setActiveProjectId(imported[0].id);
        }}
        onReplaySplash={() => setShowSplash(true)}
      />

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={(t) => setActiveTab(t)}
        onOpenAi={() => setIsAiOpen(!isAiOpen)}
        isAiOpen={isAiOpen}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
    </div>
  );

  // Render Splash Screen if active
  if (showSplash) {
    return (
      <SplashScreen
        onComplete={() => {
          setShowSplash(false);
          sessionStorage.setItem('arshx_splash_shown', 'true');
        }}
      />
    );
  }

  // If Mobile Frame mode is activated on desktop, render inside a realistic Android device bezel!
  if (mobileFrameMode) {
    return (
      <div className="w-full h-dvh bg-[#070709] flex items-center justify-center p-2 sm:p-6 overflow-hidden">
        <div className="w-full max-w-[430px] h-[94vh] max-h-[890px] bg-[#111114] rounded-[44px] border-[10px] border-[#22222B] shadow-2xl overflow-hidden flex flex-col relative ring-1 ring-[#3A3A4A]">
          {/* Simulated Android Status Bar */}
          <div className="h-6 bg-[#141418] px-6 flex items-center justify-between text-[11px] text-[#A5A5B2] font-mono select-none shrink-0">
            <span>12:00</span>
            <div className="w-20 h-3.5 bg-[#22222B] rounded-full mx-auto" />
            <div className="flex items-center gap-1.5">
              <span>5G</span>
              <span>100%</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            {appContent}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-dvh flex flex-col overflow-hidden">
      {appContent}
    </div>
  );
}
