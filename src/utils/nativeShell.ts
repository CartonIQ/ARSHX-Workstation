import { Capacitor, registerPlugin, PluginListenerHandle } from '@capacitor/core';

export interface ShellDataEvent { id: string; data: string }
export interface ShellExitEvent { id: string; code: number }

export interface ArshxShellPlugin {
  start(opts: { id: string; projectId?: string }): Promise<{ cwd: string }>;
  write(opts: { id: string; data: string }): Promise<void>;
  kill(opts: { id: string }): Promise<void>;
  syncProject(opts: { projectId: string; files: { path: string; content: string }[] }): Promise<{ written: number; dir: string }>;
  readProject(opts: { projectId: string }): Promise<{ files: { path: string; content: string }[]; skipped: number }>;
  addListener(event: 'data', cb: (e: ShellDataEvent) => void): Promise<PluginListenerHandle>;
  addListener(event: 'exit', cb: (e: ShellExitEvent) => void): Promise<PluginListenerHandle>;
}

export const ArshxShell = registerPlugin<ArshxShellPlugin>('ArshxShell');

/** True only inside the Android app where the native plugin is registered. */
export function isNativeShellAvailable(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('ArshxShell');
  } catch {
    return false;
  }
}
