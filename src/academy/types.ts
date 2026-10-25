// ARSHX Academy - curriculum and progress types.
// Curriculum data (content) is kept separate from progress data (learner history).

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type Category =
  | 'fundamentals' | 'web' | 'android' | 'scripting' | 'databases' | 'systems';
/** 'in-progress' = course exists but not every planned topic is written yet. */
export type CourseStatus = 'complete' | 'in-progress';

export interface CodeExample {
  id: string;
  title: string;
  language: string; // e.g. "Python 3"
  code: string;
  /** One entry per explained line/step, in order. */
  lineByLine: string[];
  expectedOutput?: string;
  /** false = an example of a MISTAKE, shown so learners can recognise it. */
  correct: boolean;
  note?: string;
}

export interface Concept { term: string; definition: string }

export type QuizQuestion =
  | { kind: 'single'; id: string; prompt: string; options: { id: string; text: string }[];
      answerId: string; explanation: string; wrongExplanations?: Record<string, string> }
  | { kind: 'multi'; id: string; prompt: string; options: { id: string; text: string }[];
      answerIds: string[]; explanation: string }
  | { kind: 'truefalse'; id: string; prompt: string; answer: boolean; explanation: string }
  | { kind: 'fill'; id: string; prompt: string; acceptedAnswers: string[];
      caseSensitive?: boolean; explanation: string };

export type QuizAnswer = string | string[] | boolean;

/** How an exercise is checked. None of these methods runs learner code. */
export type ExerciseMethod = 'output-comparison' | 'static-validation' | 'code-tracing' | 'knowledge-check';

export interface StaticRule {
  id: string;
  description: string;
  kind: 'matches' | 'not-matches';
  pattern: string; // regular expression source
  flags?: string;
  failMessage: string;
}

export interface Exercise {
  id: string;
  title: string;
  method: ExerciseMethod;
  description: string;
  requirements: string[];
  language?: string;
  /** code-tracing: code shown to the learner. static-validation: starter text. */
  code?: string;
  /** code-tracing / output-comparison: exact text the learner must produce. */
  expectedOutput?: string;
  rules?: StaticRule[];
  hints: string[];
  explanation: string; // shown after submit
}

export interface Lesson {
  id: string;
  title: string;
  version: number;
  summary: string;
  concepts: Concept[];
  why: string;
  body: string[];
  rules: string[];
  examples: CodeExample[];
  mistakes: string[];
  debugTips: string[];
  quiz: QuizQuestion[];
  exercises: Exercise[];
  related: string[]; // lesson ids
}

export interface Module { id: string; title: string; lessons: Lesson[] }

export interface Course {
  id: string;
  version: number;
  title: string;
  description: string;
  category: Category;
  difficulty: Difficulty;
  status: CourseStatus;
  /** Honest note about what is NOT yet covered. */
  coverageNote?: string;
  prerequisites: string[]; // course ids that must be fully completed first
  modules: Module[];
}

// ---------- Progress (learner data) ----------
export const PROGRESS_VERSION = 1;

export interface QuizRecord { attempts: number; bestCorrect: number; total: number; lastCorrect: number; at: number }
export interface ExerciseRecord { attempts: number; passed: boolean; at: number }

export interface Progress {
  version: number;
  completed: Record<string, number>;     // lessonId -> time
  bookmarks: string[];                   // lessonIds
  quizzes: Record<string, QuizRecord>;   // lessonId -> record
  exercises: Record<string, ExerciseRecord>; // exerciseId -> record
  resume: { courseId: string; lessonId: string } | null;
}
