import { FileLanguage } from '../types';

export function detectLanguage(filename: string): FileLanguage {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'kt':
    case 'kts':
      return 'kotlin';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'jsx':
    case 'mjs':
      return 'javascript';
    case 'html':
    case 'htm':
      return 'html';
    case 'css':
      return 'css';
    case 'json':
      return 'json';
    case 'md':
      return 'markdown';
    case 'py':
      return 'python';
    case 'sh':
    case 'bash':
      return 'shell';
    case 'xml':
      return 'xml';
    default:
      return 'plaintext';
  }
}

export function getLanguageLabel(lang: FileLanguage): string {
  switch (lang) {
    case 'kotlin':
      return 'Kotlin';
    case 'typescript':
      return 'TypeScript';
    case 'javascript':
      return 'JavaScript';
    case 'html':
      return 'HTML5';
    case 'css':
      return 'CSS3';
    case 'json':
      return 'JSON';
    case 'markdown':
      return 'Markdown';
    case 'python':
      return 'Python';
    case 'shell':
      return 'Bash/Shell';
    case 'xml':
      return 'XML';
    default:
      return 'Plain Text';
  }
}

export interface HighlightedToken {
  type: 'keyword' | 'string' | 'number' | 'comment' | 'function' | 'type' | 'tag' | 'attribute' | 'operator' | 'text';
  text: string;
}

// Tokenizer for code rendering
export function tokenizeCode(code: string, language: FileLanguage): HighlightedToken[][] {
  const lines = code.split('\n');

  const kotlinKeywords = new Set([
    'package', 'import', 'class', 'interface', 'object', 'fun', 'val', 'var', 'private', 'public',
    'protected', 'internal', 'return', 'if', 'else', 'when', 'for', 'while', 'do', 'break', 'continue',
    'this', 'super', 'override', 'companion', 'data', 'sealed', 'enum', 'by', 'remember', 'mutableStateOf',
    'null', 'true', 'false', 'is', 'in', 'as', 'try', 'catch', 'finally', 'throw'
  ]);

  const jsKeywords = new Set([
    'import', 'export', 'default', 'from', 'const', 'let', 'var', 'function', 'return', 'if', 'else',
    'for', 'while', 'switch', 'case', 'break', 'continue', 'new', 'this', 'async', 'await', 'try',
    'catch', 'finally', 'throw', 'typeof', 'instanceof', 'void', 'class', 'extends', 'super', 'interface',
    'type', 'null', 'undefined', 'true', 'false'
  ]);

  const pythonKeywords = new Set([
    'def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'import', 'from', 'as',
    'try', 'except', 'finally', 'with', 'lambda', 'yield', 'pass', 'break', 'continue',
    'True', 'False', 'None', 'and', 'or', 'not', 'is', 'in'
  ]);

  return lines.map((line) => {
    const tokens: HighlightedToken[] = [];
    let i = 0;

    // Check for comment line
    const trimmed = line.trimStart();
    if (trimmed.startsWith('//') || trimmed.startsWith('#')) {
      tokens.push({ type: 'comment', text: line });
      return tokens;
    }

    let buffer = '';

    const flushBuffer = () => {
      if (!buffer) return;
      const word = buffer;
      buffer = '';

      if (/^\d+(\.\d+)?$/.test(word)) {
        tokens.push({ type: 'number', text: word });
      } else if (
        (language === 'kotlin' && kotlinKeywords.has(word)) ||
        ((language === 'typescript' || language === 'javascript') && jsKeywords.has(word)) ||
        (language === 'python' && pythonKeywords.has(word))
      ) {
        tokens.push({ type: 'keyword', text: word });
      } else if (/^[A-Z][a-zA-Z0-9_]*$/.test(word)) {
        tokens.push({ type: 'type', text: word });
      } else {
        tokens.push({ type: 'text', text: word });
      }
    };

    while (i < line.length) {
      const char = line[i];

      // Inline comments //
      if (char === '/' && line[i + 1] === '/') {
        flushBuffer();
        tokens.push({ type: 'comment', text: line.slice(i) });
        break;
      }

      // Strings " or ' or `
      if (char === '"' || char === "'" || char === '`') {
        flushBuffer();
        const quote = char;
        let str = quote;
        i++;
        while (i < line.length && line[i] !== quote) {
          if (line[i] === '\\' && i + 1 < line.length) {
            str += line[i] + line[i + 1];
            i += 2;
          } else {
            str += line[i];
            i++;
          }
        }
        if (i < line.length) {
          str += line[i];
          i++;
        }
        tokens.push({ type: 'string', text: str });
        continue;
      }

      // XML / HTML tags <tag>
      if ((language === 'html' || language === 'xml') && char === '<') {
        flushBuffer();
        let tagStr = '<';
        i++;
        while (i < line.length && line[i] !== '>') {
          tagStr += line[i];
          i++;
        }
        if (i < line.length) {
          tagStr += '>';
          i++;
        }
        tokens.push({ type: 'tag', text: tagStr });
        continue;
      }

      // Word boundary
      if (/[a-zA-Z0-9_]/.test(char)) {
        buffer += char;
        i++;
      } else {
        flushBuffer();
        if ('+-*/=<>!&|%:?~^'.includes(char)) {
          tokens.push({ type: 'operator', text: char });
        } else {
          tokens.push({ type: 'text', text: char });
        }
        i++;
      }
    }
    flushBuffer();

    return tokens;
  });
}

// Token color mapping using ARSHX palette
export function getTokenClass(type: HighlightedToken['type']): string {
  switch (type) {
    case 'keyword':
      return 'text-[#FF4A53] font-semibold';
    case 'string':
      return 'text-[#86EFAC]';
    case 'number':
      return 'text-[#FBBF24]';
    case 'comment':
      return 'text-[#6B7280] italic';
    case 'type':
      return 'text-[#67E8F9]';
    case 'function':
      return 'text-[#93C5FD]';
    case 'tag':
      return 'text-[#F43F5E]';
    case 'operator':
      return 'text-[#E2E8F0]';
    default:
      return 'text-[#F1F1F5]';
  }
}
