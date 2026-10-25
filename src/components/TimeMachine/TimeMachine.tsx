import React, { useState, useEffect } from 'react';
import { 
  History, 
  GitCommit, 
  RotateCcw, 
  Check, 
  Plus, 
  Calendar, 
  FileCode,
  ArrowRight,
  GitBranch
} from 'lucide-react';
import { Project, Checkpoint, ProjectFile } from '../../types';
import { loadCheckpoints, createCheckpoint } from '../../utils/fileSystem';

interface TimeMachineProps {
  activeProject: Project;
  onRestoreCheckpoint: (files: ProjectFile[], message: string) => void;
}

export const TimeMachine: React.FC<TimeMachineProps> = ({
  activeProject,
  onRestoreCheckpoint,
}) => {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<Checkpoint | null>(null);
  const [newCommitMessage, setNewCommitMessage] = useState('');
  const [selectedDiffFile, setSelectedDiffFile] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    loadCheckpoints(activeProject.id).then(async (list) => {
      if (!isMounted) return;
      if (list.length === 0) {
        // Create initial seed checkpoint if none exist
        const initial = await createCheckpoint(activeProject, activeProject.lastCommitMessage || 'Initial Project Foundation');
        if (!isMounted) return;
        setCheckpoints([initial]);
        setSelectedCheckpoint(initial);
        setSelectedDiffFile(activeProject.files[0]?.name || '');
      } else {
        setCheckpoints(list);
        setSelectedCheckpoint(list[0]);
        setSelectedDiffFile(activeProject.files[0]?.name || '');
      }
    });
    return () => {
      isMounted = false;
    };
  }, [activeProject.id]);

  const handleCreateCommit = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = newCommitMessage.trim();
    if (!msg) return;

    const cp = await createCheckpoint(activeProject, msg);
    setCheckpoints(prev => [cp, ...prev]);
    setSelectedCheckpoint(cp);
    setNewCommitMessage('');
  };

  const handleRestore = (cp: Checkpoint) => {
    if (confirm(`Restore project to checkpoint "${cp.message}" (${cp.commitHash})? Any unsaved edits will be replaced.`)) {
      onRestoreCheckpoint(cp.files, cp.message);
    }
  };

  // Compare diff
  const currentFile = activeProject.files.find(f => f.name === selectedDiffFile);
  const checkpointFile = selectedCheckpoint?.files.find(f => f.name === selectedDiffFile);

  const currentLines = currentFile?.content.split('\n') || [];
  const checkpointLines = checkpointFile?.content.split('\n') || [];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0E0E12] overflow-hidden select-none">
      {/* Top Bar */}
      <div className="h-14 bg-[#141418] border-b border-[#24242C] px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <History className="w-5 h-5 text-[#E5222A]" />
          <div>
            <h2 className="text-sm font-bold text-white">ARSHX Time Machine</h2>
            <p className="text-[11px] text-[#A5A5B2]">
              Git checkpoint versioning, instant snapshots & line diff visualizer.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#A5A5B2] font-mono">
          <GitBranch className="w-3.5 h-3.5 text-[#E5222A]" />
          <span>branch: <strong className="text-white">{activeProject.gitBranch || 'main'}</strong></span>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Column: Timeline & Checkpoint List */}
        <div className="w-full md:w-80 bg-[#121216] border-r border-[#24242C] flex flex-col shrink-0">
          {/* Create Checkpoint Form */}
          <form onSubmit={handleCreateCommit} className="p-3 border-b border-[#24242C] space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#A5A5B2] block">
              Create Checkpoint Snapshot
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Commit message (e.g. Added button logic)..."
                value={newCommitMessage}
                onChange={(e) => setNewCommitMessage(e.target.value)}
                className="flex-1 bg-[#1A1A20] border border-[#2E2E38] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-[#555566] focus:outline-none focus:border-[#E5222A]"
              />
              <button
                type="submit"
                disabled={!newCommitMessage.trim()}
                className="px-3 py-1.5 bg-[#E5222A] hover:bg-[#d01c24] disabled:opacity-40 text-white rounded-lg text-xs font-bold transition-colors shrink-0"
              >
                Snapshot
              </button>
            </div>
          </form>

          {/* Timeline List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#A5A5B2] block px-1">
              Timeline History ({checkpoints.length})
            </span>

            {checkpoints.map((cp) => {
              const isSelected = selectedCheckpoint?.id === cp.id;
              return (
                <div
                  key={cp.id}
                  onClick={() => setSelectedCheckpoint(cp)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#1F1F27] border-[#E5222A]/60 shadow-sm'
                      : 'bg-[#16161B] border-[#262633] hover:border-[#38384A]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-mono text-[#FF5E65] font-bold">
                      {cp.commitHash}
                    </span>
                    <span className="text-[10px] text-[#A5A5B2] tabular-nums">
                      {new Date(cp.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-white leading-snug">
                    {cp.message}
                  </h4>
                  <div className="flex items-center justify-between text-[11px] text-[#A5A5B2] mt-2 pt-2 border-t border-[#252530]">
                    <span>{cp.files.length} files</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestore(cp);
                      }}
                      className="text-[11px] text-[#E5222A] hover:text-[#FF5E65] font-semibold flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Restore</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Diff Inspector */}
        <div className="flex-1 flex flex-col bg-[#0B0B0E] overflow-hidden select-text">
          {/* Diff Header */}
          <div className="h-11 bg-[#15151A] border-b border-[#24242C] px-4 flex items-center justify-between text-xs shrink-0 select-none">
            <div className="flex items-center gap-3">
              <span className="text-[#A5A5B2] font-semibold">Inspect Diff:</span>
              <select
                value={selectedDiffFile}
                onChange={(e) => setSelectedDiffFile(e.target.value)}
                className="bg-[#1C1C24] text-xs font-mono text-white border border-[#2E2E38] rounded px-2.5 py-1 focus:outline-none focus:border-[#E5222A]"
              >
                {activeProject.files.map((f) => (
                  <option key={f.id} value={f.name}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedCheckpoint && (
              <button
                onClick={() => handleRestore(selectedCheckpoint)}
                className="px-3 py-1 bg-[#E5222A] hover:bg-[#d01c24] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restore Checkpoint {selectedCheckpoint.commitHash}</span>
              </button>
            )}
          </div>

          {/* Diff Content View */}
          <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-5">
            {!currentFile ? (
              <div className="text-[#A5A5B2]">Select a file to compare diff.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Snapshot version */}
                <div className="border border-[#24242C] rounded-lg overflow-hidden bg-[#111114]">
                  <div className="bg-[#17171D] px-3 py-2 border-b border-[#24242C] text-[11px] font-semibold text-[#A5A5B2]">
                    Checkpoint ({selectedCheckpoint?.commitHash || 'initial'})
                  </div>
                  <pre className="p-3 text-[#A5A5B2] overflow-x-auto whitespace-pre">
                    {checkpointFile?.content || '(File did not exist in this checkpoint)'}
                  </pre>
                </div>

                {/* Current working file version */}
                <div className="border border-[#24242C] rounded-lg overflow-hidden bg-[#111114]">
                  <div className="bg-[#17171D] px-3 py-2 border-b border-[#24242C] text-[11px] font-semibold text-white flex items-center justify-between">
                    <span>Current Working File</span>
                    <span className="text-[#86EFAC] text-[10px]">Active</span>
                  </div>
                  <pre className="p-3 text-[#F7F7FA] overflow-x-auto whitespace-pre">
                    {currentFile.content}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
