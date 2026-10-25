import { Project, ProjectFile } from '../types';
import { createNewFile } from './fileSystem';

export interface IncomingFile {
  path: string;
  content: string;
}

export interface MergeResult {
  project: Project;
  updated: number;
  added: number;
}

/** Normalises a shell-side relative path to the project's path form. */
export function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '');
}

/**
 * Merges files read back from the shell into the project: changed files are
 * updated in place (ids preserved so editor tabs stay valid), unknown files are
 * added. Files deleted in the shell are NOT removed from the project, so a
 * stray `rm` can never silently destroy work; the caller reports this.
 */
export function mergeShellFiles(project: Project, incoming: IncomingFile[]): MergeResult {
  const byPath = new Map<string, ProjectFile>();
  project.files.forEach((f) => byPath.set(normalizePath(f.path), f));

  let updated = 0;
  let added = 0;
  const files = [...project.files];
  const now = Date.now();

  for (const inc of incoming) {
    const path = normalizePath(inc.path);
    if (!path || path.split('/').includes('..')) continue;
    const existing = byPath.get(path);
    if (existing) {
      if (existing.content !== inc.content) {
        const idx = files.findIndex((f) => f.id === existing.id);
        files[idx] = { ...existing, content: inc.content, updatedAt: now };
        updated++;
      }
    } else {
      const name = path.split('/').pop() || path;
      const created = createNewFile(name, path);
      files.push({ ...created, content: inc.content, updatedAt: now });
      added++;
    }
  }

  if (updated === 0 && added === 0) return { project, updated, added };
  return { project: { ...project, files, updatedAt: now }, updated, added };
}
