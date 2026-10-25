import React from 'react';
import { Project } from '../../types';
import { LivePreviewPane } from './LivePreviewPane';

interface LivePreviewLabProps {
  activeProject: Project;
}

export const LivePreviewLab: React.FC<LivePreviewLabProps> = ({ activeProject }) => {
  const activeFile = activeProject.files.find(f => f.id === activeProject.activeFileId) || activeProject.files[0];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0C0C0F] overflow-hidden select-none">
      <LivePreviewPane
        activeProject={activeProject}
        activeFile={activeFile}
        compact={false}
      />
    </div>
  );
};
