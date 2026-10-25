/** Extracts a single shell command from an AI reply (strips fences/prose). */
export function extractCommand(reply: string): string {
  const fenced = /```[a-zA-Z]*\n([\s\S]*?)```/.exec(reply);
  const raw = (fenced ? fenced[1] : reply).trim();
  const first = raw.split('\n').map((l) => l.trim()).find((l) => l && !l.startsWith('#'));
  return (first || '').replace(/^\$\s+/, '');
}

export const COMMAND_PROMPT = (task: string) =>
  `Reply with exactly ONE shell command for the Android sh shell (toybox/mksh, no root, no sudo, no apt). ` +
  `No explanation and no markdown. If it cannot be done with Android's built-in tools, reply with: echo "Not possible with built-in tools". ` +
  `Task: ${task}`;

/** Flags obviously destructive commands so the UI can warn before running. */
export function isRiskyCommand(cmd: string): boolean {
  return /\brm\s+(-[a-zA-Z]*[rf][a-zA-Z]*\s+)+(\/|~|\*|\.)(\s|$)|\bdd\s+if=|\bmkfs|:\(\)\s*\{|>\s*\/dev\/(sd|block)/.test(cmd);
}
