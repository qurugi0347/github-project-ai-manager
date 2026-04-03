import { useSyncExternalStore, useCallback } from 'react';

const STORAGE_KEY = 'gpm-sync-settings';

export interface SyncSettings {
  interval: number;
  auto: boolean;
  onFocus: boolean;
}

const DEFAULTS: SyncSettings = {
  interval: 300,
  auto: true,
  onFocus: true,
};

function loadFromStorage(): SyncSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(stored) };
  } catch {
    return DEFAULTS;
  }
}

let currentSettings: SyncSettings = loadFromStorage();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function getSnapshot(): SyncSettings {
  return currentSettings;
}

export function useSyncSettings() {
  const settings = useSyncExternalStore(subscribe, getSnapshot);

  const updateSettings = useCallback((partial: Partial<SyncSettings>) => {
    currentSettings = { ...currentSettings, ...partial };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentSettings));
    listeners.forEach((l) => l());
  }, []);

  return { settings, updateSettings };
}
