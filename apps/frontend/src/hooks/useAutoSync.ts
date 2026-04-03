import { useEffect, useRef, useState, useCallback } from 'react';
import { useSyncMutation } from './useSyncMutation';
import { useSyncSettings } from './useSyncSettings';

const MAX_INTERVAL = 1800; // 최대 30분 (초)

export interface AutoSyncState {
  isPolling: boolean;
  isSyncing: boolean;
  lastSyncAt: Date | null;
  nextSyncIn: number | null; // 다음 sync까지 남은 초
  hasError: boolean;
  consecutiveErrors: number;
}

export function useAutoSync(projectId: number) {
  const { settings } = useSyncSettings();
  const syncMutation = useSyncMutation(projectId);

  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [nextSyncIn, setNextSyncIn] = useState<number | null>(null);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isVisibleRef = useRef(true);
  const isMountedRef = useRef(true);

  // 현재 유효 interval 계산 (에러 백오프 적용)
  const getEffectiveInterval = useCallback(() => {
    const base = settings.interval;
    if (consecutiveErrors === 0) return base;
    return Math.min(base * Math.pow(2, consecutiveErrors), MAX_INTERVAL);
  }, [settings.interval, consecutiveErrors]);

  // sync 실행 함수
  const doSync = useCallback(() => {
    if (syncMutation.isPending || !isMountedRef.current) return;

    syncMutation.mutate(undefined, {
      onSuccess: () => {
        if (!isMountedRef.current) return;
        setConsecutiveErrors(0);
        setLastSyncAt(new Date());
      },
      onError: () => {
        if (!isMountedRef.current) return;
        setConsecutiveErrors((prev) => prev + 1);
      },
    });
  }, [syncMutation]);

  // 타이머 스케줄
  const scheduleNext = useCallback(() => {
    // 기존 타이머 클리어
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    if (!settings.auto || !isVisibleRef.current) {
      setNextSyncIn(null);
      return;
    }

    const intervalSec = getEffectiveInterval();
    setNextSyncIn(intervalSec);

    // 카운트다운
    countdownRef.current = setInterval(() => {
      setNextSyncIn((prev) => {
        if (prev === null || prev <= 1) return null;
        return prev - 1;
      });
    }, 1000);

    // 다음 sync 예약
    timerRef.current = setTimeout(() => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      doSync();
    }, intervalSec * 1000);
  }, [settings.auto, getEffectiveInterval, doSync]);

  // sync 완료/실패 후 다음 스케줄
  useEffect(() => {
    if (!syncMutation.isPending && settings.auto && isVisibleRef.current) {
      scheduleNext();
    }
  }, [syncMutation.isPending, syncMutation.status, scheduleNext, settings.auto]);

  // 탭 비활성 처리
  useEffect(() => {
    const handleVisibility = () => {
      isVisibleRef.current = document.visibilityState === 'visible';

      if (!isVisibleRef.current) {
        // hidden: 타이머 정지
        if (timerRef.current) clearTimeout(timerRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
        setNextSyncIn(null);
      } else {
        // visible: 즉시 sync + 타이머 재시작
        if (settings.onFocus && settings.auto) {
          doSync();
        } else if (settings.auto) {
          scheduleNext();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [settings.onFocus, settings.auto, doSync, scheduleNext]);

  // 초기 타이머 시작
  useEffect(() => {
    if (settings.auto && projectId) {
      scheduleNext();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]); // projectId 변경 시만 재시작

  // cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    isPolling: settings.auto && isVisibleRef.current,
    isSyncing: syncMutation.isPending,
    lastSyncAt,
    nextSyncIn,
    hasError: consecutiveErrors > 0,
    consecutiveErrors,
  } satisfies AutoSyncState;
}
