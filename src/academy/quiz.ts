import type { QuizAnswer, QuizQuestion } from './types';

export function isCorrect(q: QuizQuestion, a: QuizAnswer | undefined): boolean {
  if (a === undefined) return false;
  switch (q.kind) {
    case 'single': return a === q.answerId;
    case 'truefalse': return a === q.answer;
    case 'multi': {
      if (!Array.isArray(a)) return false;
      const got = [...new Set(a)].sort();
      const want = [...q.answerIds].sort();
      return got.length === want.length && got.every((v, i) => v === want[i]);
    }
    case 'fill': {
      if (typeof a !== 'string') return false;
      const norm = (s: string) => (q.caseSensitive ? s.trim() : s.trim().toLowerCase());
      return q.acceptedAnswers.some((x) => norm(x) === norm(a));
    }
  }
}

export interface QuizResult {
  correct: number; total: number; percent: number;
  perQuestion: { id: string; correct: boolean }[];
}

export function scoreQuiz(questions: QuizQuestion[], answers: Record<string, QuizAnswer>): QuizResult {
  const perQuestion = questions.map((q) => ({ id: q.id, correct: isCorrect(q, answers[q.id]) }));
  const correct = perQuestion.filter((p) => p.correct).length;
  const total = questions.length;
  return { correct, total, percent: total === 0 ? 0 : Math.round((correct / total) * 100), perQuestion };
}
