import { Project, ProjectFile, Checkpoint, DoctorDiagnostic, FileLanguage } from '../types';
import { INITIAL_PROJECTS } from '../data/defaultProjects';
import { StorageEngine } from './storageEngine';
import { detectLanguage } from './syntax';

// Asynchronous project loader utilizing StorageEngine
export async function loadStoredProjects(): Promise<Project[]> {
  return await StorageEngine.loadProjects(INITIAL_PROJECTS);
}

// Synchronous loader fallback for immediate initial render
export function loadStoredProjectsSync(): Project[] {
  try {
    const raw = localStorage.getItem('arshx_projects_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return INITIAL_PROJECTS;
}

export async function saveProjects(projects: Project[]): Promise<void> {
  await StorageEngine.saveProjects(projects);
}

export async function loadCheckpoints(projectId: string): Promise<Checkpoint[]> {
  return await StorageEngine.loadCheckpoints(projectId);
}

export async function createCheckpoint(
  project: Project,
  message: string
): Promise<Checkpoint> {
  const commitHash = Math.random().toString(16).substring(2, 9);
  const checkpoint: Checkpoint = {
    id: `chk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    projectId: project.id,
    commitHash,
    message: message.trim() || `Checkpoint ${commitHash}`,
    timestamp: Date.now(),
    files: JSON.parse(JSON.stringify(project.files)),
  };

  await StorageEngine.saveCheckpoint(checkpoint);
  return checkpoint;
}

export async function exportProjectZip(project: Project): Promise<Blob> {
  return await StorageEngine.exportProjectZip(project);
}

export async function importProjectZip(file: File) {
  return await StorageEngine.importProjectZip(file);
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Structural Parser & Static Diagnostics Engine
export function runStaticDiagnostics(project: Project): DoctorDiagnostic[] {
  const diagnostics: DoctorDiagnostic[] = [];

  for (const file of project.files) {
    const lines = file.content.split('\n');

    // 1. Bracket & Quote Balance Check (excluding comments and string literals)
    let openCurly = 0;
    let openParen = 0;
    let openBracket = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // strip inline comments
      const cleanLine = line.replace(/\/\/.*$/, '').replace(/#.*$/, '');
      
      let inString = false;
      let quoteChar = '';

      for (let j = 0; j < cleanLine.length; j++) {
        const char = cleanLine[j];

        if ((char === '"' || char === "'") && cleanLine[j - 1] !== '\\') {
          if (!inString) {
            inString = true;
            quoteChar = char;
          } else if (char === quoteChar) {
            inString = false;
          }
          continue;
        }

        if (!inString) {
          if (char === '{') openCurly++;
          if (char === '}') openCurly--;
          if (char === '(') openParen++;
          if (char === ')') openParen--;
          if (char === '[') openBracket++;
          if (char === ']') openBracket--;
        }
      }
    }

    if (openCurly !== 0) {
      diagnostics.push({
        id: `diag-curly-${file.id}`,
        file: file.name,
        category: 'syntax',
        severity: 'error',
        title: 'Unbalanced Curly Brackets',
        detail: `Found ${openCurly > 0 ? `${openCurly} unclosed '{'` : `${Math.abs(openCurly)} extra '}'`} in ${file.name}.`,
        fixable: true,
        isHeuristic: false,
      });
    }

    if (openParen !== 0) {
      diagnostics.push({
        id: `diag-paren-${file.id}`,
        file: file.name,
        category: 'syntax',
        severity: 'warning',
        title: 'Unbalanced Parentheses',
        detail: `Detected ${openParen > 0 ? `${openParen} unclosed '('` : `${Math.abs(openParen)} extra ')'`} in ${file.name}.`,
        fixable: true,
        isHeuristic: false,
      });
    }

    // 2. Empty source files
    if (file.content.trim().length === 0) {
      diagnostics.push({
        id: `diag-empty-${file.id}`,
        file: file.name,
        category: 'syntax',
        severity: 'warning',
        title: 'Empty File Buffer',
        detail: `The file ${file.name} is currently empty.`,
        fixable: false,
        isHeuristic: true,
      });
    }

    // 3. AndroidManifest.xml Structural & Security Validation
    if (file.name.toLowerCase().endsWith('androidmanifest.xml') || file.path.includes('AndroidManifest.xml')) {
      if (!file.content.includes('<manifest')) {
        diagnostics.push({
          id: `diag-manifest-root-${file.id}`,
          file: file.name,
          category: 'manifest',
          severity: 'error',
          title: 'Missing Root <manifest> Tag',
          detail: 'AndroidManifest.xml must declare an enclosing <manifest> tag.',
          fixable: true,
          isHeuristic: false,
        });
      }

      if (!file.content.includes('android:exported=')) {
        diagnostics.push({
          id: `diag-manifest-exported-${file.id}`,
          file: file.name,
          category: 'security',
          severity: 'error',
          title: 'Missing android:exported Attribute',
          detail: 'Android 12+ (SDK 31+) strictly requires explicit android:exported on activities containing intent-filters.',
          fixable: true,
          isHeuristic: false,
        });
      }

      if (!file.content.includes('android:name=".MainActivity"')) {
        diagnostics.push({
          id: `diag-manifest-activity-${file.id}`,
          file: file.name,
          category: 'architecture',
          severity: 'warning',
          title: 'Missing MainActivity Launcher Declaration',
          detail: 'No .MainActivity entry point found with MAIN/LAUNCHER filter.',
          fixable: true,
          isHeuristic: true,
        });
      }
    }

    // 4. Gradle KTS Validation
    if (file.name.endsWith('.gradle.kts')) {
      if (!file.content.includes('compileSdk = 35') && !file.content.includes('compileSdk = 34')) {
        diagnostics.push({
          id: `diag-gradle-sdk-${file.id}`,
          file: file.name,
          category: 'dependency',
          severity: 'info',
          title: 'Target SDK Advisory',
          detail: 'Modern Android 15 compatibility requires compileSdk = 35.',
          fixable: true,
          isHeuristic: true,
        });
      }
    }

    // 5. HTML5 Validation
    if (file.language === 'html') {
      if (!file.content.toLowerCase().includes('<!doctype html>')) {
        diagnostics.push({
          id: `diag-html-doctype-${file.id}`,
          file: file.name,
          category: 'syntax',
          severity: 'info',
          title: 'Missing Standard HTML5 Doctype',
          detail: 'Add <!DOCTYPE html> to ensure standard-mode layout engine rendering.',
          fixable: true,
          isHeuristic: false,
        });
      }
    }
  }

  return diagnostics;
}

export function createNewFile(name: string, path: string): ProjectFile {
  const language = detectLanguage(name);
  let initialContent = '';

  switch (language) {
    case 'kotlin':
      initialContent = `package com.arshx\n\n// ARSHX Kotlin Module\nfun initModule() {\n    println("Module active")\n}\n`;
      break;
    case 'typescript':
    case 'javascript':
      initialContent = `// ${name}\nexport function execute() {\n  console.log("Executed from ARSHX Workstation");\n}\n`;
      break;
    case 'html':
      initialContent = `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${name}</title>\n</head>\n<body>\n  <h1>${name}</h1>\n</body>\n</html>\n`;
      break;
    case 'css':
      initialContent = `/* Styles for ${name} */\nbody {\n  background: #111114;\n  color: #F7F7FA;\n}\n`;
      break;
    case 'json':
      initialContent = `{\n  "name": "${name}",\n  "version": "1.0.0"\n}\n`;
      break;
    case 'shell':
      initialContent = `#!/bin/bash\nset -e\necho "Running ${name}..."\n`;
      break;
    default:
      initialContent = `# ${name}\n`;
  }

  return {
    id: `f-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name,
    path: path.startsWith('/') ? path.substring(1) : path,
    language,
    content: initialContent,
    updatedAt: Date.now(),
    isDirty: false,
  };
}
