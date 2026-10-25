import { LineEditor } from '../src/utils/lineEditor.ts';
let pass = 0, fail = 0;
const t = (n: string, c: boolean) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n); };

// Simulates the terminal screen so echo output can be checked as the user would see it.
function screen(echoes: string[]): string {
  let line: string[] = []; let col = 0;
  const all = echoes.join('');
  for (let i = 0; i < all.length; i++) {
    const c = all[i];
    if (c === '\x1b') { const m = /^\x1b\[(\d+)([CD])/.exec(all.slice(i)); if (m) { col += (m[2]==='C'?1:-1)*Number(m[1]); i += m[0].length-1; continue; } }
    if (c === '\b') { col = Math.max(0, col-1); continue; }
    if (c === '\r') { col = 0; continue; }
    if (c === '\n') { line = []; col = 0; continue; }
    line[col++] = c;
  }
  return line.join('').replace(/ +$/,'');
}

let e = new LineEditor();
let echoes: string[] = [];
const f = (s: string) => { const r = e.feed(s); echoes.push(r.echo); return r; };

f('ls -la'); t('typing builds buffer', e.getBuffer()==='ls -la' && screen(echoes)==='ls -la');
let r = f('\r'); t('enter submits line', r.lines[0]==='ls -la' && e.getBuffer()==='');

e = new LineEditor(); echoes=[];
f('abc'); f('\x7f'); t('backspace', e.getBuffer()==='ab' && screen(echoes)==='ab');
f('\x1b[D'); f('X'); t('insert mid-line', e.getBuffer()==='aXb' && screen(echoes)==='aXb');
f('\x1b[3~'); t('delete key', e.getBuffer()==='aX' && screen(echoes)==='aX');
f('\x01'); f('Z'); t('ctrl+a then insert', e.getBuffer()==='ZaX' && screen(echoes)==='ZaX');
f('\x05'); f('\x15'); t('ctrl+u clears before cursor', e.getBuffer()==='' && screen(echoes)==='');

e = new LineEditor(); echoes=[];
f('echo one\r'); f('echo two\r'); echoes=[];
f('\x1b[A'); t('up -> last command', e.getBuffer()==='echo two' && screen(echoes)==='echo two');
f('\x1b[A'); t('up -> previous', e.getBuffer()==='echo one');
f('\x1b[A'); t('up at oldest stays', e.getBuffer()==='echo one');
f('\x1b[B'); f('\x1b[B'); t('down past newest restores empty draft', e.getBuffer()==='');
f('par'); f('\x1b[A'); f('\x1b[B'); t('draft restored after history browse', e.getBuffer()==='par');

e = new LineEditor(); f('keep');
r = f('\x03'); t('ctrl+c flags interrupt, clears line', r.interrupt && e.getBuffer()==='');
r = f('\x04'); t('ctrl+d on empty line = eof', r.eof);
f('x'); r = f('\x04'); t('ctrl+d with text is not eof', !r.eof);

e = new LineEditor(); f('foo bar baz'); f('\x17'); t('ctrl+w deletes word', e.getBuffer()==='foo bar ');
e = new LineEditor(); r = f('a\rb\r'); t('multi-line paste yields 2 lines', r.lines.join('|')==='a|b');
e = new LineEditor(); f('same\r'); f('same\r'); t('dedupes consecutive history', e.getHistory().length===1);
e = new LineEditor(); f('\x1b[200~'); t('unknown escape ignored', e.getBuffer()==='');
e = new LineEditor(); f('old'); e.setLine('new cmd'); t('setLine replaces', e.getBuffer()==='new cmd');
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0);
