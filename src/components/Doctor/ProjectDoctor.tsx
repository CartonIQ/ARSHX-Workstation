import React, { useState } from 'react';
import { 
  Stethoscope, 
  CheckCircle2, 
  AlertTriangle, 
  AlertOctagon, 
  Info, 
  RotateCw, 
  Sparkles,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { Project, DoctorDiagnostic } from '../../types';
import { runStaticDiagnostics } from '../../utils/fileSystem';

interface ProjectDoctorProps {
  activeProject: Project;
  onFixWithAi: (issue: DoctorDiagnostic) => void;
  onNavigateToFile: (fileName: string) => void;
}

export const ProjectDoctor: React.FC<ProjectDoctorProps> = ({
  activeProject,
  onFixWithAi,
  onNavigateToFile,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DoctorDiagnostic[]>(() =>
    runStaticDiagnostics(activeProject)
  );

  const handleScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      const results = runStaticDiagnostics(activeProject);
      setDiagnostics(results);
      setIsScanning(false);
    }, 400);
  };

  const errorCount = diagnostics.filter(d => d.severity === 'error').length;
  const warningCount = diagnostics.filter(d => d.severity === 'warning').length;
  const infoCount = diagnostics.filter(d => d.severity === 'info').length;

  // Calculate project health score
  const healthScore = Math.max(0, 100 - (errorCount * 25) - (warningCount * 10));

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0E0E12] overflow-y-auto p-4 md:p-8 select-none">
      <div className="max-w-4xl w-full mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Stethoscope className="w-5 h-5 text-[#E5222A]" />
              <h2 className="text-xl font-bold text-white tracking-tight">Project Doctor</h2>
            </div>
            <p className="text-xs text-[#A5A5B2]">
              Static diagnostics, syntax consistency, Android manifest audit, and dependency health.
            </p>
          </div>

          <button
            onClick={handleScan}
            disabled={isScanning}
            className="px-4 py-2 bg-[#E5222A] hover:bg-[#d01c24] disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-2 self-start sm:self-auto transition-all shadow-md shadow-[#E5222A]/20"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Scanning Project...' : 'Run Diagnostics'}</span>
          </button>
        </div>

        {/* Health Score & Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="bg-[#16161C] border border-[#262633] rounded-xl p-4 flex flex-col justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A5A5B2]">
              Health Score
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-white font-mono tabular-nums">
                {healthScore}%
              </span>
              <span className={`text-xs font-semibold ${healthScore > 80 ? 'text-[#86EFAC]' : 'text-[#FBBF24]'}`}>
                {healthScore === 100 ? 'Flawless' : healthScore > 75 ? 'Healthy' : 'Attention Needed'}
              </span>
            </div>
          </div>

          <div className="bg-[#16161C] border border-[#262633] rounded-xl p-4 flex flex-col justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A5A5B2]">
              Errors
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-[#F87171] font-mono tabular-nums">
                {errorCount}
              </span>
              <span className="text-xs text-[#A5A5B2]">critical</span>
            </div>
          </div>

          <div className="bg-[#16161C] border border-[#262633] rounded-xl p-4 flex flex-col justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A5A5B2]">
              Warnings
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-[#FBBF24] font-mono tabular-nums">
                {warningCount}
              </span>
              <span className="text-xs text-[#A5A5B2]">advisories</span>
            </div>
          </div>

          <div className="bg-[#16161C] border border-[#262633] rounded-xl p-4 flex flex-col justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A5A5B2]">
              Files Audited
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-[#F7F7FA] font-mono tabular-nums">
                {activeProject.files.length}
              </span>
              <span className="text-xs text-[#A5A5B2]">in project</span>
            </div>
          </div>
        </div>

        {/* Diagnostics Results List */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#A5A5B2]">
            Detailed Findings ({diagnostics.length})
          </h3>

          {diagnostics.length === 0 ? (
            <div className="bg-[#16161C] border border-[#22C55E]/20 rounded-xl p-8 text-center space-y-3">
              <ShieldCheck className="w-12 h-12 text-[#22C55E] mx-auto opacity-80" />
              <h4 className="text-base font-bold text-white">All Checks Passed</h4>
              <p className="text-xs text-[#A5A5B2] max-w-md mx-auto">
                No syntax anomalies, unbalanced brackets, or manifest violations found in {activeProject.name}.
              </p>
            </div>
          ) : (
            diagnostics.map((diag) => {
              const isError = diag.severity === 'error';
              const isWarning = diag.severity === 'warning';

              return (
                <div
                  key={diag.id}
                  className="bg-[#16161C] border border-[#262633] hover:border-[#38384A] rounded-xl p-4 transition-colors space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5">
                        {isError ? (
                          <AlertOctagon className="w-4 h-4 text-[#F87171]" />
                        ) : isWarning ? (
                          <AlertTriangle className="w-4 h-4 text-[#FBBF24]" />
                        ) : (
                          <Info className="w-4 h-4 text-[#67E8F9]" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-white">{diag.title}</h4>
                          <span
                            onClick={() => onNavigateToFile(diag.file)}
                            className="text-[11px] font-mono text-[#FF5E65] cursor-pointer hover:underline"
                          >
                            {diag.file}
                          </span>
                        </div>
                        <p className="text-xs text-[#A5A5B2] mt-1 leading-relaxed">
                          {diag.detail}
                        </p>
                      </div>
                    </div>

                    {/* AI Fix trigger */}
                    <button
                      onClick={() => onFixWithAi(diag)}
                      className="px-3 py-1.5 text-xs font-semibold bg-[#E5222A]/15 hover:bg-[#E5222A]/25 border border-[#E5222A]/40 text-[#FF5E65] rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#E5222A]" />
                      <span>Fix with AI</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
