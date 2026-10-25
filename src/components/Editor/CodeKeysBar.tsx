import React from 'react';
import { FileLanguage } from '../../types';

interface CodeKeysBarProps {
  onInsert: (text: string) => void;
  language: FileLanguage;
}

export const CodeKeysBar: React.FC<CodeKeysBarProps> = ({ onInsert, language }) => {
  // Tailored keys depending on language
  const commonSymbols = ['{', '}', '(', ')', '[', ']', ';', '=', ':', '"', "'", '`', '$', '.', ',', '<', '>', '/', '_'];

  const languageKeywords = language === 'kotlin'
    ? ['fun', 'val', 'var', 'class', 'remember', 'return', 'if', 'else', 'Modifier', 'Row', 'Column', 'Box', 'Text', 'Spacer']
    : language === 'typescript' || language === 'javascript'
    ? ['const', 'let', 'function', 'return', 'async', 'await', 'import', 'export', '=>', 'null', 'true', 'false']
    : language === 'python'
    ? ['def', 'class', 'return', 'import', 'from', 'if', 'elif', 'else', 'for', 'in', 'None']
    : ['TAB', 'echo', 'run', 'build', 'gradle', 'termux'];

  return (
    <div className="h-10 bg-[#16161B] border-t border-[#24242C] px-2 flex items-center gap-1 overflow-x-auto select-none no-scrollbar shrink-0">
      {/* Indentation / Tab Action */}
      <button
        type="button"
        onClick={() => onInsert('    ')}
        className="px-2.5 py-1 text-xs font-mono font-semibold bg-[#24242C] text-[#F7F7FA] hover:bg-[#2F2F3B] active:scale-95 rounded transition-all shrink-0"
        title="Insert 4-space Tab"
      >
        TAB
      </button>

      <div className="w-[1px] h-4 bg-[#2D2D38] mx-1 shrink-0" />

      {/* Primary Brackets & Operators */}
      {commonSymbols.map((sym) => (
        <button
          key={sym}
          type="button"
          onClick={() => onInsert(sym)}
          className="min-w-[28px] h-7 px-1.5 flex items-center justify-center text-xs font-mono font-bold bg-[#1D1D24] text-[#F7F7FA] hover:bg-[#E5222A]/20 hover:text-[#FF5E65] active:scale-90 rounded transition-all shrink-0 border border-[#272733]"
        >
          {sym}
        </button>
      ))}

      <div className="w-[1px] h-4 bg-[#2D2D38] mx-1 shrink-0" />

      {/* Contextual Keywords */}
      {languageKeywords.map((kw) => (
        <button
          key={kw}
          type="button"
          onClick={() => onInsert(kw + ' ')}
          className="h-7 px-2 flex items-center justify-center text-[11px] font-mono font-medium bg-[#1F1F28] text-[#A5A5B2] hover:text-white hover:bg-[#2A2A38] active:scale-95 rounded transition-all shrink-0 border border-[#2A2A38]"
        >
          {kw}
        </button>
      ))}
    </div>
  );
};
