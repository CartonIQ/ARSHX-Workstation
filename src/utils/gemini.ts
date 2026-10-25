/**
 * On-device Gemini client.
 *
 * The APK has no backend, so requests go straight from the device to the
 * Gemini REST API using a key the user enters in Settings > AI. The key is
 * kept in this app's private WebView storage only and is sent solely to
 * generativelanguage.googleapis.com in the `x-goog-api-key` header
 * (never in a URL, never logged).
 */

const KEY_STORAGE = 'arshx_gemini_key_v1';
const MODEL_STORAGE = 'arshx_gemini_model_v1';
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

export const DEFAULT_MODEL = 'gemini-2.5-flash';
export const MODEL_CHOICES = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.5-flash-lite'];

type Listener = () => void;
const listeners = new Set<Listener>();
const notify = () => listeners.forEach((l) => l());

export function subscribeAiConfig(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getApiKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) || '';
  } catch {
    return '';
  }
}

export function hasApiKey(): boolean {
  return getApiKey().length > 0;
}

export function setApiKey(key: string): void {
  try {
    const trimmed = key.trim();
    if (trimmed) localStorage.setItem(KEY_STORAGE, trimmed);
    else localStorage.removeItem(KEY_STORAGE);
  } catch {
    /* storage unavailable */
  }
  notify();
}

export function getModel(): string {
  try {
    return localStorage.getItem(MODEL_STORAGE) || DEFAULT_MODEL;
  } catch {
    return DEFAULT_MODEL;
  }
}

export function setModel(model: string): void {
  try {
    localStorage.setItem(MODEL_STORAGE, model.trim() || DEFAULT_MODEL);
  } catch {
    /* storage unavailable */
  }
  notify();
}

/** Basic shape check only; real validation is testApiKey(). */
export function looksLikeApiKey(key: string): boolean {
  return /^[A-Za-z0-9_-]{20,}$/.test(key.trim());
}

export class AiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'AiError';
    this.status = status;
  }
}

interface GenerateOptions {
  system?: string;
  temperature?: number;
  json?: boolean;
  timeoutMs?: number;
  keyOverride?: string;
  modelOverride?: string;
}

function friendlyHttpError(status: number, apiMessage?: string): string {
  switch (status) {
    case 400:
      return apiMessage?.toLowerCase().includes('api key')
        ? 'Gemini rejected the API key. Check it in Settings > AI.'
        : `Gemini could not process the request. ${apiMessage || ''}`.trim();
    case 401:
    case 403:
      return 'Gemini rejected the API key or it lacks access. Check it in Settings > AI.';
    case 404:
      return 'The selected Gemini model was not found. Pick another model in Settings > AI.';
    case 429:
      return 'Gemini rate limit or quota reached. Wait a moment and try again.';
    default:
      return status >= 500
        ? 'Gemini is temporarily unavailable. Try again shortly.'
        : `Gemini request failed (HTTP ${status}). ${apiMessage || ''}`.trim();
  }
}

export async function generate(prompt: string, opts: GenerateOptions = {}): Promise<string> {
  const key = opts.keyOverride ?? getApiKey();
  if (!key) {
    throw new AiError('Add your Gemini API key in Settings > AI to use AI features.', 401);
  }
  const model = opts.modelOverride ?? getModel();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 60000);

  const body: Record<string, unknown> = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.3,
      ...(opts.json ? { responseMimeType: 'application/json' } : {}),
    },
  };
  if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };

  let res: Response;
  try {
    res = await fetch(`${ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') throw new AiError('The AI request timed out. Try again.');
    throw new AiError('Could not reach Gemini. Check your internet connection.');
  } finally {
    clearTimeout(timer);
  }

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON error body */
  }

  if (!res.ok) {
    throw new AiError(friendlyHttpError(res.status, data?.error?.message), res.status);
  }

  const parts = data?.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts) ? parts.map((p: any) => p?.text || '').join('') : '';
  if (!text) {
    const reason = data?.promptFeedback?.blockReason || data?.candidates?.[0]?.finishReason;
    throw new AiError(
      reason ? `Gemini returned no content (${reason}).` : 'Gemini returned an empty response.'
    );
  }
  return text;
}

/** Verifies a key with a tiny request. Resolves true or throws AiError. */
export async function testApiKey(key: string, model?: string): Promise<true> {
  await generate('Reply with the single word: ok', {
    keyOverride: key.trim(),
    modelOverride: model,
    temperature: 0,
    timeoutMs: 20000,
  });
  return true;
}

function parseJson<T>(text: string): T {
  const clean = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(clean) as T;
  } catch {
    throw new AiError('The AI returned malformed data. Please try again.');
  }
}

/* ------------------------------ Prompts ------------------------------ */

const ENGINEER_SYSTEM = `You are ARSHX AI Code Engineer, the built-in coding partner of the ARSHX Workstation.
You are an expert in modern Android (Kotlin, Jetpack Compose, Material 3, Gradle, Termux), modern web and full-stack development (React, TypeScript, HTML/CSS/JS, Node.js), and mobile-first, offline workflows.
Be concise and practical. Give production-ready code in markdown code blocks with language identifiers.
When asked to fix or implement something, state the concrete change, then give drop-in code.
For terminal commands, give exact, copy-pasteable commands for Termux or POSIX shells.`;

export interface ChatInput {
  message: string;
  fileContext?: { filename: string; language?: string; content: string };
  history?: { role: string; text: string }[];
}

export async function aiChat({ message, fileContext, history = [] }: ChatInput): Promise<string> {
  const ctx = fileContext?.filename
    ? `\n\n--- Current Active File: ${fileContext.filename} ---\n\`\`\`${fileContext.language || ''}\n${fileContext.content || ''}\n\`\`\`\n`
    : '';
  const prior = history.length
    ? `Prior conversation:\n${history
        .map((h) => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.text}`)
        .join('\n')}\n\nUser: ${message}${ctx}`
    : `${message}${ctx}`;
  return generate(prior, { system: ENGINEER_SYSTEM, temperature: 0.4 });
}

export async function aiDesigner(prompt: string): Promise<unknown> {
  const system = `You are the ARSHX UI Designer Engine.
Return ONLY a valid JSON object with this exact schema:
{
  "screenTitle": "string",
  "category": "string",
  "theme": { "accentColor": "#RRGGBB", "backgroundColor": "#RRGGBB", "borderRadius": "rounded-2xl" },
  "components": [
    { "id": "c1", "type": "header|metric|chart|actions|list|bottom_nav", "title": "string", "subtitle": "string", "visible": true }
  ],
  "generatedComposeCode": "string (complete Android Jetpack Compose Kotlin code)"
}`;
  const text = await generate(
    `Design an Android Compose screen for: "${prompt}". Return valid JSON matching the schema.`,
    { system, json: true, timeoutMs: 90000 }
  );
  return parseJson(text);
}

export async function aiCreator(prompt: string, platform: string): Promise<unknown> {
  const system = `You are the ARSHX Project Creator Engine.
Create a complete multi-file project from the prompt. Return ONLY a valid JSON object:
{
  "projectName": "string",
  "description": "string",
  "platform": "${platform}",
  "architecturePlan": [ { "step": "string", "detail": "string", "files": ["string"] } ],
  "files": [ { "name": "string", "path": "string", "language": "string", "content": "full file content" } ]
}`;
  const text = await generate(`Create a complete ${platform} project for: "${prompt}".`, {
    system,
    json: true,
    timeoutMs: 120000,
  });
  return parseJson(text);
}

/**
 * Compatibility shim for the former Express endpoints. Components call
 * aiFetch('/api/ai/...') exactly as they called fetch(); the request is
 * served on-device and returned as a standard Response.
 */
export async function aiFetch(path: string, init?: RequestInit): Promise<Response> {
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  try {
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : {};
    switch (path) {
      case '/api/ai/chat':
        return json({ reply: await aiChat(body), isFallback: false });
      case '/api/ai/designer':
        return json({ spec: await aiDesigner(String(body.prompt || '')), isFallback: false });
      case '/api/ai/creator':
        return json({
          project: await aiCreator(String(body.prompt || ''), String(body.platform || 'android')),
          isFallback: false,
        });
      default:
        return json({ error: `Unknown AI route: ${path}` }, 404);
    }
  } catch (err: any) {
    const status = err instanceof AiError && err.status ? err.status : 500;
    return json({ error: err?.message || 'AI request failed.' }, status);
  }
}
