import type { Exercise } from './types';

export interface CheckResult { id: string; description: string; passed: boolean; message: string }
export interface ExerciseResult { passed: boolean; checks: CheckResult[]; method: Exercise['method']; note: string }

/** Honest label for what a method does. None of them executes learner code. */
export const METHOD_NOTE: Record<Exercise['method'], string> = {
  'output-comparison': 'Your text is compared with the expected output. Code is not executed.',
  'code-tracing': 'You work out the output by reading the code. The answer is compared with the known output. Code is not executed.',
  'static-validation': 'Your code is checked against pattern rules. It is NOT executed, so passing means it has the required shape, not that it runs correctly.',
  'knowledge-check': 'Answer checked against an answer key.',
};

const norm = (s: string) => s.replace(/\r\n/g, '\n').split('\n').map((l) => l.replace(/\s+$/, '')).join('\n').trim();

export function checkExercise(ex: Exercise, submission: string): ExerciseResult {
  const note = METHOD_NOTE[ex.method];
  if (!submission.trim()) {
    return { passed: false, method: ex.method, note,
      checks: [{ id: 'empty', description: 'Submit an answer', passed: false, message: 'Nothing was submitted yet.' }] };
  }
  let checks: CheckResult[];
  if (ex.method === 'static-validation') {
    checks = (ex.rules ?? []).map((r) => {
      const found = new RegExp(r.pattern, r.flags).test(submission);
      const ok = r.kind === 'matches' ? found : !found;
      return { id: r.id, description: r.description, passed: ok, message: ok ? 'OK' : r.failMessage };
    });
  } else {
    const ok = norm(submission) === norm(ex.expectedOutput ?? '');
    checks = [{ id: 'output', description: 'Output matches', passed: ok,
      message: ok ? 'OK' : 'Your answer differs from the expected output. Check each line, spelling, and spacing.' }];
  }
  return { passed: checks.length > 0 && checks.every((c) => c.passed), checks, method: ex.method, note };
}
