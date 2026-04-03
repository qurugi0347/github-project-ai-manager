interface AutoSyncIndicatorProps {
  isPolling: boolean;
  isSyncing: boolean;
  lastSyncAt: Date | null;
  nextSyncIn: number | null;
  hasError: boolean;
}

export default function AutoSyncIndicator({
  isPolling,
  isSyncing,
  lastSyncAt,
  nextSyncIn,
  hasError,
}: AutoSyncIndicatorProps) {
  if (!isPolling) return null;

  const formatTime = (seconds: number): string => {
    if (seconds >= 60) return `${Math.floor(seconds / 60)}m`;
    return `${seconds}s`;
  };

  const formatLastSync = (date: Date): string => {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-400">
      {/* 상태 dot */}
      <span
        className={`inline-block w-1.5 h-1.5 rounded-full ${
          isSyncing
            ? 'bg-green-400 animate-pulse'
            : hasError
              ? 'bg-orange-400'
              : 'bg-green-400'
        }`}
      />

      {/* 상태 텍스트 */}
      {isSyncing ? (
        <span>Syncing...</span>
      ) : hasError && nextSyncIn != null ? (
        <span>Retry in {formatTime(nextSyncIn)}</span>
      ) : nextSyncIn != null ? (
        <span>Next sync in {formatTime(nextSyncIn)}</span>
      ) : lastSyncAt ? (
        <span>Synced {formatLastSync(lastSyncAt)}</span>
      ) : (
        <span>Auto-sync</span>
      )}
    </div>
  );
}
