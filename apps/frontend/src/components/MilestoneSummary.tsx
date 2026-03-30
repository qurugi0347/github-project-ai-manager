import type { Milestone } from '@/types';

interface MilestoneSummaryProps {
  milestones: Milestone[];
  onMilestoneClick: (milestone: Milestone) => void;
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="w-full">
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-1">
        {done}/{total} done ({pct}%)
      </p>
    </div>
  );
}

export default function MilestoneSummary({ milestones, onMilestoneClick }: MilestoneSummaryProps) {
  if (milestones.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-3">No milestones</p>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {milestones.map((ms) => {
        const done = ms.doneCount ?? 0;
        const total = ms.taskCount ?? 0;

        return (
          <button
            key={ms.id}
            type="button"
            onClick={() => onMilestoneClick(ms)}
            className="flex-shrink-0 w-48 bg-white border border-gray-200 rounded-lg p-3 hover:border-blue-400 hover:shadow-sm transition-all cursor-pointer text-left"
          >
            <p className="text-sm font-semibold text-gray-800 truncate mb-2">{ms.title}</p>
            <ProgressBar done={done} total={total} />
          </button>
        );
      })}
    </div>
  );
}
