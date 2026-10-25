import React, { useEffect, useState } from 'react';
import {
  FolderGit2,
  Code2,
  Terminal,
  Sparkles,
  GraduationCap,
  LayoutGrid,
  Globe,
  Stethoscope,
  Eye,
  History,
  Wrench,
  Settings,
  X,
} from 'lucide-react';
import { ActiveTab } from '../../types';

interface BottomNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenAi: () => void;
  isAiOpen: boolean;
  onOpenSettings?: () => void;
}

const PRIMARY: { tab: ActiveTab; label: string; icon: React.ElementType }[] = [
  { tab: 'home', label: 'Workspace', icon: FolderGit2 },
  { tab: 'editor', label: 'Editor', icon: Code2 },
  { tab: 'terminal', label: 'Terminal', icon: Terminal },
];

const MORE: { tab: ActiveTab; label: string; icon: React.ElementType }[] = [
  { tab: 'academy', label: 'ARSHX Academy', icon: GraduationCap },
  { tab: 'creator', label: 'AI Creator', icon: Sparkles },
  { tab: 'website', label: 'Web Studio', icon: Globe },
  { tab: 'preview', label: 'Live Preview', icon: Eye },
  { tab: 'doctor', label: 'Project Doctor', icon: Stethoscope },
  { tab: 'toolkit', label: 'Dev Toolkit', icon: Wrench },
];

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  onOpenAi,
  isAiOpen,
  onOpenSettings,
}) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const inMore = MORE.some((m) => m.tab === activeTab);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMoreOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moreOpen]);

  const itemClass = (active: boolean) =>
    `relative flex flex-col items-center justify-center min-w-[56px] min-h-[48px] px-1 rounded-2xl transition-colors ${
      active ? 'text-white' : 'text-[#B4B4C2] hover:text-white'
    }`;

  return (
    <>
      {moreOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex items-end bg-black/55 backdrop-blur-sm"
          onClick={() => setMoreOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="All tools"
            onClick={(e) => e.stopPropagation()}
            className="glass-panel glass-enter w-full rounded-t-3xl px-4 pt-3 max-h-[80dvh] overflow-y-auto"
            style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/25" />
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-white">All tools</h2>
              <button
                onClick={() => setMoreOpen(false)}
                aria-label="Close menu"
                className="p-2 -mr-2 rounded-lg text-[#B4B4C2] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {MORE.map(({ tab, label, icon: Icon }) => {
                const active = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => {
                      onTabChange(tab);
                      setMoreOpen(false);
                    }}
                    aria-current={active ? 'page' : undefined}
                    className={`glass-card flex flex-col items-center justify-center gap-1.5 min-h-[84px] p-2 text-center transition-transform active:scale-95 ${
                      active ? 'border-[#E5222A]/60 text-white' : 'text-[#E4E4EC]'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${active ? 'text-[#FF4D55]' : 'text-[#E5222A]'}`} />
                    <span className="text-[11px] font-semibold leading-tight">{label}</span>
                  </button>
                );
              })}
              {onOpenSettings && (
                <button
                  onClick={() => {
                    setMoreOpen(false);
                    onOpenSettings();
                  }}
                  className="glass-card flex flex-col items-center justify-center gap-1.5 min-h-[84px] p-2 text-center text-[#E4E4EC] transition-transform active:scale-95"
                >
                  <Settings className="w-5 h-5 text-[#E5222A]" />
                  <span className="text-[11px] font-semibold leading-tight">Settings</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <nav
        aria-label="Primary"
        className="bottom-dock lg:hidden fixed bottom-0 left-0 right-0 z-40 glass-panel border-x-0 border-b-0 rounded-t-3xl px-2 flex items-center justify-around select-none"
      >
        {PRIMARY.map(({ tab, label, icon: Icon }) => {
          const active = activeTab === tab && !isAiOpen && !moreOpen;
          return (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              aria-current={active ? 'page' : undefined}
              className={itemClass(active)}
            >
              <Icon className={`w-5 h-5 ${active ? 'text-[#FF4D55]' : ''}`} />
              <span className="text-[10px] font-semibold mt-1">{label}</span>
              {active && <span className="absolute -bottom-0.5 h-0.5 w-5 rounded-full bg-[#FF4D55]" />}
            </button>
          );
        })}

        <button
          onClick={onOpenAi}
          aria-pressed={isAiOpen}
          aria-label="AI Engineer"
          className="flex flex-col items-center justify-center min-w-[56px] min-h-[48px]"
        >
          <span
            className={`flex items-center justify-center w-11 h-11 -mt-5 rounded-2xl btn-primary !min-h-0 !p-0 ${
              isAiOpen ? 'ring-2 ring-white/60' : ''
            }`}
          >
            <Sparkles className="w-5 h-5" />
          </span>
          <span className="text-[10px] font-semibold mt-1 text-[#FF4D55]">AI</span>
        </button>

        <button
          onClick={() => setMoreOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          className={itemClass(inMore || moreOpen)}
        >
          <LayoutGrid className={`w-5 h-5 ${inMore || moreOpen ? 'text-[#FF4D55]' : ''}`} />
          <span className="text-[10px] font-semibold mt-1">More</span>
        </button>
      </nav>
    </>
  );
};
