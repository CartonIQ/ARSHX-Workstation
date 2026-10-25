import assert from 'node:assert/strict';
import { COURSES, CURRICULUM_ERRORS } from '../src/academy/curriculum/index';
import { validateCurriculum } from '../src/academy/validate';
import { isCorrect, scoreQuiz } from '../src/academy/quiz';
import { checkExercise } from '../src/academy/exercise';
import {
  STORAGE_KEY, loadProgress, saveProgress, clearProgress, emptyProgress, migrate, markComplete, toggleBookmark,
  recordQuiz, recordExercise, courseProgress, courseLessons, nextLesson, prevLesson, unmetPrerequisites, estimateMinutes,
  type StorageLike,
} from '../src/academy/progress';

let n = 0;
const t = (name: string, fn: () => void) => { fn(); n++; console.log('ok -', name); };
const mem = (): StorageLike & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
};
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

t('bundled curriculum is valid', () => assert.deepEqual(CURRICULUM_ERRORS, []));

t('validator catches duplicate ids, bad answer keys, missing explanations, bad references', () => {
  const c = clone(COURSES);
  const l = c[0].modules[0].lessons[0];
  c[0].modules[0].lessons[1].id = l.id;                       // duplicate lesson id
  (l.quiz[0] as any).answerId = 'zzz';                        // answer not an option
  l.quiz[1].explanation = '';                                 // missing explanation
  l.related = ['does-not-exist'];                             // bad reference
  c[0].prerequisites = ['nope'];                              // bad prerequisite
  const e = validateCurriculum(c).join('\n');
  for (const s of ['Duplicate id', 'is not an option', 'missing explanation', 'does not exist', 'unknown prerequisite'])
    assert.ok(e.includes(s), `expected error containing "${s}"`);
});

t('every lesson has real content', () => {
  for (const l of COURSES.flatMap(courseLessons)) {
    assert.ok(l.body.join(' ').length > 400, l.id);
    assert.ok(l.quiz.length >= 3 && l.exercises.length >= 1 && l.examples.length >= 2, l.id);
    assert.ok(estimateMinutes(l) >= 1);
  }
});

t('quiz checking for every question kind', () => {
  const ls = courseLessons(COURSES[0]);
  const q = Object.fromEntries(ls.flatMap((l) => l.quiz).map((x) => [x.id, x]));
  assert.ok(isCorrect(q['q-wip-1'], 'b')); assert.ok(!isCorrect(q['q-wip-1'], 'a')); assert.ok(!isCorrect(q['q-wip-1'], undefined));
  assert.ok(isCorrect(q['q-wip-2'], false)); assert.ok(!isCorrect(q['q-wip-2'], true));
  assert.ok(isCorrect(q['q-wip-3'], ['b', 'a'])); assert.ok(!isCorrect(q['q-wip-3'], ['a'])); assert.ok(!isCorrect(q['q-wip-3'], ['a', 'b', 'c']));
  assert.ok(isCorrect(q['q-wip-4'], '  Syntax ')); assert.ok(!isCorrect(q['q-wip-4'], 'grammar'));
});

t('quiz scoring is derived from real answers', () => {
  const qs = courseLessons(COURSES[0])[0].quiz;
  const r = scoreQuiz(qs, { 'q-wip-1': 'b', 'q-wip-2': true, 'q-wip-3': ['a', 'b'] });
  assert.equal(r.correct, 2); assert.equal(r.total, 4); assert.equal(r.percent, 50);
  assert.equal(scoreQuiz([], {}).percent, 0);
});

t('exercise checks: static validation, tracing, empty submission', () => {
  const ex = Object.fromEntries(courseLessons(COURSES[0]).flatMap((l) => l.exercises).map((x) => [x.id, x]));
  assert.ok(checkExercise(ex['exr-var-write'], 'age = 12').passed);
  assert.ok(checkExercise(ex['exr-var-write'], '  age=12  ').passed);
  assert.ok(!checkExercise(ex['exr-var-write'], 'age = "12"').passed);
  assert.ok(!checkExercise(ex['exr-var-write'], 'Age = 12').passed);
  assert.ok(!checkExercise(ex['exr-var-write'], 'age = 120').passed);
  assert.ok(checkExercise(ex['exr-wip-trace'], 'Hi\r\nARSHX  \n').passed);
  assert.ok(!checkExercise(ex['exr-wip-trace'], 'Hi ARSHX').passed);
  assert.ok(!checkExercise(ex['exr-wip-trace'], '   ').passed);
  assert.ok(checkExercise(ex['exr-var-trace'], '10').note.includes('not executed'));
});

t('progress persists across a simulated restart', () => {
  const s = mem();
  let p = emptyProgress();
  p = markComplete(p, 'les-variables', 111); p = toggleBookmark(p, 'les-variables');
  p = recordQuiz(p, 'les-variables', 3, 4, 5); p = recordQuiz(p, 'les-variables', 2, 4, 6);
  p = recordExercise(p, 'exr-var-write', true, 7); p = recordExercise(p, 'exr-var-write', false, 8);
  assert.deepEqual(saveProgress(s, p), { ok: true });
  const back = loadProgress(s).progress;                      // "restart"
  assert.equal(back.completed['les-variables'], 111);
  assert.deepEqual(back.bookmarks, ['les-variables']);
  assert.equal(back.quizzes['les-variables'].bestCorrect, 3); assert.equal(back.quizzes['les-variables'].attempts, 2);
  assert.equal(back.exercises['exr-var-write'].passed, true); assert.equal(back.exercises['exr-var-write'].attempts, 2);
  assert.deepEqual(toggleBookmark(back, 'les-variables').bookmarks, []);
});

t('malformed / old saved data is handled safely', () => {
  const s = mem(); s.setItem(STORAGE_KEY, '{not json');
  const r = loadProgress(s);
  assert.deepEqual(r.progress, emptyProgress()); assert.ok(r.warning);
  assert.ok(s.data.has('arshx.academy.progress.corrupt'));
  const m = migrate({ completed: { a: 1, b: 'x' }, bookmarks: ['x', 5], quizzes: { q: { attempts: 'no' } }, junk: 1 });
  assert.deepEqual(m.completed, { a: 1 }); assert.deepEqual(m.bookmarks, ['x']); assert.deepEqual(m.quizzes, {});
  assert.deepEqual(migrate(null), emptyProgress()); assert.deepEqual(migrate([1]), emptyProgress());
});

t('storage failures are reported, never faked as success', () => {
  const full: StorageLike = { getItem: () => null, setItem: () => { throw new Error('quota'); }, removeItem: () => {} };
  const r = saveProgress(full, emptyProgress()); assert.equal(r.ok, false);
  const lying: StorageLike = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  assert.equal(saveProgress(lying, emptyProgress()).ok, false);
  assert.equal(saveProgress(null, emptyProgress()).ok, false);
  assert.ok(loadProgress(null).warning);
});

t('clearing progress needs explicit confirmation', () => {
  const s = mem(); saveProgress(s, markComplete(emptyProgress(), 'x'));
  assert.equal(clearProgress(s, false).ok, false); assert.ok(s.data.has(STORAGE_KEY));
  assert.equal(clearProgress(s, true).ok, true); assert.ok(!s.data.has(STORAGE_KEY));
});

t('lesson order, previous/next, course progress, prerequisites', () => {
  const c = COURSES[0]; const ls = courseLessons(c);
  assert.ok(ls.length >= 7);
  assert.equal(prevLesson(c, ls[0].id), null); assert.equal(nextLesson(c, ls[0].id)?.id, ls[1].id);
  assert.equal(nextLesson(c, ls[ls.length - 1].id), null); assert.equal(prevLesson(c, ls[1].id)?.id, ls[0].id);
  let p = emptyProgress(); assert.equal(courseProgress(c, p).percent, 0);
  p = markComplete(p, ls[0].id); assert.equal(courseProgress(c, p).percent, Math.round(100 / ls.length));
  for (const l of ls) p = markComplete(p, l.id);
  assert.ok(courseProgress(c, p).finished);
  const gated = { ...clone(c), id: 'course-x', prerequisites: [c.id] };
  assert.equal(unmetPrerequisites(gated, [c, gated], emptyProgress()).length, 1);
  assert.equal(unmetPrerequisites(gated, [c, gated], p).length, 0);
});

t('static exercises accept good answers and reject bad ones', () => {
  const ex = Object.fromEntries(COURSES.flatMap(courseLessons).flatMap((l) => l.exercises).map((x) => [x.id, x]));
  const good: Record<string, string> = {
    'exr-ops-write': 'total = price * 3', 'exr-io-write': 'print("Hello")',
    'exr-if-write': 'if temperature > 30:\n    print("Hot")', 'exr-loop-write': 'for i in range(5):\n    print(i)',
    'exr-fn-write': 'def square(x):\n    return x * x',
    'exr-pystr-write': 'shout = name.upper()', 'exr-pylist-write': 'for item in items:\n    print(item)',
    'exr-pydict-write': 'stock = {"apples": 3}', 'exr-pyexc-write': 'try:\n    n = int(text)\nexcept ValueError:\n    n = 0',
    'exr-pycls-write': 'class Dog:\n    def __init__(self, name):\n        self.name = name',
    'exr-html-link': '<a href="https://example.com">Home</a>', 'exr-html-img': '<img src="cat.png" alt="A grey cat">',
    'exr-form-write': '<label for="email">Email</label>\n<input id="email" type="email">',
    'exr-css-write': '.card {\n  padding: 16px;\n}', 'exr-layout-write': '.row {\n  display: flex;\n  justify-content: center;\n}',
    'exr-js-write': 'const double = (n) => n * 2;', 'exr-jsdata-write': 'const doubled = nums.map((n) => n * 2);',
    'exr-async-write': 'await wait(100);', 'exr-dom-listener': 'document.querySelector("#btn").addEventListener("click", () => {});',
    'exr-dom-safe': 'out.textContent = name;', 'exr-ts-write': 'interface Point {\n  x: number;\n  y: number;\n}',
    'exr-java-write': 'int score = 10;', 'exr-javaoop-write': 'class Car extends Vehicle {',
    'exr-kt-write': 'val city = "Cairo"', 'exr-ktnull-write': 'val city: String? = null', 'exr-ktco-write': 'suspend fun load(): Int {',
    'exr-andstruct-activity': '<activity android:name=".MainActivity" android:exported="true">',
    'exr-andstruct-string': '<string name="app_name">ARSHX</string>',
    'exr-andlife-write': 'override fun onPause() {\n    super.onPause()\n}',
    'exr-gradle-dep': 'implementation("androidx.core:core-ktx:1.13.1")', 'exr-gradle-cmd': './gradlew assembleDebug',
  };
  const bad: Record<string, string> = {
    'exr-ops-write': 'total = price + 3', 'exr-io-write': 'print("hello")',
    'exr-if-write': 'if temperature > 30:\nprint("Hot")', 'exr-loop-write': 'for i in range(4):\n    print(i)',
    'exr-fn-write': 'def square(x):\n    return x + x',
    'exr-pystr-write': 'shout = name.lower()', 'exr-pylist-write': 'for x in items:\n    print(x)',
    'exr-pydict-write': 'stock = {"apples": 4}', 'exr-pyexc-write': 'try:\n    n = int(text)\nexcept KeyError:\n    n = 0',
    'exr-pycls-write': 'class Dog:\n    def __init__(self):\n        pass',
    'exr-html-link': '<a href="https://other.com">Home</a>', 'exr-html-img': '<img src="cat.png" alt="">',
    'exr-form-write': '<label>Email</label>\n<input type="email">',
    'exr-css-write': '.card {\n  padding: 8px;\n}', 'exr-layout-write': '.row {\n  justify-content: center;\n}',
    'exr-js-write': 'const double = (n) => n * 3;', 'exr-jsdata-write': 'const doubled = nums.filter((n) => n * 2);',
    'exr-async-write': 'wait(100);', 'exr-dom-listener': 'document.querySelector("#btn").onclick = () => {};',
    'exr-dom-safe': 'out.innerHTML = name;', 'exr-ts-write': 'interface Point {\n  x: number;\n}',
    'exr-java-write': 'score = 10;', 'exr-javaoop-write': 'class Car implements Vehicle {',
    'exr-kt-write': 'var city = "Cairo"', 'exr-ktnull-write': 'val city: String = null', 'exr-ktco-write': 'fun load(): Int {',
    'exr-andstruct-activity': '<activity android:name=".OtherActivity">',
    'exr-andstruct-string': '<string name="title">ARSHX</string>',
    'exr-andlife-write': 'override fun onPause() {\n}',
    'exr-gradle-dep': 'implementation("androidx.core:core:1.0.0")', 'exr-gradle-cmd': 'gradle assembleDebug',
  };
  for (const id of Object.keys(good)) {
    assert.ok(checkExercise(ex[id], good[id]).passed, `${id} should accept good answer`);
    assert.ok(!checkExercise(ex[id], bad[id]).passed, `${id} should reject bad answer`);
  }
});

t('every tracing exercise accepts its own expected output', () => {
  for (const x of COURSES.flatMap(courseLessons).flatMap((l) => l.exercises).filter((e) => e.method === 'code-tracing'))
    assert.ok(checkExercise(x, x.expectedOutput!).passed, x.id);
});

console.log(`\n${n} test groups passed`);
