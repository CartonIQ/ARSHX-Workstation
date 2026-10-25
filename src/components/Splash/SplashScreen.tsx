import React, { useState, useEffect } from 'react';
import { ArshxLogo } from '../Brand/ArshxLogo';
import { Sparkles, ChevronRight, Check } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
  minDurationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  minDurationMs = 1800,
}) => {
  const [progress, setProgress] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const bootSteps = [
    'Mounting IndexedDB workspace & project trees...',
    'Verifying Jetpack Compose & Android SDK 35 targets...',
    'Initializing Smart Terminal sandbox & isolated workers...',
    'Configuring Live Preview engine & CodeKeys...',
    'ARSHX Workstation operational.',
  ];

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / minDurationMs) * 100));
      setProgress(pct);

      const stepIdx = Math.min(
        bootSteps.length - 1,
        Math.floor((pct / 100) * bootSteps.length)
      );
      setCurrentStepIndex(stepIdx);

      if (pct >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setIsFadingOut(true);
          setTimeout(onComplete, 400);
        }, 200);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [minDurationMs, onComplete, bootSteps.length]);

  const handleSkip = () => {
    setIsFadingOut(true);
    setTimeout(onComplete, 200);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between p-6 bg-[#0B0B0E] text-white select-none transition-opacity duration-400 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background Radial Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#E5222A]/10 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* Top Header / Skip */}
      <div className="w-full max-w-md flex justify-between items-center text-xs text-[#85858F] font-mono">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#E5222A] animate-pulse" />
          SYS_BOOT v0.2.0
        </span>
        <button
          onClick={handleSkip}
          className="px-2.5 py-1 rounded bg-[#181820] hover:bg-[#22222C] text-[#A5A5B2] hover:text-white border border-[#2B2B38] transition-colors flex items-center gap-1"
        >
          <span>Skip</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Center Brand Identity Section */}
      <div className="flex flex-col items-center text-center max-w-sm px-4">
        {/* Animated Glow Logo */}
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-[#E5222A]/30 blur-2xl rounded-full scale-125 animate-pulse" />
          <ArshxLogo size="xl" className="relative z-10" />
        </div>

        {/* Wordmark & Taglines */}
        <h1 className="text-3xl sm:text-4xl font-black tracking-[0.25em] text-white mb-2">
          ARSHX
        </h1>
        <div className="text-xs sm:text-sm font-bold text-[#E5222A] tracking-[0.3em] uppercase mb-3">
          BUILD. CREATE. RISE.
        </div>
        <p className="text-xs text-[#85858F] font-mono max-w-xs">
          Your code. Your vision. Your universe.
        </p>
      </div>

      {/* Bottom Progress & Diagnostic Sequence */}
      <div className="w-full max-w-md flex flex-col gap-3 font-mono">
        {/* Step indicator */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#A5A5B2] flex items-center gap-2 truncate">
            <span className="text-[#E5222A]">▸</span>
            {bootSteps[currentStepIndex]}
          </span>
          <span className="text-[#E5222A] font-bold tabular-nums ml-2">
            {progress}%
          </span>
        </div>

        {/* Progress Bar Track */}
        <div className="w-full h-1.5 bg-[#181820] rounded-full overflow-hidden border border-[#242430]">
          <div
            className="h-full bg-gradient-to-r from-[#B31219] via-[#E5222A] to-[#FF5E65] transition-all duration-75 ease-out shadow-[0_0_12px_#E5222A]"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* System specs info */}
        <div className="flex items-center justify-between text-[10px] text-[#555562] pt-1">
          <span>TARGET: SDK 35 (Android 15)</span>
          <span>COMPOSE BOM 2025.02</span>
          <span>SANDBOX: ISOLATED</span>
        </div>
      </div>
    </div>
  );
};
