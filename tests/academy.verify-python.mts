// Runs the code in lessons with real runtimes and compares with what the lessons claim.
//   Python examples/tracing    -> python3
//   JavaScript examples/tracing -> node (browser-only snippets that use document are skipped)
//   TypeScript examples/tracing -> tsc (type check, strict) and tsx (run) when available
//   Java examples/tracing       -> java (single-file source launch, JDK 11+)
// Kotlin, Android, Gradle, XML, HTML and CSS are NOT run here.
// HTML and CSS are not machine-checked here. Missing tools are reported as skipped.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { COURSES } from '../src/academy/curriculum/index';
import { courseLessons } from '../src/academy/progress';

const has = (c: string, a = ['--version']) => spawnSync(c, a).status === 0;
const bin = (name: string) => (existsSync(`node_modules/.bin/${name}`) ? `node_modules/.bin/${name}` : has(name) ? name : null);
const py = ['python3', 'python'].find((c) => has(c));
const tsc = bin('tsc'); const tsx = bin('tsx'); const java = has('java', ['-version']) ? 'java' : null;
const dir = mkdtempSync(join(tmpdir(), 'academy-'));
const trim = (s: string) => s.replace(/\r\n/g, '\n').replace(/\s+$/, '');
const bad: string[] = []; const stats: Record<string, number> = {}; const skipped: string[] = [];
const count = (k: string) => { stats[k] = (stats[k] ?? 0) + 1; };

type Snip = { id: string; lang: string; code: string; expected?: string; shouldFail: boolean };
const snips: Snip[] = [];
for (const l of COURSES.flatMap(courseLessons)) {
  for (const e of l.examples) snips.push({ id: e.id, lang: e.language, code: e.code, expected: e.expectedOutput, shouldFail: !e.correct && e.expectedOutput === undefined });
  for (const x of l.exercises.filter((x) => x.method === 'code-tracing'))
    snips.push({ id: x.id, lang: x.language ?? '', code: x.code ?? '', expected: x.expectedOutput, shouldFail: false });
}

let n = 0;
for (const s of snips) {
  const family = s.lang.startsWith('Python') ? 'Python' : s.lang.startsWith('JavaScript') ? 'JavaScript' : s.lang.startsWith('TypeScript') ? 'TypeScript' : s.lang.startsWith('Java 21') ? 'Java' : null;
  if (!family) continue;
  if (/infinite/i.test(s.id) || /ex-infinite/.test(s.id)) continue;
  if (family === 'JavaScript' && /document|userInput/.test(s.code)) { skipped.push(`${s.id} (browser-only)`); continue; }
  let ok = true; let out = ''; let failed = false;
  if (family === 'Python') {
    if (!py) { skipped.push(`${s.id} (no python)`); continue; }
    const r = spawnSync(py, ['-c', s.code], { encoding: 'utf8', input: '12\n', timeout: 8000 }); out = r.stdout; failed = r.status !== 0;
  } else if (family === 'Java') {
    if (!java) { skipped.push(`${s.id} (no java)`); continue; }
    const d = mkdtempSync(join(dir, 'j-')); writeFileSync(join(d, 'Main.java'), s.code);
    const r = spawnSync(java, ['Main.java'], { encoding: 'utf8', cwd: d, timeout: 60000 }); out = r.stdout; failed = r.status !== 0;
  } else if (family === 'JavaScript') {
    const r = spawnSync(process.execPath, ['-e', s.code], { encoding: 'utf8', timeout: 8000 }); out = r.stdout; failed = r.status !== 0;
  } else {
    if (!tsc) { skipped.push(`${s.id} (no tsc)`); continue; }
    const f = join(dir, `${++n}.ts`); writeFileSync(f, s.code);
    const t = spawnSync(tsc, ['--noEmit', '--strict', '--target', 'ES2022', '--skipLibCheck', f], { encoding: 'utf8', timeout: 60000 });
    failed = t.status !== 0;
    if (!failed && s.expected !== undefined) {
      if (!tsx) { skipped.push(`${s.id} (no tsx to run)`); }
      else { const r = spawnSync(tsx, [f], { encoding: 'utf8', timeout: 20000 }); out = r.stdout; failed = r.status !== 0; }
    }
  }
  count(family);
  if (s.shouldFail) { if (!failed) bad.push(`${s.id}: expected an error but it ran fine`); continue; }
  if (failed && !(family === 'TypeScript' && !s.expected && false)) { bad.push(`${s.id}: failed to run`); continue; }
  if (s.expected !== undefined && !(family === 'TypeScript' && !tsx) && trim(out) !== trim(s.expected)) { ok = false; bad.push(`${s.id}: output differs. got ${JSON.stringify(trim(out))}`); }
  void ok;
}
console.log('checked with real runtimes:', JSON.stringify(stats));
if (skipped.length) console.log('skipped:', skipped.join(', '));
if (bad.length) { console.error('MISMATCH:\n  ' + bad.join('\n  ')); process.exit(1); }
console.log('all checked lesson code behaves as the lessons say');
