/** Pure helpers behind the Dev Toolkit screen (no DOM access, easy to test). */

export function formatJson(input: string, indent = 2): string {
  return JSON.stringify(JSON.parse(input), null, indent);
}

export function minifyJson(input: string): string {
  return JSON.stringify(JSON.parse(input));
}

export function base64Encode(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

export function base64Decode(input: string): string {
  const clean = input.trim().replace(/-/g, '+').replace(/_/g, '/');
  const padded = clean + '='.repeat((4 - (clean.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

export const urlEncode = (s: string) => encodeURIComponent(s);
export const urlDecode = (s: string) => decodeURIComponent(s);

export function uuidV4(): string {
  const c: any = (globalThis as any).crypto;
  if (c?.randomUUID) return c.randomUUID();
  const b = new Uint8Array(16);
  c.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export async function shaHex(algo: 'SHA-1' | 'SHA-256' | 'SHA-512', input: string): Promise<string> {
  const buf = await (globalThis as any).crypto.subtle.digest(algo, new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf), (x) => x.toString(16).padStart(2, '0')).join('');
}

/** Decodes a JWT's header and payload. It does NOT verify the signature. */
export function decodeJwt(token: string): string {
  const parts = token.trim().split('.');
  if (parts.length < 2) throw new Error('Not a JWT (expected header.payload.signature)');
  const header = JSON.parse(base64Decode(parts[0]));
  const payload = JSON.parse(base64Decode(parts[1]));
  const out: Record<string, unknown> = { header, payload };
  for (const k of ['exp', 'iat', 'nbf']) {
    if (typeof payload[k] === 'number') out[`${k}_iso`] = new Date(payload[k] * 1000).toISOString();
  }
  out.note = 'Signature is not verified';
  return JSON.stringify(out, null, 2);
}

export function timestampConvert(input: string): string {
  const t = input.trim();
  if (!t) return new Date().toISOString() + `\n${Math.floor(Date.now() / 1000)} (unix seconds, now)`;
  if (/^-?\d+(\.\d+)?$/.test(t)) {
    const n = Number(t);
    const ms = Math.abs(n) < 1e11 ? n * 1000 : n; // seconds vs milliseconds
    const d = new Date(ms);
    if (isNaN(d.getTime())) throw new Error('Invalid timestamp');
    return `${d.toISOString()}\n${d.toString()}`;
  }
  const d = new Date(t);
  if (isNaN(d.getTime())) throw new Error('Unrecognised date or timestamp');
  return `${Math.floor(d.getTime() / 1000)} (unix seconds)\n${d.getTime()} (milliseconds)\n${d.toISOString()}`;
}

export function parseColor(input: string): { r: number; g: number; b: number } {
  const s = input.trim().toLowerCase();
  let m = s.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (m) {
    let h = m[1];
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  }
  m = s.match(/^rgb\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*\)$/);
  if (m) {
    const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (r > 255 || g > 255 || b > 255) throw new Error('RGB values must be 0-255');
    return { r, g, b };
  }
  throw new Error('Use #RRGGBB, #RGB or rgb(r, g, b)');
}

export function colorConvert(input: string): string {
  const { r, g, b } = parseColor(input);
  const hex = '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase();
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
  }
  // WCAG relative luminance -> best text colour + contrast ratio on white/black
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const lum = 0.2126 * lin(rn) + 0.7152 * lin(gn) + 0.0722 * lin(bn);
  const onWhite = (1.05) / (lum + 0.05);
  const onBlack = (lum + 0.05) / 0.05;
  return [
    `HEX  ${hex}`,
    `RGB  rgb(${r}, ${g}, ${b})`,
    `HSL  hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`,
    `Contrast on white ${onWhite.toFixed(2)}:1, on black ${onBlack.toFixed(2)}:1`,
  ].join('\n');
}

export interface RegexResult {
  matches: { text: string; index: number; groups: string[] }[];
  error?: string;
}

export function testRegex(pattern: string, flags: string, text: string, limit = 200): RegexResult {
  if (!pattern) return { matches: [] };
  try {
    const f = flags.includes('g') ? flags : flags + 'g';
    const re = new RegExp(pattern, f);
    const matches: RegexResult['matches'] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null && matches.length < limit) {
      matches.push({ text: m[0], index: m.index, groups: m.slice(1).map((g) => g ?? '') });
      if (m[0] === '') re.lastIndex++; // avoid infinite loop on empty matches
    }
    return { matches };
  } catch (e: any) {
    return { matches: [], error: e?.message || 'Invalid regular expression' };
  }
}

export function textStats(text: string): string {
  const lines = text === '' ? 0 : text.split('\n').length;
  const words = (text.match(/\S+/g) || []).length;
  return `${lines} lines, ${words} words, ${text.length} characters, ${new TextEncoder().encode(text).length} bytes`;
}
