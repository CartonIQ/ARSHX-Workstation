import React from 'react';
import { Terminal as TerminalIcon } from 'lucide-react';
import { Project } from '../../types';
import { NativeShell } from './NativeShell';
import { isNativeShellAvailable } from '../../utils/nativeShell';

interface Props {
  activeProject: Project;
  onUpdateProject: (updated: Project) => void;
  onAskAi: (prompt: string) => Promise<string>;
}

/** One terminal UI backed by the real Android shell plugin. */
export const TerminalHub: React.FC<Props> = (props) => {
  const native = isNativeShellAvailable();

  if (!native) {
    return (
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 p-6 text-center bg-[#09090D] text-[#B4B4C2]">
        <TerminalIcon className="w-10 h-10 text-[#E5222A]" />
        <h2 className="text-base font-bold text-white">ARSHX Real Terminal</h2>
        <p className="text-sm max-w-xs">
          The real Android shell is unavailable in this environment.
          Open the installed Android app to use the native terminal.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-[#09090D]">
      <div className="flex items-center gap-2 px-3 py-2 shrink-0 border-b border-[#24242C]">
        <TerminalIcon className="w-4 h-4 text-[#E5222A]" />
        <span className="text-sm font-bold text-white">Terminal</span>
        <span className="ml-auto text-[10px] text-[#75D99A]">
          ANDROID SHELL
        </span>
      </div>
      <div className="flex-1 flex flex-col min-h-0">
        <NativeShell {...props} />
      </div>
    </div>
  );
};
