import type { Course, Lesson, QuizQuestion } from './types';

/** Returns a list of problems. Empty list = curriculum is valid. */
export function validateCurriculum(courses: Course[]): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  const lessonIds = new Set<string>();
  const courseIds = new Set(courses.map((c) => c.id));

  const claim = (id: string, what: string) => {
    if (!id || typeof id !== 'string') { errors.push(`${what}: missing id`); return; }
    if (seen.has(id)) errors.push(`Duplicate id "${id}" (${what})`);
    seen.add(id);
  };

  courses.forEach((c) => c.modules.forEach((m) => m.lessons.forEach((l) => lessonIds.add(l.id))));

  for (const c of courses) {
    claim(c.id, 'course');
    if (!c.title.trim() || !c.description.trim()) errors.push(`Course ${c.id}: title/description empty`);
    for (const p of c.prerequisites) {
      if (!courseIds.has(p)) errors.push(`Course ${c.id}: unknown prerequisite "${p}"`);
      if (p === c.id) errors.push(`Course ${c.id}: lists itself as prerequisite`);
    }
    if (c.status === 'in-progress' && !c.coverageNote) errors.push(`Course ${c.id}: in-progress course needs a coverageNote`);
    if (c.modules.length === 0) errors.push(`Course ${c.id}: has no modules`);
    for (const m of c.modules) {
      claim(m.id, 'module');
      if (m.lessons.length === 0) errors.push(`Module ${m.id}: has no lessons`);
      for (const l of m.lessons) validateLesson(l, lessonIds, claim, errors);
    }
  }
  return errors;
}

function validateLesson(l: Lesson, lessonIds: Set<string>, claim: (id: string, w: string) => void, errors: string[]) {
  claim(l.id, 'lesson');
  if (!Number.isInteger(l.version) || l.version < 1) errors.push(`Lesson ${l.id}: bad version`);
  if (l.body.length === 0 || l.body.join(' ').trim().length < 80) errors.push(`Lesson ${l.id}: body too short to be a real lesson`);
  if (l.concepts.length === 0) errors.push(`Lesson ${l.id}: no concepts defined`);
  if (!l.why.trim()) errors.push(`Lesson ${l.id}: missing "why it matters"`);
  for (const r of l.related) if (!lessonIds.has(r)) errors.push(`Lesson ${l.id}: related lesson "${r}" does not exist`);
  for (const e of l.examples) {
    claim(e.id, 'example');
    if (!e.code.trim()) errors.push(`Example ${e.id}: empty code`);
    if (e.lineByLine.length === 0) errors.push(`Example ${e.id}: no line-by-line explanation`);
  }
  for (const q of l.quiz) { claim(q.id, 'question'); validateQuestion(q, errors); }
  for (const x of l.exercises) {
    claim(x.id, 'exercise');
    if (!x.explanation.trim()) errors.push(`Exercise ${x.id}: missing explanation`);
    if (x.method === 'static-validation') {
      if (!x.rules || x.rules.length === 0) errors.push(`Exercise ${x.id}: static-validation needs rules`);
      for (const r of x.rules ?? []) {
        try { new RegExp(r.pattern, r.flags); } catch { errors.push(`Exercise ${x.id}: rule ${r.id} has invalid pattern`); }
      }
    }
    if ((x.method === 'code-tracing' || x.method === 'output-comparison') && x.expectedOutput === undefined)
      errors.push(`Exercise ${x.id}: ${x.method} needs expectedOutput`);
  }
}

function validateQuestion(q: QuizQuestion, errors: string[]) {
  if (!q.explanation.trim()) errors.push(`Question ${q.id}: missing explanation`);
  if (!q.prompt.trim()) errors.push(`Question ${q.id}: empty prompt`);
  if (q.kind === 'single' || q.kind === 'multi') {
    const ids = q.options.map((o) => o.id);
    if (new Set(ids).size !== ids.length) errors.push(`Question ${q.id}: duplicate option ids`);
    if (ids.length < 2) errors.push(`Question ${q.id}: needs at least 2 options`);
    const keys = q.kind === 'single' ? [q.answerId] : q.answerIds;
    if (keys.length === 0) errors.push(`Question ${q.id}: no answer key`);
    for (const k of keys) if (!ids.includes(k)) errors.push(`Question ${q.id}: answer "${k}" is not an option`);
  }
  if (q.kind === 'fill' && q.acceptedAnswers.length === 0) errors.push(`Question ${q.id}: no accepted answers`);
}
