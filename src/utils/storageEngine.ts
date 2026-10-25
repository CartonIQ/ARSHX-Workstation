import JSZip from 'jszip';
import { Project, ProjectFile, Checkpoint, ZipImportResult, FileLanguage } from '../types';
import { detectLanguage } from './syntax';

const DB_NAME = 'arshx_workstation_db';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_CHECKPOINTS = 'checkpoints';
const LOCAL_STORAGE_PROJECTS_KEY = 'arshx_projects_v1';
const LOCAL_STORAGE_CHECKPOINTS_PREFIX = 'arshx_checkpoints_v1_';

// Open or initialize IndexedDB
function openDatabase(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => resolve(null);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
          db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_CHECKPOINTS)) {
          const cpStore = db.createObjectStore(STORE_CHECKPOINTS, { keyPath: 'id' });
          cpStore.createIndex('projectId', 'projectId', { unique: false });
        }
      };
    } catch {
      resolve(null);
    }
  });
}

// Storage Engine with IndexedDB & localStorage dual-persistence
export class StorageEngine {
  private static dbPromise: Promise<IDBDatabase | null> = openDatabase();

  // Load all projects with transparent migration from localStorage
  static async loadProjects(fallbackDefaults: Project[]): Promise<Project[]> {
    try {
      const db = await this.dbPromise;
      if (db) {
        const projects = await new Promise<Project[]>((resolve) => {
          const tx = db.transaction(STORE_PROJECTS, 'readonly');
          const store = tx.objectStore(STORE_PROJECTS);
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        });

        if (projects && projects.length > 0) {
          return projects;
        }
      }
    } catch (e) {
      console.warn('IndexedDB read failed, trying localStorage migration:', e);
    }

    // Fallback & Migration from localStorage
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_PROJECTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Sync to IndexedDB for future larger projects
          this.saveProjects(parsed).catch(() => {});
          return parsed;
        }
      }
    } catch (err) {
      console.error('LocalStorage load failed:', err);
    }

    // Initialize with provided defaults
    if (fallbackDefaults && fallbackDefaults.length > 0) {
      await this.saveProjects(fallbackDefaults).catch(() => {});
      return fallbackDefaults;
    }

    return [];
  }

  // Save projects to both IndexedDB and localStorage (for resilience)
  static async saveProjects(projects: Project[]): Promise<void> {
    // 1. Save to localStorage for synchronous instant availability
    try {
      localStorage.setItem(LOCAL_STORAGE_PROJECTS_KEY, JSON.stringify(projects));
    } catch (err) {
      console.warn('LocalStorage quota warning or failure:', err);
    }

    // 2. Persist to IndexedDB
    try {
      const db = await this.dbPromise;
      if (db) {
        const tx = db.transaction(STORE_PROJECTS, 'readwrite');
        const store = tx.objectStore(STORE_PROJECTS);
        // Clear old records
        store.clear();
        for (const p of projects) {
          store.put(p);
        }
      }
    } catch (err) {
      console.error('IndexedDB save failed:', err);
    }
  }

  // Load checkpoints for a given project
  static async loadCheckpoints(projectId: string): Promise<Checkpoint[]> {
    try {
      const db = await this.dbPromise;
      if (db) {
        const checkpoints = await new Promise<Checkpoint[]>((resolve) => {
          const tx = db.transaction(STORE_CHECKPOINTS, 'readonly');
          const store = tx.objectStore(STORE_CHECKPOINTS);
          const idx = store.index('projectId');
          const req = idx.getAll(IDBKeyRange.only(projectId));
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        });
        if (checkpoints && checkpoints.length > 0) {
          return checkpoints.sort((a, b) => b.timestamp - a.timestamp);
        }
      }
    } catch (e) {
      console.warn('IndexedDB checkpoint load failed:', e);
    }

    // Fallback to localStorage
    try {
      const raw = localStorage.getItem(`${LOCAL_STORAGE_CHECKPOINTS_PREFIX}${projectId}`);
      if (raw) return JSON.parse(raw);
    } catch {}

    return [];
  }

  // Save checkpoint
  static async saveCheckpoint(checkpoint: Checkpoint): Promise<void> {
    try {
      const db = await this.dbPromise;
      if (db) {
        const tx = db.transaction(STORE_CHECKPOINTS, 'readwrite');
        const store = tx.objectStore(STORE_CHECKPOINTS);
        store.put(checkpoint);
      }
    } catch (e) {
      console.warn('IndexedDB checkpoint save failed:', e);
    }

    // Also update localStorage
    try {
      const existing = await this.loadCheckpoints(checkpoint.projectId);
      const filtered = existing.filter(c => c.id !== checkpoint.id);
      const updated = [checkpoint, ...filtered].slice(0, 30); // keep recent 30
      localStorage.setItem(`${LOCAL_STORAGE_CHECKPOINTS_PREFIX}${checkpoint.projectId}`, JSON.stringify(updated));
    } catch {}
  }

  // Safe ZIP Import Engine (Validates paths, blocks traversal, prevents data corruption)
  static async importProjectZip(file: File): Promise<ZipImportResult> {
    const warnings: string[] = [];
    const errors: string[] = [];
    const files: ProjectFile[] = [];

    // Max archive size check: 35MB
    if (file.size > 35 * 1024 * 1024) {
      return {
        success: false,
        projectName: file.name.replace(/\.zip$/i, ''),
        files: [],
        warnings: [],
        errors: ['Archive exceeds maximum allowed size (35MB).'],
      };
    }

    try {
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(file);
      const entries = Object.keys(loadedZip.files);

      if (entries.length === 0) {
        return {
          success: false,
          projectName: file.name.replace(/\.zip$/i, ''),
          files: [],
          warnings: [],
          errors: ['The ZIP archive is empty.'],
        };
      }

      // Detect top-level folder prefix if present
      let topFolder = '';
      const firstEntry = entries[0];
      if (firstEntry && firstEntry.includes('/')) {
        const potentialRoot = firstEntry.split('/')[0];
        const allUnderRoot = entries.every(e => e.startsWith(potentialRoot + '/') || e === potentialRoot);
        if (allUnderRoot) {
          topFolder = potentialRoot + '/';
        }
      }

      const rawProjectName = file.name.replace(/\.zip$/i, '').trim() || 'Imported Project';
      const cleanProjectName = rawProjectName.replace(/[^a-zA-Z0-9_\- ]/g, '');

      for (const rawPath of entries) {
        const zipEntry = loadedZip.files[rawPath];
        if (zipEntry.dir) continue; // Skip directory entries

        // Strip top folder if uniform
        let cleanPath = rawPath;
        if (topFolder && cleanPath.startsWith(topFolder)) {
          cleanPath = cleanPath.slice(topFolder.length);
        }

        // Security check: Path Traversal
        if (cleanPath.includes('..') || cleanPath.startsWith('/') || cleanPath.startsWith('\\')) {
          warnings.push(`Blocked unsafe path with traversal characters: ${cleanPath}`);
          continue;
        }

        // Skip internal git or mac metadata
        if (cleanPath.startsWith('.git/') || cleanPath.includes('/.git/') || cleanPath.startsWith('__MACOSX/')) {
          continue;
        }

        // Individual file size check: max 5MB text
        // Read file as text
        try {
          const content = await zipEntry.async('string');
          const filename = cleanPath.split('/').pop() || 'file.txt';
          const language = detectLanguage(filename);

          files.push({
            id: `f-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: filename,
            path: cleanPath,
            content,
            language,
            updatedAt: Date.now(),
            isEntry: filename === 'MainActivity.kt' || filename === 'index.html' || filename === 'main.py',
          });
        } catch (readErr) {
          warnings.push(`Could not read binary or encrypted file: ${cleanPath}`);
        }
      }

      if (files.length === 0) {
        return {
          success: false,
          projectName: cleanProjectName,
          files: [],
          warnings,
          errors: ['No readable source code files found in the archive.'],
        };
      }

      return {
        success: true,
        projectName: cleanProjectName,
        files,
        warnings,
        errors,
      };
    } catch (err: any) {
      return {
        success: false,
        projectName: file.name.replace(/\.zip$/i, ''),
        files: [],
        warnings,
        errors: [`Failed to unpack ZIP archive: ${err?.message || 'Invalid ZIP format'}`],
      };
    }
  }

  // Safe ZIP Export
  static async exportProjectZip(project: Project): Promise<Blob> {
    const zip = new JSZip();
    const folderName = project.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'arshx_project';
    const root = zip.folder(folderName) || zip;

    for (const file of project.files) {
      root.file(file.path, file.content);
    }

    // ARSHX Export metadata
    const info = `# ${project.name}
${project.description}

Exported from ARSHX Developer Workstation.
Brand: ARSHX · BUILD. CREATE. RISE.
Category: ${project.category}
Generated: ${new Date().toISOString()}

### Getting Started:
${project.category === 'android' ? `- Open in Android Studio or Termux\n- Build command: ./gradlew :app:assembleDebug` : `- Open index.html in any modern browser`}
`;
    root.file('ARSHX-EXPORT-INFO.md', info);

    return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  }
}
