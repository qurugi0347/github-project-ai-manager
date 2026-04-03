import { useState, useCallback } from 'react';

const STORAGE_KEY = 'gpm-sync-settings';

export interface SyncSettings {
  interval: number; // 초 단위, 기본 300 (5분)
  auto: boolean; // 자동 폴링 활성화, 기본 true
  onFocus: boolean; // 탭 복귀 시 즉시 동기화, 기본 true
}

const DEFAULTS: SyncSettings = {
  interval: 300,
  auto: true,
  onFocus: true,
};

function loadSettings(): SyncSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(stored) };
  } catch {
    return DEFAULTS;
  }
}

export function useSyncSettings() {
  const [settings, setSettings] = useState<SyncSettings>(loadSettings);

  const updateSettings = useCallback((partial: Partial<SyncSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { settings, updateSettings };
}
