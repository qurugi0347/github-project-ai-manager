import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { HookDefinition } from '../hooks/hook-registry';

interface HookEntry {
  matcher?: string;
  hooks: Array<{
    type: string;
    command: string;
  }>;
}

function readSettings(settingsPath: string): Record<string, unknown> {
  if (!existsSync(settingsPath)) return {};
  try {
    return JSON.parse(readFileSync(settingsPath, 'utf-8'));
  } catch {
    return {};
  }
}

function writeSettings(settingsPath: string, settings: Record<string, unknown>): void {
  mkdirSync(dirname(settingsPath), { recursive: true });
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
}

function hookCommand(hook: HookDefinition): string {
  return `.claude/hooks/${hook.fileName}`;
}

export function mergeHookSettings(settingsPath: string, hooks: HookDefinition[]): boolean {
  const settings = readSettings(settingsPath);
  const currentHooks = (settings.hooks ?? {}) as Record<string, HookEntry[]>;
  let changed = false;

  for (const hook of hooks) {
    const existing = currentHooks[hook.event] ?? [];
    const cmd = hookCommand(hook);
    const alreadyRegistered = existing.some((e) =>
      e.hooks?.some((h) => h.command === cmd),
    );

    if (!alreadyRegistered) {
      const entry: HookEntry = {
        hooks: [{ type: 'command', command: cmd }],
      };
      if (hook.matcher) {
        entry.matcher = hook.matcher;
      }
      currentHooks[hook.event] = [...existing, entry];
      changed = true;
    }
  }

  if (changed) {
    settings.hooks = currentHooks;
    writeSettings(settingsPath, settings);
  }

  return changed;
}

export function removeHookSettings(settingsPath: string, hooks: HookDefinition[]): boolean {
  if (!existsSync(settingsPath)) return false;

  const settings = readSettings(settingsPath);
  const currentHooks = (settings.hooks ?? {}) as Record<string, HookEntry[]>;
  let changed = false;

  for (const hook of hooks) {
    const existing = currentHooks[hook.event];
    if (!existing) continue;

    const cmd = hookCommand(hook);
    const filtered = existing.filter((e) =>
      !e.hooks?.some((h) => h.command === cmd),
    );

    if (filtered.length !== existing.length) {
      if (filtered.length === 0) {
        delete currentHooks[hook.event];
      } else {
        currentHooks[hook.event] = filtered;
      }
      changed = true;
    }
  }

  if (changed) {
    settings.hooks = currentHooks;
    writeSettings(settingsPath, settings);
  }

  return changed;
}

export interface InstalledHookInfo {
  name: string;
  description: string;
  fileInstalled: boolean;
  settingsRegistered: boolean;
}

export function getInstalledHooks(
  hooksDir: string,
  settingsPath: string,
  registry: HookDefinition[],
): InstalledHookInfo[] {
  const settings = readSettings(settingsPath);
  const currentHooks = (settings.hooks ?? {}) as Record<string, HookEntry[]>;

  return registry.map((hook) => {
    const cmd = hookCommand(hook);
    const entries = currentHooks[hook.event] ?? [];
    const settingsRegistered = entries.some((e) =>
      e.hooks?.some((h) => h.command === cmd),
    );

    return {
      name: hook.name,
      description: hook.description,
      fileInstalled: existsSync(join(hooksDir, hook.fileName)),
      settingsRegistered,
    };
  });
}
