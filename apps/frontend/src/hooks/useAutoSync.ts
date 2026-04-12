import { useEffect, useRef, useState, useCallback } from 'react';
import { useSyncMutation } from './useSyncMutation';
import { useSyncSettings } from './useSyncSettings';

const MAX_INTERVAL = 1800;

export interface AutoSyncState {
  isPolling: boolean;
  isSyncing: boolean;
  lastSyncAt: Date | null;
  nextSyncIn: number | null;
  hasError: boolean;
  consecutiveErrors: number;
}

export function useAutoSync(projectId: number) {
  const { settings } = useSyncSettings();
  const syncMutation = useSyncMutation(projectId);

  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [nextSyncIn, setNextSyncIn] = useState<number | null>(null);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ref로 안정화 (무한 루프 방지)
  const syncMutateRef = useRef(syncMutation.mutate);
  syncMutateRef.current = syncMutation.mutate;
  const isPendingRef = useRef(syncMutation.isPending);
  isPendingRef.current = syncMutation.isPending;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const consecutiveErrorsRef = useRef(consecutiveErrors);
  consecutiveErrorsRef.current = consecutiveErrors;

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    timerRef.current = null;
    countdownRef.current = null;
  }, []);

  // sync 실행 (의존성 없음 - ref 사용)
  const doSync = useCallback(() => {
    if (isPendingRef.current) return;

    syncMutateRef.current(undefined, {
      onSuccess: () => {
        setConsecutiveErrors(0);
        setLastSyncAt(new Date());
      },
      onError: () => {
        setConsecutiveErrors((prev) => prev + 1);
      },
    });
  }, []);

  // 유효 interval 계산
  const getEffectiveInterval = useCallback(() => {
    const base = settingsRef.current.interval;
    const errors = consecutiveErrorsRef.current;
    if (errors === 0) return base;
    return Math.min(base * Math.pow(2, errors), MAX_INTERVAL);
  }, []);

  // 타이머 스케줄 (의존성 없음 - ref 사용)
  const scheduleNext = useCallback(() => {
    clearTimers();

    if (!settingsRef.current.auto) {
      setNextSyncIn(null);
      return;
    }

    const intervalSec = getEffectiveInterval();
    setNextSyncIn(intervalSec);

    countdownRef.current = setInterval(() => {
      setNextSyncIn((prev) => {
        if (prev === null || prev <= 1) return null;
        return prev - 1;
      });
    }, 1000);

    timerRef.current = setTimeout(() => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      doSync();
    }, intervalSec * 1000);
  }, [clearTimers, getEffectiveInterval, doSync]);

  // sync 완료/실패 후 다음 스케줄 (status 실제 변경만 감지)
  const prevStatusRef = useRef(syncMutation.status);
  useEffect(() => {
    if (prevStatusRef.current === syncMutation.status) return;
    prevStatusRef.current = syncMutation.status;

    if (!syncMutation.isPending && settingsRef.current.auto && isVisible) {
      scheduleNext();
    }
  }, [syncMutation.status, syncMutation.isPending, isVisible, scheduleNext]);

  // 탭 비활성 처리
  useEffect(() => {
    const handleVisibility = () => {
      const visible = document.visibilityState === 'visible';
      setIsVisible(visible);

      if (!visible) {
        clearTimers();
        setNextSyncIn(null);
      } else {
        if (settingsRef.current.onFocus && settingsRef.current.auto) {
          doSync();
        } else if (settingsRef.current.auto) {
          scheduleNext();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [doSync, scheduleNext, clearTimers]);

  // cleanup on unmount / projectId change
  useEffect(() => {
    return () => clearTimers();
  }, [projectId, clearTimers]);

  return {
    syncMutation,
    isPolling: settings.auto && isVisible,
    isSyncing: syncMutation.isPending,
    lastSyncAt,
    nextSyncIn,
    hasError: consecutiveErrors > 0,
    consecutiveErrors,
  };
}
