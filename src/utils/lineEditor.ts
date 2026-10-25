/**
 * Line editor for the native shell.
 *
 * The Android shell runs over pipes (no PTY), so it neither echoes keystrokes nor
 * edits lines. This class does both for the terminal view: it consumes raw
 * terminal input and returns what to draw locally (`echo`) and which complete
 * lines to send to the shell. Supports cursor movement, in-line insert/delete,
 * history (up/down), Ctrl+U/K/A/E/W, Ctrl+C and Ctrl+D.
 */
export interface FeedResult {
  echo: string;
  lines: string[];
  interrupt: boolean;
  eof: boolean;
}

export class LineEditor {
  private buf = '';
  private cur = 0;
  private history: string[] = [];
  private histIdx = -1; // -1 = editing a fresh line
  private draft = '';
  private maxHistory: number;

  constructor(initialHistory: string[] = [], maxHistory = 200) {
    this.history = initialHistory.slice(-maxHistory);
    this.maxHistory = maxHistory;
  }

  getHistory(): string[] {
    return [...this.history];
  }

  getBuffer(): string {
    return this.buf;
  }

  /** Replaces the current line (used by the extra-keys bar and AI helper). */
  setLine(text: string): string {
    const out = this.eraseLine();
    this.buf = text;
    this.cur = text.length;
    return out + text;
  }

  private eraseLine(): string {
    let out = '';
    if (this.cur < this.buf.length) out += `\x1b[${this.buf.length - this.cur}C`;
    out += '\b \b'.repeat(this.buf.length);
    return out;
  }

  private redrawTail(removed = 1): string {
    // after changing the buffer at cursor: print tail, blank `removed` leftover cells, move back
    const tail = this.buf.slice(this.cur);
    return tail + ' '.repeat(removed) + `\x1b[${tail.length + removed}D`;
  }

  feed(data: string): FeedResult {
    const res: FeedResult = { echo: '', lines: [], interrupt: false, eof: false };
    let i = 0;
    while (i < data.length) {
      const ch = data[i];

      if (ch === '\x1b') {
        const m = /^\x1b\[([0-9;]*)([A-Za-z~])/.exec(data.slice(i));
        if (m) {
          i += m[0].length;
          this.handleCsi(m[1], m[2], res);
          continue;
        }
        i += 1; // lone ESC or unsupported sequence: ignore
        continue;
      }

      i += 1;
      switch (ch) {
        case '\r':
        case '\n': {
          const line = this.buf;
          if (line.trim() && this.history[this.history.length - 1] !== line) {
            this.history.push(line);
            if (this.history.length > this.maxHistory) this.history.shift();
          }
          this.buf = '';
          this.cur = 0;
          this.histIdx = -1;
          this.draft = '';
          res.echo += '\r\n';
          res.lines.push(line);
          break;
        }
        case '\x7f':
        case '\b':
          if (this.cur > 0) {
            this.buf = this.buf.slice(0, this.cur - 1) + this.buf.slice(this.cur);
            this.cur -= 1;
            res.echo += '\b' + this.redrawTail();
          }
          break;
        case '\x03':
          this.buf = '';
          this.cur = 0;
          this.histIdx = -1;
          res.echo += '^C\r\n';
          res.interrupt = true;
          break;
        case '\x04':
          if (this.buf.length === 0) res.eof = true;
          break;
        case '\x15': // Ctrl+U: delete to start
          res.echo += this.deleteRange(0, this.cur);
          break;
        case '\x0b': // Ctrl+K: delete to end
          {
            const removed = this.buf.length - this.cur;
            this.buf = this.buf.slice(0, this.cur);
            if (removed > 0) res.echo += this.redrawTail(removed);
          }
          break;
        case '\x01':
          res.echo += this.moveTo(0);
          break;
        case '\x05':
          res.echo += this.moveTo(this.buf.length);
          break;
        case '\x17': { // Ctrl+W: delete previous word
          let j = this.cur;
          while (j > 0 && this.buf[j - 1] === ' ') j--;
          while (j > 0 && this.buf[j - 1] !== ' ') j--;
          res.echo += this.deleteRange(j, this.cur);
          break;
        }
        default:
          if (ch >= ' ' || ch === '\t') {
            const text = ch === '\t' ? '  ' : ch;
            this.buf = this.buf.slice(0, this.cur) + text + this.buf.slice(this.cur);
            this.cur += text.length;
            res.echo += this.cur === this.buf.length ? text : text + this.redrawTail();
          }
      }
    }
    return res;
  }

  private moveTo(pos: number): string {
    const d = pos - this.cur;
    this.cur = pos;
    if (d === 0) return '';
    return d > 0 ? `\x1b[${d}C` : `\x1b[${-d}D`;
  }

  private deleteRange(from: number, to: number): string {
    if (to <= from) return '';
    const n = to - from;
    this.buf = this.buf.slice(0, from) + this.buf.slice(to);
    const back = this.cur > from ? `\x1b[${this.cur - from}D` : '';
    this.cur = from;
    return back + this.redrawTail(n);
  }

  private handleCsi(params: string, final: string, res: FeedResult) {
    switch (final) {
      case 'A': // up
        if (this.history.length === 0) return;
        if (this.histIdx === -1) {
          this.draft = this.buf;
          this.histIdx = this.history.length - 1;
        } else if (this.histIdx > 0) {
          this.histIdx -= 1;
        } else return;
        res.echo += this.replaceWith(this.history[this.histIdx]);
        break;
      case 'B': // down
        if (this.histIdx === -1) return;
        if (this.histIdx < this.history.length - 1) {
          this.histIdx += 1;
          res.echo += this.replaceWith(this.history[this.histIdx]);
        } else {
          this.histIdx = -1;
          res.echo += this.replaceWith(this.draft);
        }
        break;
      case 'C':
        if (this.cur < this.buf.length) res.echo += this.moveTo(this.cur + 1);
        break;
      case 'D':
        if (this.cur > 0) res.echo += this.moveTo(this.cur - 1);
        break;
      case 'H':
        res.echo += this.moveTo(0);
        break;
      case 'F':
        res.echo += this.moveTo(this.buf.length);
        break;
      case '~':
        if (params === '3' && this.cur < this.buf.length) { // Delete
          this.buf = this.buf.slice(0, this.cur) + this.buf.slice(this.cur + 1);
          res.echo += this.redrawTail();
        } else if (params === '1') res.echo += this.moveTo(0);
        else if (params === '4') res.echo += this.moveTo(this.buf.length);
        break;
    }
  }

  private replaceWith(text: string): string {
    const out = this.eraseLine();
    this.buf = text;
    this.cur = text.length;
    return out + text;
  }
}
