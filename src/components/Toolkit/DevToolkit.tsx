import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Check, ArrowUpFromLine, Trash2, Braces, Binary, Link2, Hash, Regex, Palette, Clock, KeyRound, Fingerprint } from 'lucide-react';
import * as dt from '../../utils/devTools';

type Mode = { id: string; label: string; run: (input: string) => string | Promise<string>; needsInput?: boolean };
type Tool = { id: string; label: string; icon: React.ElementType; hint: string; modes: Mode[] };

const TOOLS: Tool[] = [
  {
    id: 'json', label: 'JSON', icon: Braces, hint: 'Paste JSON to format or minify. Errors show where parsing failed.',
    modes: [
      { id: 'fmt', label: 'Format', run: (s) => dt.formatJson(s) },
      { id: 'min', label: 'Minify', run: (s) => dt.minifyJson(s) },
    ],
  },
  {
    id: 'base64', label: 'Base64', icon: Binary, hint: 'UTF-8 safe. Decoding also accepts URL-safe Base64.',
    modes: [
      { id: 'enc', label: 'Encode', run: dt.base64Encode },
      { id: 'dec', label: 'Decode', run: dt.base64Decode },
    ],
  },
  {
    id: 'url', label: 'URL', icon: Link2, hint: 'Percent-encode or decode a URL component.',
    modes: [
      { id: 'enc', label: 'Encode', run: dt.urlEncode },
      { id: 'dec', label: 'Decode', run: dt.urlDecode },
    ],
  },
  {
    id: 'hash', label: 'Hash', icon: Hash, hint: 'Computed on this device with the Web Crypto API.',
    modes: [
      { id: 'sha256', label: 'SHA-256', run: (s) => dt.shaHex('SHA-256', s) },
      { id: 'sha1', label: 'SHA-1', run: (s) => dt.shaHex('SHA-1', s) },
      { id: 'sha512', label: 'SHA-512', run: (s) => dt.shaHex('SHA-512', s) },
    ],
  },
  {
    id: 'jwt', label: 'JWT', icon: KeyRound, hint: 'Decodes header and payload only. The signature is NOT verified.',
    modes: [{ id: 'dec', label: 'Decode', run: dt.decodeJwt }],
  },
  {
    id: 'time', label: 'Time', icon: Clock, hint: 'Unix seconds or milliseconds to a date, or a date to Unix. Leave empty for now.',
    modes: [{ id: 'conv', label: 'Convert', run: dt.timestampConvert, needsInput: false }],
  },
  {
    id: 'color', label: 'Color', icon: Palette, hint: 'Enter #RRGGBB, #RGB or rgb(r, g, b). Shows HEX, RGB, HSL and contrast.',
    modes: [{ id: 'conv', label: 'Convert', run: dt.colorConvert }],
  },
  {
    id: 'uuid', label: 'UUID', icon: Fingerprint, hint: 'Random version 4 UUIDs.',
    modes: [
      { id: 'one', label: 'New UUID', run: () => dt.uuidV4(), needsInput: false },
      { id: 'five', label: '5 UUIDs', run: () => Array.from({ length: 5 }, () => dt.uuidV4()).join('\n'), needsInput: false },
    ],
  },
];

export const DevToolkit: React.FC = () => {
  const [toolId, setToolId] = useState<string>('json');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [pattern, setPattern] = useState('');
  const [flags, setFlags] = useState('g');
  const [text, setText] = useState('');

  const tool = useMemo(() => TOOLS.find((t) => t.id === toolId), [toolId]);

  useEffect(() => {
    setOutput('');
    setError('');
  }, [toolId]);

  const regexResult = useMemo(() => dt.testRegex(pattern, flags, text), [pattern, flags, text]);

  const run = async (mode: Mode) => {
    setError('');
    try {
      if (mode.needsInput !== false && !input.trim()) {
        setOutput('');
        setError('Enter some input first.');
        return;
      }
      setOutput(await mode.run(input));
    } catch (e: any) {
      setOutput('');
      setError(e?.message || 'Could not process this input.');
    }
  };

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('Copy is not available here. Select the text and copy manually.');
    }
  };

  const chip = (active: boolean) =>
    `shrink-0 flex items-center gap-1.5 px-3 min-h-[40px] rounded-xl text-xs font-bold border transition-colors ${
      active ? 'btn-primary !min-h-[40px]' : 'glass-card !rounded-xl text-[#E4E4EC]'
    }`;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      <div className="p-3 space-y-3 max-w-3xl w-full mx-auto">
        <div>
          <h1 className="text-base font-extrabold text-white">Dev Toolkit</h1>
          <p className="text-xs text-[#B4B4C2]">Quick utilities that run fully on your device. Nothing is uploaded.</p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-3 px-3 no-scrollbar" role="tablist" aria-label="Tools">
          {TOOLS.map(({ id, label, icon: Icon }) => (
            <button key={id} role="tab" aria-selected={toolId === id} onClick={() => setToolId(id)} className={chip(toolId === id)}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
          <button role="tab" aria-selected={toolId === 'regex'} onClick={() => setToolId('regex')} className={chip(toolId === 'regex')}>
            <Regex className="w-4 h-4" /> Regex
          </button>
        </div>

        {toolId === 'regex' ? (
          <div className="glass-card p-3 space-y-3">
            <p className="text-[11px] text-[#9494A6]">Test a JavaScript regular expression. Matches update as you type.</p>
            <div className="flex gap-2">
              <input value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="pattern e.g. (\d+)-(\w)" aria-label="Pattern" autoCapitalize="off" autoCorrect="off" spellCheck={false} className="glass-input flex-1 min-w-0 font-mono" />
              <input value={flags} onChange={(e) => setFlags(e.target.value.replace(/[^dgimsuvy]/g, ''))} aria-label="Flags" className="glass-input w-20 font-mono text-center" />
            </div>
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Text to test" aria-label="Test text" rows={5} spellCheck={false} className="glass-input w-full font-mono resize-y" />
            {regexResult.error ? (
              <p role="alert" className="text-xs font-semibold text-[#FF5E65]">{regexResult.error}</p>
            ) : (
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-white">{regexResult.matches.length} match{regexResult.matches.length === 1 ? '' : 'es'}</p>
                {regexResult.matches.slice(0, 50).map((m, i) => (
                  <div key={i} className="rounded-lg bg-black/30 border border-white/10 px-2.5 py-1.5 font-mono text-[11px] text-[#E4E4EC] break-all">
                    <span className="text-[#FF5E65]">#{i + 1}</span> @{m.index}: {m.text === '' ? '(empty)' : m.text}
                    {m.groups.length > 0 && <div className="text-[#9494A6]">groups: {m.groups.map((g, j) => `${j + 1}="${g}"`).join(' ')}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          tool && (
            <div className="glass-card p-3 space-y-3">
              <p className="text-[11px] text-[#9494A6]">{tool.hint}</p>
              <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Input" aria-label="Input" rows={6} autoCapitalize="off" autoCorrect="off" spellCheck={false} className="glass-input w-full font-mono resize-y" />
              <div className="flex flex-wrap gap-2">
                {tool.modes.map((m) => (
                  <button key={m.id} onClick={() => run(m)} className="btn-primary">{m.label}</button>
                ))}
                <button onClick={() => { setInput(''); setOutput(''); setError(''); }} className="btn-ghost" aria-label="Clear"><Trash2 className="w-4 h-4" /></button>
              </div>
              {error && <p role="alert" className="text-xs font-semibold text-[#FF5E65] break-words">{error}</p>}
              {output && (
                <div className="space-y-2">
                  <pre className="rounded-xl bg-black/35 border border-white/10 p-3 text-[12px] leading-relaxed font-mono text-[#F7F7FA] whitespace-pre-wrap break-all max-h-80 overflow-auto select-text">{output}</pre>
                  <div className="flex gap-2">
                    <button onClick={() => copy(output)} className="btn-ghost">{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}{copied ? 'Copied' : 'Copy'}</button>
                    <button onClick={() => { setInput(output); setOutput(''); }} className="btn-ghost"><ArrowUpFromLine className="w-4 h-4" />Use as input</button>
                  </div>
                  <p className="text-[11px] text-[#9494A6]">{dt.textStats(output)}</p>
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
};
