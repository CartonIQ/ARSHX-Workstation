import { PROGRESS_VERSION, type Course, type Lesson, type Progress } from './types';

export const STORAGE_KEY = 'arshx.academy.progress';
const CORRUPT_KEY = 'arshx.academy.progress.corrupt';

export interface StorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}
export type SaveResult = { ok: true } | { ok: false; error: string };

export const emptyProgress = (): Progress => ({
  version: PROGRESS_VERSION, completed: {}, bookmarks: [], quizzes: {}, exercises: {}, resume: null,
});

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Convert any saved value into a valid current-version Progress. Never throws. */
export function migrate(raw: unknown): Progress {
  const base = emptyProgress();
  if (!isObj(raw)) return base;
  // Future migrations: switch on raw.version and upgrade step by step.
  const out = base;
  if (isObj(raw.completed)) for (const [k, v] of Object.entries(raw.completed)) if (typeof v === 'number') out.completed[k] = v;
  if (Array.isArray(raw.bookmarks)) out.bookmarks = raw.bookmarks.filter((x): x is string => typeof x === 'string');
  if (isObj(raw.quizzes)) for (const [k, v] of Object.entries(raw.quizzes)) {
    if (isObj(v) && typeof v.attempts === 'number' && typeof v.bestCorrect === 'number' && typeof v.total === 'number')
      out.quizzes[k] = { attempts: v.attempts, bestCorrect: v.bestCorrect, total: v.total,
        lastCorrect: typeof v.lastCorrect === 'number' ? v.lastCorrect : v.bestCorrect, at: typeof v.at === 'number' ? v.at : 0 };
  }
  if (isObj(raw.exercises)) for (const [k, v] of Object.entries(raw.exercises)) {
    if (isObj(v) && typeof v.attempts === 'number' && typeof v.passed === 'boolean')
      out.exercises[k] = { attempts: v.attempts, passed: v.passed, at: typeof v.at === 'number' ? v.at : 0 };
  }
  if (isObj(raw.resume) && typeof raw.resume.courseId === 'string' && typeof raw.resume.lessonId === 'string')
    out.resume = { courseId: raw.resume.courseId, lessonId: raw.resume.lessonId };
  return out;
}

export function loadProgress(storage: StorageLike | null): { progress: Progress; warning?: string } {
  if (!storage) return { progress: emptyProgress(), warning: 'Storage is unavailable. Progress will not be saved.' };
  let text: string | null;
  try { text = storage.getItem(STORAGE_KEY); } catch { return { progress: emptyProgress(), warning: 'Could not read saved progress.' }; }
  if (text === null) return { progress: emptyProgress() };
  try { return { progress: migrate(JSON.parse(text)) }; }
  catch {
    try { storage.setItem(CORRUPT_KEY, text); } catch { /* ignore */ }
    return { progress: emptyProgress(), warning: 'Saved progress was damaged. A copy was kept and a fresh start was made.' };
  }
}

/** Writes, then reads back to confirm. Reports failure honestly. */
export function saveProgress(storage: StorageLike | null, p: Progress): SaveResult {
  if (!storage) return { ok: false, error: 'Storage is unavailable.' };
  try {
    const text = JSON.stringify(p);
    storage.setItem(STORAGE_KEY, text);
    if (storage.getItem(STORAGE_KEY) !== text) return { ok: false, error: 'Saved data could not be verified.' };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Save failed.' };
  }
}

/** Only clears when confirmed === true. */
export function clearProgress(storage: StorageLike | null, confirmed: boolean): SaveResult {
  if (!confirmed) return { ok: false, error: 'Clearing needs confirmation.' };
  if (!storage) return { ok: false, error: 'Storage is unavailable.' };
  try { storage.removeItem(STORAGE_KEY); return { ok: true }; }
  catch (e) { return { ok: false, error: e instanceof Error ? e.message : 'Clear failed.' }; }
}

// ---- pure updates (return new Progress) ----
export const markComplete = (p: Progress, lessonId: string, now = Date.now()): Progress =>
  ({ ...p, completed: { ...p.completed, [lessonId]: now } });
export const markIncomplete = (p: Progress, lessonId: string): Progress => {
  const { [lessonId]: _drop, ...rest } = p.completed; return { ...p, completed: rest };
};
export const toggleBookmark = (p: Progress, lessonId: string): Progress =>
  ({ ...p, bookmarks: p.bookmarks.includes(lessonId) ? p.bookmarks.filter((b) => b !== lessonId) : [...p.bookmarks, lessonId] });
export const setResume = (p: Progress, courseId: string, lessonId: string): Progress => ({ ...p, resume: { courseId, lessonId } });
export const recordQuiz = (p: Progress, lessonId: string, correct: number, total: number, now = Date.now()): Progress => {
  const old = p.quizzes[lessonId];
  return { ...p, quizzes: { ...p.quizzes, [lessonId]: {
    attempts: (old?.attempts ?? 0) + 1, bestCorrect: Math.max(old?.bestCorrect ?? 0, correct), total, lastCorrect: correct, at: now } } };
};
export const recordExercise = (p: Progress, exerciseId: string, passed: boolean, now = Date.now()): Progress => {
  const old = p.exercises[exerciseId];
  return { ...p, exercises: { ...p.exercises, [exerciseId]: { attempts: (old?.attempts ?? 0) + 1, passed: passed || !!old?.passed, at: now } } };
};

// ---- derived data ----
export const courseLessons = (c: Course): Lesson[] => c.modules.flatMap((m) => m.lessons);

export function courseProgress(c: Course, p: Progress) {
  const ls = courseLessons(c);
  const done = ls.filter((l) => p.completed[l.id] !== undefined).length;
  return { done, total: ls.length, percent: ls.length ? Math.round((done / ls.length) * 100) : 0, finished: ls.length > 0 && done === ls.length };
}

/** Prerequisites are enforced only for courses that list them. */
export function unmetPrerequisites(c: Course, all: Course[], p: Progress): Course[] {
  return c.prerequisites.map((id) => all.find((x) => x.id === id)).filter((x): x is Course => !!x && !courseProgress(x, p).finished);
}

/** Study time derived from real content: ~180 words/min reading + quiz + exercises. */
export function estimateMinutes(l: Lesson): number {
  const words = [...l.body, ...l.rules, ...l.mistakes, ...l.debugTips, l.why, ...l.concepts.map((c) => c.definition),
    ...l.examples.flatMap((e) => e.lineByLine)].join(' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 180 + l.quiz.length * 0.5 + l.exercises.length * 3));
}

export function nextLesson(c: Course, lessonId: string): Lesson | null {
  const ls = courseLessons(c); const i = ls.findIndex((l) => l.id === lessonId); return i >= 0 && i < ls.length - 1 ? ls[i + 1] : null;
}
export function prevLesson(c: Course, lessonId: string): Lesson | null {
  const ls = courseLessons(c); const i = ls.findIndex((l) => l.id === lessonId); return i > 0 ? ls[i - 1] : null;
}
export function firstUnfinished(c: Course, p: Progress): Lesson | null {
  return courseLessons(c).find((l) => p.completed[l.id] === undefined) ?? null;
}
