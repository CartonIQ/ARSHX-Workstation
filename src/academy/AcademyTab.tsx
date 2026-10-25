import React, { useMemo, useState } from 'react';
import { ArrowLeft, Bookmark, BookmarkCheck, CheckCircle2, ChevronRight, GraduationCap, Lock, RotateCcw, Search, Trash2 } from 'lucide-react';
import { COURSES, CURRICULUM_ERRORS } from './curriculum';
import { isCorrect, scoreQuiz } from './quiz';
import { checkExercise, METHOD_NOTE, type ExerciseResult } from './exercise';
import {
  clearProgress, courseLessons, courseProgress, estimateMinutes, firstUnfinished, loadProgress, markComplete, markIncomplete,
  nextLesson, prevLesson, recordExercise, recordQuiz, saveProgress, setResume, toggleBookmark, unmetPrerequisites,
  type StorageLike,
} from './progress';
import type { Category, Course, Exercise, Lesson, Progress, QuizAnswer, QuizQuestion } from './types';

type View =
  | { name: 'home' } | { name: 'progress' }
  | { name: 'course'; courseId: string }
  | { name: 'lesson'; courseId: string; lessonId: string }
  | { name: 'quiz'; courseId: string; lessonId: string }
  | { name: 'exercise'; courseId: string; lessonId: string; exerciseId: string };

const CATEGORY_LABEL: Record<Category, string> = {
  fundamentals: 'Fundamentals', web: 'Web development', android: 'Android', scripting: 'Scripting', databases: 'Databases', systems: 'Systems programming',
};
const card = 'rounded-xl border border-[#24242C] bg-[#1A1A20] p-4';
const btn = 'min-h-[44px] px-4 rounded-lg text-sm font-semibold transition-colors';
const primary = `${btn} bg-[#E5222A] text-white hover:bg-[#c91c23]`;
const ghost = `${btn} border border-[#24242C] text-[#F7F7FA] hover:bg-[#24242C]`;

function getStorage(): StorageLike | null {
  try { return typeof window !== 'undefined' ? window.localStorage : null; } catch { return null; }
}
const findLesson = (courseId: string, lessonId: string): { course: Course; lesson: Lesson } | null => {
  const course = COURSES.find((c) => c.id === courseId); const lesson = course && courseLessons(course).find((l) => l.id === lessonId);
  return course && lesson ? { course, lesson } : null;
};
const courseOfLesson = (lessonId: string) => COURSES.find((c) => courseLessons(c).some((l) => l.id === lessonId));

export const AcademyTab: React.FC = () => {
  const storage = useMemo(getStorage, []);
  const initial = useMemo(() => loadProgress(storage), [storage]);
  const [progress, setProgress] = useState<Progress>(initial.progress);
  const [notice, setNotice] = useState<string | null>(initial.warning ?? null);
  const [view, setView] = useState<View>({ name: 'home' });
  const [stack, setStack] = useState<View[]>([]);

  const commit = (next: Progress) => {
    setProgress(next);
    const r = saveProgress(storage, next);
    setNotice(r.ok ? null : `Not saved: ${'error' in r ? r.error : 'Unknown error'}`);
  };
  const go = (v: View) => { setStack((s) => [...s, view]); setView(v); window.scrollTo?.(0, 0); };
  const back = () => { const s = [...stack]; const prev = s.pop() ?? { name: 'home' as const }; setStack(s); setView(prev); };
  const openLesson = (courseId: string, lessonId: string) => { commit(setResume(progress, courseId, lessonId)); go({ name: 'lesson', courseId, lessonId }); };

  const header = (title: string, showBack: boolean) => (
    <div className="flex items-center gap-2 mb-4">
      {showBack && <button aria-label="Back" onClick={back} className={`${ghost} px-3`}><ArrowLeft className="w-4 h-4" /></button>}
      <h1 className="text-lg font-bold text-[#F7F7FA] flex-1 min-w-0 truncate">{title}</h1>
      {view.name !== 'progress' && <button onClick={() => go({ name: 'progress' })} className={ghost}>Progress</button>}
    </div>
  );

  let body: React.ReactNode;
  if (view.name === 'home') body = <Home progress={progress} openCourse={(id) => go({ name: 'course', courseId: id })} openLesson={openLesson} />;
  else if (view.name === 'progress') body = <ProgressView progress={progress} openLesson={openLesson}
      onClear={() => { const r = clearProgress(storage, window.confirm('Clear all Academy progress, bookmarks, and scores? This cannot be undone.'));
        if (r.ok) { setProgress(loadProgress(storage).progress); setNotice(null); } else if ('error' in r && r.error !== 'Clearing needs confirmation.') setNotice(`Not cleared: ${r.error}`); }} />;
  else if (view.name === 'course') {
    const c = COURSES.find((x) => x.id === view.courseId);
    body = c ? <CourseView course={c} progress={progress} openLesson={openLesson} /> : <Missing what="course" />;
  } else {
    const f = findLesson(view.courseId, view.lessonId);
    if (!f) body = <Missing what="lesson" />;
    else if (view.name === 'lesson') body = <LessonView {...f} progress={progress} openLesson={openLesson}
        toggleDone={() => commit(progress.completed[f.lesson.id] ? markIncomplete(progress, f.lesson.id) : markComplete(progress, f.lesson.id))}
        toggleMark={() => commit(toggleBookmark(progress, f.lesson.id))}
        toQuiz={() => go({ name: 'quiz', courseId: f.course.id, lessonId: f.lesson.id })}
        toExercise={(id) => go({ name: 'exercise', courseId: f.course.id, lessonId: f.lesson.id, exerciseId: id })} />;
    else if (view.name === 'quiz') body = <QuizView lesson={f.lesson} onFinish={(c, t) => commit(recordQuiz(progress, f.lesson.id, c, t))} onExit={back} />;
    else { const ex = f.lesson.exercises.find((e) => e.id === view.exerciseId);
      body = ex ? <ExerciseView key={ex.id} exercise={ex} onSubmit={(passed) => commit(recordExercise(progress, ex.id, passed))} /> : <Missing what="exercise" />; }
  }

  const title = view.name === 'home' ? 'Academy' : view.name === 'progress' ? 'My progress'
    : view.name === 'course' ? (COURSES.find((c) => c.id === view.courseId)?.title ?? 'Course')
    : (findLesson(view.courseId, view.lessonId)?.lesson.title ?? 'Lesson');

  return (
    <div className="h-full overflow-y-auto bg-[#101014] text-[#F7F7FA]">
      <div className="mx-auto w-full max-w-3xl p-4 pb-28">
        {header(title, view.name !== 'home')}
        {notice && <div role="alert" className="mb-4 rounded-lg border border-[#E5222A] bg-[#2a1214] p-3 text-sm">{notice}</div>}
        {CURRICULUM_ERRORS.length > 0 && (
          <div role="alert" className="mb-4 rounded-lg border border-[#FBBF24] p-3 text-sm">
            <p className="font-semibold mb-1">Course data has {CURRICULUM_ERRORS.length} problem(s):</p>
            <ul className="list-disc pl-5 text-[#A5A5B2]">{CURRICULUM_ERRORS.slice(0, 5).map((e) => <li key={e}>{e}</li>)}</ul>
          </div>
        )}
        {body}
      </div>
    </div>
  );
};

const Missing: React.FC<{ what: string }> = ({ what }) => <div className={card}>This {what} could not be found in the course data.</div>;

const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language }) => {
  const [state, setState] = useState<'idle' | 'ok' | 'fail'>('idle');
  const copy = async () => { try { await navigator.clipboard.writeText(code); setState('ok'); } catch { setState('fail'); } setTimeout(() => setState('idle'), 1500); };
  return (
    <div className="rounded-lg border border-[#24242C] bg-[#0B0B0E] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 text-xs text-[#A5A5B2] border-b border-[#24242C]">
        <span>{language ?? 'code'}</span>
        <button onClick={copy} className="min-h-[32px] px-2 hover:text-white">{state === 'ok' ? 'Copied' : state === 'fail' ? 'Copy failed' : 'Copy'}</button>
      </div>
      <pre className="p-3 text-sm overflow-x-auto font-mono leading-relaxed"><code>{code}</code></pre>
    </div>
  );
};

const Home: React.FC<{ progress: Progress; openCourse: (id: string) => void; openLesson: (c: string, l: string) => void }> = ({ progress, openCourse, openLesson }) => {
  const [q, setQ] = useState(''); const [cat, setCat] = useState<Category | 'all'>('all');
  const resume = progress.resume && findLesson(progress.resume.courseId, progress.resume.lessonId);
  const cats = [...new Set(COURSES.map((c) => c.category))];
  const shown = COURSES.filter((c) => (cat === 'all' || c.category === cat) &&
    `${c.title} ${c.description} ${CATEGORY_LABEL[c.category]}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="space-y-4">
      <div className={card}>
        <div className="flex items-center gap-2 mb-1"><GraduationCap className="w-5 h-5 text-[#E5222A]" /><h2 className="font-bold">Learn to code from zero</h2></div>
        <p className="text-sm text-[#A5A5B2]">Pick a course, read a lesson, take its quiz, then try the exercises. Everything works offline and your progress is saved on this device.</p>
      </div>
      {resume && (
        <button onClick={() => openLesson(resume.course.id, resume.lesson.id)} className={`${card} w-full text-left flex items-center gap-3 hover:bg-[#24242C]`}>
          <div className="flex-1 min-w-0"><div className="text-xs text-[#A5A5B2]">Continue learning</div><div className="font-semibold truncate">{resume.lesson.title}</div><div className="text-xs text-[#A5A5B2] truncate">{resume.course.title}</div></div>
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
      <label className="flex items-center gap-2 rounded-lg border border-[#24242C] bg-[#1A1A20] px-3 min-h-[44px]">
        <Search className="w-4 h-4 text-[#A5A5B2]" /><input aria-label="Search courses" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search courses and topics" className="flex-1 bg-transparent outline-none text-sm" />
      </label>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['all', ...cats] as const).map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`${btn} whitespace-nowrap ${cat === c ? 'bg-[#E5222A] text-white' : 'border border-[#24242C] text-[#A5A5B2]'}`}>{c === 'all' ? 'All' : CATEGORY_LABEL[c]}</button>
        ))}
      </div>
      {shown.length === 0 && <div className={card}>No courses match your search. Clear the search or choose another category.</div>}
      {shown.map((c) => {
        const cp = courseProgress(c, progress); const locked = unmetPrerequisites(c, COURSES, progress);
        return (
          <button key={c.id} disabled={locked.length > 0} onClick={() => openCourse(c.id)} className={`${card} w-full text-left disabled:opacity-60 hover:bg-[#24242C]`}>
            <div className="flex items-center gap-2"><h3 className="font-bold flex-1">{c.title}</h3>{locked.length > 0 && <Lock className="w-4 h-4" />}</div>
            <p className="text-sm text-[#A5A5B2] mt-1">{c.description}</p>
            <div className="mt-2 text-xs text-[#A5A5B2]">{c.difficulty} · {cp.total} lesson{cp.total === 1 ? '' : 's'} · {cp.done} done{c.status === 'in-progress' ? ' · more lessons coming' : ''}</div>
            {locked.length > 0 && <div className="mt-1 text-xs text-[#FBBF24]">Finish first: {locked.map((l) => l.title).join(', ')}</div>}
            <div className="mt-2 h-1.5 rounded bg-[#24242C]"><div className="h-1.5 rounded bg-[#E5222A]" style={{ width: `${cp.percent}%` }} /></div>
          </button>
        );
      })}
    </div>
  );
};

const CourseView: React.FC<{ course: Course; progress: Progress; openLesson: (c: string, l: string) => void }> = ({ course, progress, openLesson }) => {
  const cp = courseProgress(course, progress); const next = firstUnfinished(course, progress);
  const mins = courseLessons(course).reduce((a, l) => a + estimateMinutes(l), 0);
  return (
    <div className="space-y-4">
      <div className={card}>
        <p className="text-sm text-[#A5A5B2]">{course.description}</p>
        <p className="mt-2 text-xs text-[#A5A5B2]">{course.difficulty} · about {mins} min · {cp.done}/{cp.total} lessons done</p>
        <p className="mt-1 text-xs text-[#A5A5B2]">Prerequisites: {course.prerequisites.length ? course.prerequisites.map((p) => COURSES.find((c) => c.id === p)?.title ?? p).join(', ') : 'none'}</p>
        {course.coverageNote && <p className="mt-2 text-xs text-[#FBBF24]">Not complete yet. {course.coverageNote}</p>}
        <div className="mt-3"><button className={primary} onClick={() => openLesson(course.id, (next ?? courseLessons(course)[0]).id)}>{cp.finished ? 'Review course' : cp.done > 0 ? 'Continue' : 'Start'}</button></div>
      </div>
      {course.modules.map((m) => (
        <div key={m.id}>
          <h2 className="font-semibold mb-2">{m.title}</h2>
          <div className="space-y-2">
            {m.lessons.map((l) => (
              <button key={l.id} onClick={() => openLesson(course.id, l.id)} className={`${card} w-full text-left flex items-center gap-3 hover:bg-[#24242C]`}>
                {progress.completed[l.id] ? <CheckCircle2 className="w-5 h-5 text-[#4ADE80]" /> : <span className="w-5 h-5 rounded-full border border-[#A5A5B2]" />}
                <div className="flex-1 min-w-0"><div className="font-semibold">{l.title}</div><div className="text-xs text-[#A5A5B2]">{estimateMinutes(l)} min · {l.quiz.length} questions · {l.exercises.length} exercise{l.exercises.length === 1 ? '' : 's'}</div></div>
                {progress.bookmarks.includes(l.id) && <BookmarkCheck className="w-4 h-4 text-[#FBBF24]" />}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="mt-6"><h2 className="font-bold mb-2">{title}</h2>{children}</section>
);

const LessonView: React.FC<{
  course: Course; lesson: Lesson; progress: Progress; openLesson: (c: string, l: string) => void;
  toggleDone: () => void; toggleMark: () => void; toQuiz: () => void; toExercise: (id: string) => void;
}> = ({ course, lesson, progress, openLesson, toggleDone, toggleMark, toQuiz, toExercise }) => {
  const prev = prevLesson(course, lesson.id); const next = nextLesson(course, lesson.id);
  const done = !!progress.completed[lesson.id]; const marked = progress.bookmarks.includes(lesson.id);
  const qr = progress.quizzes[lesson.id];
  return (
    <article className="text-[15px] leading-relaxed">
      <p className="text-[#A5A5B2]">{lesson.summary}</p>
      <div className="flex gap-2 mt-3">
        <button onClick={toggleMark} className={ghost}>{marked ? <><BookmarkCheck className="inline w-4 h-4 mr-1" />Bookmarked</> : <><Bookmark className="inline w-4 h-4 mr-1" />Bookmark</>}</button>
        <button onClick={toggleDone} className={done ? ghost : primary}>{done ? 'Completed. Undo' : 'Mark complete'}</button>
      </div>
      <Section title="New words"><dl className="space-y-2">{lesson.concepts.map((c) => <div key={c.term} className={card}><dt className="font-semibold">{c.term}</dt><dd className="text-[#A5A5B2]">{c.definition}</dd></div>)}</dl></Section>
      <Section title="Why it matters"><p>{lesson.why}</p></Section>
      <Section title="Explanation">{lesson.body.map((p, i) => <p key={i} className="mb-3">{p}</p>)}</Section>
      <Section title="Rules to remember"><ul className="list-disc pl-5 space-y-1">{lesson.rules.map((r) => <li key={r}>{r}</li>)}</ul></Section>
      <Section title="Examples">
        {lesson.examples.map((e) => (
          <div key={e.id} className="mb-5">
            <div className={`text-sm font-semibold mb-1 ${e.correct ? 'text-[#4ADE80]' : 'text-[#E5222A]'}`}>{e.correct ? 'Correct' : 'Incorrect'}: {e.title}</div>
            <CodeBlock code={e.code} language={e.language} />
            <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm">{e.lineByLine.map((l, i) => <li key={i}>{l}</li>)}</ol>
            {e.expectedOutput !== undefined && <div className="mt-2"><div className="text-xs text-[#A5A5B2] mb-1">Expected output</div><pre className="rounded-lg bg-[#0B0B0E] border border-[#24242C] p-3 text-sm overflow-x-auto font-mono">{e.expectedOutput}</pre></div>}
            {e.note && <p className="mt-2 text-sm text-[#A5A5B2]">{e.note}</p>}
          </div>
        ))}
      </Section>
      <Section title="Common mistakes"><ul className="list-disc pl-5 space-y-1">{lesson.mistakes.map((r) => <li key={r}>{r}</li>)}</ul></Section>
      <Section title="Debugging tips"><ul className="list-disc pl-5 space-y-1">{lesson.debugTips.map((r) => <li key={r}>{r}</li>)}</ul></Section>
      <Section title="Practice">
        <div className="space-y-2">
          <button onClick={toQuiz} className={`${card} w-full text-left hover:bg-[#24242C]`}>
            <div className="font-semibold">Quiz ({lesson.quiz.length} questions)</div>
            <div className="text-xs text-[#A5A5B2]">{qr ? `Best ${qr.bestCorrect}/${qr.total} · ${qr.attempts} attempt${qr.attempts === 1 ? '' : 's'}` : 'Not attempted yet'}</div>
          </button>
          {lesson.exercises.map((ex) => { const r = progress.exercises[ex.id]; return (
            <button key={ex.id} onClick={() => toExercise(ex.id)} className={`${card} w-full text-left hover:bg-[#24242C]`}>
              <div className="font-semibold">{ex.title}</div>
              <div className="text-xs text-[#A5A5B2]">{ex.method.replace('-', ' ')} · {r ? (r.passed ? 'Passed' : 'Not passed yet') + ` · ${r.attempts} attempt${r.attempts === 1 ? '' : 's'}` : 'Not attempted yet'}</div>
            </button>); })}
        </div>
      </Section>
      {lesson.related.length > 0 && <Section title="Related lessons"><div className="flex flex-wrap gap-2">{lesson.related.map((id) => { const c = courseOfLesson(id); const l = c && courseLessons(c).find((x) => x.id === id);
        return c && l ? <button key={id} onClick={() => openLesson(c.id, id)} className={ghost}>{l.title}</button> : null; })}</div></Section>}
      <div className="flex gap-2 mt-8">
        <button disabled={!prev} onClick={() => prev && openLesson(course.id, prev.id)} className={`${ghost} flex-1 disabled:opacity-40`}>Previous</button>
        <button disabled={!next} onClick={() => next && openLesson(course.id, next.id)} className={`${primary} flex-1 disabled:opacity-40`}>Next lesson</button>
      </div>
    </article>
  );
};

const QuizView: React.FC<{ lesson: Lesson; onFinish: (correct: number, total: number) => void; onExit: () => void }> = ({ lesson, onFinish, onExit }) => {
  const [round, setRound] = useState<QuizQuestion[]>(lesson.quiz); const [isRetry, setIsRetry] = useState(false);
  const [i, setI] = useState(0); const [answers, setAnswers] = useState<Record<string, QuizAnswer>>({});
  const [checked, setChecked] = useState(false); const [done, setDone] = useState(false);
  if (lesson.quiz.length === 0) return <div className={card}>This lesson has no quiz.</div>;
  const q = round[i]; const a = answers[q?.id];
  const set = (v: QuizAnswer) => !checked && setAnswers({ ...answers, [q.id]: v });
  const ready = q && (q.kind === 'multi' ? Array.isArray(a) && a.length > 0 : q.kind === 'fill' ? typeof a === 'string' && a.trim() !== '' : a !== undefined);

  if (done) {
    const r = scoreQuiz(round, answers); const wrong = round.filter((x) => !isCorrect(x, answers[x.id]));
    return (
      <div className="space-y-3">
        <div className={card}><div className="text-2xl font-bold">{r.correct} / {r.total}</div><div className="text-sm text-[#A5A5B2]">{r.percent}% correct{isRetry ? ' (practice round, not added to your saved score)' : ''}</div></div>
        {round.map((x) => <div key={x.id} className={card}><div className="text-sm font-semibold">{isCorrect(x, answers[x.id]) ? 'Correct' : 'Incorrect'}: {x.prompt}</div><div className="text-sm text-[#A5A5B2] mt-1">{x.explanation}</div></div>)}
        <div className="flex gap-2">
          {wrong.length > 0 && <button className={primary} onClick={() => { setRound(wrong); setIsRetry(true); setI(0); setAnswers({}); setChecked(false); setDone(false); }}><RotateCcw className="inline w-4 h-4 mr-1" />Retry {wrong.length} incorrect</button>}
          <button className={ghost} onClick={onExit}>Back to lesson</button>
        </div>
      </div>
    );
  }
  const opt = (id: string, text: string, selected: boolean, correct: boolean) => (
    <button key={id} onClick={() => {
      if (q.kind === 'multi') { const cur = Array.isArray(a) ? a : []; set(cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]); } else set(id);
    }} className={`${card} w-full text-left ${selected ? 'border-[#E5222A]' : ''} ${checked && correct ? 'border-[#4ADE80]' : ''}`} aria-pressed={selected}>{text}</button>
  );
  const chosen = q.kind === 'single' && typeof a === 'string' ? q.wrongExplanations?.[a] : undefined;
  return (
    <div className="space-y-3">
      <div className="text-xs text-[#A5A5B2]">{isRetry ? 'Retry · ' : ''}Question {i + 1} of {round.length}</div>
      <h2 className="font-bold">{q.prompt}</h2>
      {q.kind === 'single' && q.options.map((o) => opt(o.id, o.text, a === o.id, o.id === q.answerId))}
      {q.kind === 'multi' && <><p className="text-xs text-[#A5A5B2]">Select all that apply.</p>{q.options.map((o) => opt(o.id, o.text, Array.isArray(a) && a.includes(o.id), q.answerIds.includes(o.id)))}</>}
      {q.kind === 'truefalse' && <div className="flex gap-2">{[true, false].map((v) => <button key={String(v)} onClick={() => set(v)} aria-pressed={a === v} className={`${card} flex-1 ${a === v ? 'border-[#E5222A]' : ''}`}>{v ? 'True' : 'False'}</button>)}</div>}
      {q.kind === 'fill' && <input aria-label="Your answer" value={typeof a === 'string' ? a : ''} onChange={(e) => set(e.target.value)} className="w-full min-h-[44px] rounded-lg border border-[#24242C] bg-[#1A1A20] px-3" />}
      {checked && <div className={card} role="status"><div className="font-semibold">{isCorrect(q, a) ? 'Correct' : 'Not quite'}</div><p className="text-sm text-[#A5A5B2] mt-1">{chosen ? `${chosen} ` : ''}{q.explanation}</p></div>}
      {!checked ? <button disabled={!ready} onClick={() => setChecked(true)} className={`${primary} w-full disabled:opacity-40`}>Check answer</button>
        : <button className={`${primary} w-full`} onClick={() => { if (i + 1 < round.length) { setI(i + 1); setChecked(false); } else { if (!isRetry) onFinish(scoreQuiz(round, answers).correct, round.length); setDone(true); } }}>{i + 1 < round.length ? 'Next question' : 'See results'}</button>}
    </div>
  );
};

const ExerciseView: React.FC<{ exercise: Exercise; onSubmit: (passed: boolean) => void }> = ({ exercise, onSubmit }) => {
  const tracing = exercise.method === 'code-tracing' || exercise.method === 'output-comparison';
  const [text, setText] = useState(tracing ? '' : exercise.code ?? ''); const [hints, setHints] = useState(0);
  const [result, setResult] = useState<ExerciseResult | null>(null);
  return (
    <div className="space-y-3">
      <div className="text-xs text-[#FBBF24]">{METHOD_NOTE[exercise.method]}</div>
      <p>{exercise.description}</p>
      <ul className="list-disc pl-5 text-sm text-[#A5A5B2]">{exercise.requirements.map((r) => <li key={r}>{r}</li>)}</ul>
      {tracing && exercise.code && <CodeBlock code={exercise.code} language={exercise.language} />}
      <textarea aria-label={tracing ? 'Your predicted output' : 'Your code'} value={text} onChange={(e) => { setText(e.target.value); setResult(null); }}
        rows={6} spellCheck={false} autoCapitalize="off" autoCorrect="off"
        className="w-full rounded-lg border border-[#24242C] bg-[#0B0B0E] p-3 font-mono text-sm outline-none focus:border-[#E5222A]" placeholder={tracing ? 'Type the output here' : 'Write your code here'} />
      <div className="flex flex-wrap gap-2">
        <button className={primary} onClick={() => { const r = checkExercise(exercise, text); setResult(r); onSubmit(r.passed); }}>Submit</button>
        <button className={ghost} disabled={hints >= exercise.hints.length} onClick={() => setHints(hints + 1)}>Hint ({hints}/{exercise.hints.length})</button>
        <button className={ghost} onClick={() => { setText(tracing ? '' : exercise.code ?? ''); setResult(null); setHints(0); }}>Reset</button>
      </div>
      {exercise.hints.slice(0, hints).map((h, i) => <div key={i} className={`${card} text-sm`}>Hint {i + 1}: {h}</div>)}
      {result && (
        <div className={card} role="status">
          <div className={`font-bold ${result.passed ? 'text-[#4ADE80]' : 'text-[#E5222A]'}`}>{result.passed ? 'All checks passed' : 'Some checks failed'}</div>
          <ul className="mt-2 space-y-1 text-sm">{result.checks.map((c) => <li key={c.id}>{c.passed ? 'Passed' : 'Failed'}: {c.description}{c.passed ? '' : `. ${c.message}`}</li>)}</ul>
          {result.passed && <p className="mt-2 text-sm text-[#A5A5B2]">{exercise.explanation}</p>}
        </div>
      )}
    </div>
  );
};

const ProgressView: React.FC<{ progress: Progress; openLesson: (c: string, l: string) => void; onClear: () => void }> = ({ progress, openLesson, onClear }) => {
  const marked = progress.bookmarks.map((id) => { const c = courseOfLesson(id); const l = c && courseLessons(c).find((x) => x.id === id); return c && l ? { c, l } : null; }).filter((x): x is { c: Course; l: Lesson } => !!x);
  const quizzes = Object.entries(progress.quizzes); const ex = Object.entries(progress.exercises);
  return (
    <div className="space-y-4">
      {COURSES.map((c) => { const p = courseProgress(c, progress); return <div key={c.id} className={card}><div className="font-semibold">{c.title}</div><div className="text-sm text-[#A5A5B2]">{p.done} of {p.total} lessons · {p.percent}%</div></div>; })}
      <div className={card}><h2 className="font-semibold mb-2">Bookmarks</h2>{marked.length === 0 ? <p className="text-sm text-[#A5A5B2]">No bookmarks yet. Tap Bookmark inside a lesson.</p> :
        <div className="space-y-2">{marked.map(({ c, l }) => <button key={l.id} onClick={() => openLesson(c.id, l.id)} className={`${ghost} w-full text-left`}>{l.title}</button>)}</div>}</div>
      <div className={card}><h2 className="font-semibold mb-2">Quiz scores</h2>{quizzes.length === 0 ? <p className="text-sm text-[#A5A5B2]">No quizzes taken yet.</p> :
        <ul className="text-sm space-y-1">{quizzes.map(([id, r]) => <li key={id}>{courseOfLesson(id) ? courseLessons(courseOfLesson(id)!).find((l) => l.id === id)?.title : id}: best {r.bestCorrect}/{r.total}, {r.attempts} attempt{r.attempts === 1 ? '' : 's'}</li>)}</ul>}</div>
      <div className={card}><h2 className="font-semibold mb-2">Exercises</h2>{ex.length === 0 ? <p className="text-sm text-[#A5A5B2]">No exercises attempted yet.</p> :
        <ul className="text-sm space-y-1">{ex.map(([id, r]) => <li key={id}>{id}: {r.passed ? 'passed' : 'not passed yet'}, {r.attempts} attempt{r.attempts === 1 ? '' : 's'}</li>)}</ul>}</div>
      <button onClick={onClear} className={`${ghost} text-[#E5222A]`}><Trash2 className="inline w-4 h-4 mr-1" />Clear all progress</button>
    </div>
  );
};

export default AcademyTab;
