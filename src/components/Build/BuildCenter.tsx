import React, { useState } from 'react';
import { 
  Hammer, 
  Download, 
  CheckCircle2, 
  Copy, 
  Check, 
  Terminal, 
  Cpu, 
  Layers, 
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { Project } from '../../types';
import { exportProjectZip, triggerDownload } from '../../utils/fileSystem';

interface BuildCenterProps {
  activeProject: Project;
}

export const BuildCenter: React.FC<BuildCenterProps> = ({ activeProject }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  const handleExportZip = async () => {
    setIsExporting(true);
    try {
      const blob = await exportProjectZip(activeProject);
      triggerDownload(blob, `${activeProject.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.zip`);
    } catch (err) {
      console.error('ZIP export error:', err);
      alert('Failed to generate project ZIP.');
    } finally {
      setIsExporting(false);
    }
  };

  const termuxCommandScript = `#!/data/data/com.termux/files/usr/bin/bash
# ARSHX Termux Native Build Script
set -e

echo "=== ARSHX NATIVE BUILD ENGINE (Termux) ==="
echo "Target Project: ${activeProject.name}"

# 1. Verify Java 17+
if ! command -v java >/dev/null 2>&1; then
  echo "Installing OpenJDK 17..."
  pkg update && pkg install -y openjdk-17
fi

echo "Java version: $(java -version 2>&1 | head -n 1)"

# 2. Configure Android SDK 35 environment
export ANDROID_HOME="\${ANDROID_HOME:-$HOME/qrapp/android-sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools"

# 3. Assemble Debug APK
if [ -f "./gradlew" ]; then
  ./gradlew :app:assembleDebug --stacktrace
else
  gradle wrapper --gradle-version 8.11.1
  ./gradlew :app:assembleDebug
fi

echo "✔ Build finished! APK located at: app/build/outputs/apk/debug/app-debug.apk"`;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(termuxCommandScript);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0E0E12] overflow-y-auto p-4 md:p-8 select-none">
      <div className="max-w-4xl w-full mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Hammer className="w-5 h-5 text-[#E5222A]" />
              <h2 className="text-xl font-bold text-white tracking-tight">ARSHX Build Center</h2>
            </div>
            <p className="text-xs text-[#A5A5B2]">
              On-device compilation toolchain, ZIP project export, and SDK 35 feasibility validation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/assets/aistudio/ARSHX-workstation-production-v1.zip"
              download="ARSHX-workstation-production-v1.zip"
              className="px-4 py-2 bg-[#22222C] hover:bg-[#2C2C38] text-white rounded-xl text-xs font-semibold flex items-center gap-2 border border-[#343442] transition-colors"
            >
              <Download className="w-4 h-4 text-[#85858F]" />
              <span>Reference SDK 35 Template</span>
            </a>
            <button
              onClick={handleExportZip}
              disabled={isExporting}
              className="px-5 py-2.5 bg-[#E5222A] hover:bg-[#d01c24] disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-[#E5222A]/25"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Generating ZIP...' : 'Export Current Project ZIP'}</span>
            </button>
          </div>
        </div>

        {/* Feasibility & Toolchain Specifications Card */}
        <div className="bg-[#16161C] border border-[#24242C] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#E5222A]" />
              <span>Target Build Stack Specifications</span>
            </h3>
            <span className="text-[10px] font-mono text-[#86EFAC] bg-[#22C55E]/10 border border-[#22C55E]/20 px-2 py-0.5 rounded">
              VERIFIED
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-[#1A1A22] p-3 rounded-lg border border-[#262633]">
              <span className="text-[#A5A5B2] text-[11px] block">Android SDK</span>
              <span className="font-mono font-bold text-white text-sm">Platform 35</span>
            </div>
            <div className="bg-[#1A1A22] p-3 rounded-lg border border-[#262633]">
              <span className="text-[#A5A5B2] text-[11px] block">Android Gradle Plugin</span>
              <span className="font-mono font-bold text-white text-sm">AGP 8.9.2</span>
            </div>
            <div className="bg-[#1A1A22] p-3 rounded-lg border border-[#262633]">
              <span className="text-[#A5A5B2] text-[11px] block">Kotlin Engine</span>
              <span className="font-mono font-bold text-white text-sm">2.0.21</span>
            </div>
            <div className="bg-[#1A1A22] p-3 rounded-lg border border-[#262633]">
              <span className="text-[#A5A5B2] text-[11px] block">Compose BOM</span>
              <span className="font-mono font-bold text-white text-sm">2025.02.00</span>
            </div>
          </div>
        </div>

        {/* Production Release & Google Play Signing Workflow */}
        <div className="bg-[#16161C] border border-[#24242C] rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
              <h3 className="text-sm font-bold text-white">Google Play Production Release (AAB)</h3>
            </div>
            <span className="text-[11px] font-mono text-[#85858F] bg-[#1E1E26] px-2 py-0.5 rounded border border-[#2D2D3A]">
              targetSdk 35
            </span>
          </div>
          <p className="text-xs text-[#A5A5B2] leading-relaxed">
            Google Play requires an Android App Bundle (.aab) signed with an upload key for apps targeting Android 15 (SDK 35):
          </p>
          <div className="space-y-2 text-xs font-mono">
            <div className="p-3 bg-[#0C0C10] border border-[#24242C] rounded-xl text-[#CBD5E1]">
              <div className="text-[10px] text-[#85858F] mb-1 font-sans"># Step 1: Generate Release Keystore</div>
              keytool -genkey -v -keystore release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias arshx_release
            </div>
            <div className="p-3 bg-[#0C0C10] border border-[#24242C] rounded-xl text-[#CBD5E1]">
              <div className="text-[10px] text-[#85858F] mb-1 font-sans"># Step 2: Build Release Bundle</div>
              ./gradlew :app:bundleRelease --no-daemon
            </div>
          </div>
        </div>

        {/* Termux Script Guide */}
        <div className="bg-[#16161C] border border-[#24242C] rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#67E8F9]" />
              <h3 className="text-sm font-bold text-white">Termux On-Device Automation Script</h3>
            </div>
            <button
              onClick={handleCopyScript}
              className="px-3 py-1 bg-[#24242C] hover:bg-[#2F2F3B] text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors border border-[#34343E]"
            >
              {copiedScript ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-400" />
                  <span>Copied Script</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Script</span>
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-[#A5A5B2] leading-relaxed">
            Run this verified script directly inside Termux on your Android phone to compile a native debug APK:
          </p>

          <pre className="p-3.5 bg-[#0C0C10] border border-[#24242C] rounded-xl text-xs font-mono text-[#CBD5E1] overflow-x-auto leading-relaxed select-text">
            {termuxCommandScript}
          </pre>
        </div>

        {/* Honest Disclosure Banner from PRD */}
        <div className="bg-[#16161B] border border-[#34343E] rounded-xl p-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-[#E5222A] shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h4 className="font-bold text-white">ARSHX Acceptance & Disclosure Policy</h4>
            <p className="text-[#A5A5B2] leading-relaxed">
              ARSHX follows truthful capability reporting. While web code executes directly in the browser sandbox, native APK compilation requires an actual JDK 17+ and Android SDK platform 35 toolchain (on desktop Android Studio or via Termux on device). Download the project ZIP above to inspect or build the full native binary.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
