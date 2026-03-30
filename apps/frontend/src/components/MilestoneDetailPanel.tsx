import { useEffect, useState } from 'react';
import type { Task, Milestone } from '@/types';

interface MilestoneDetailPanelProps {
  milestone: Milestone | null;
  tasks: Task[];
  onClose: () => void;
  onTaskClick: (task: Task) => void;
}

const statusBadgeColor: Record<string, string> = {
  Todo: 'bg-gray-100 text-gray-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  Done: 'bg-green-100 text-green-700',
};

function isDueDatePast(dueDate: string): boolean {
  return new Date(dueDate) < new Date();
}

function formatDueDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function MilestoneDetailPanel({
  milestone,
  tasks,
  onClose,
  onTaskClick,
}: MilestoneDetailPanelProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (milestone) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [milestone]);

  if (!milestone) return null;

  const milestoneTasks = tasks.filter((t) => t.milestoneId === milestone.id);
  const done = milestone.doneCount ?? milestoneTasks.filter((t) => t.status === 'Done').length;
  const total = milestone.taskCount ?? milestoneTasks.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const stateBadgeClass = milestone.state === 'OPEN'
    ? 'bg-green-100 text-green-700'
    : 'bg-gray-100 text-gray-700';

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/20 z-40 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 bottom-0 w-[480px] max-w-full bg-white shadow-xl z-50 overflow-y-auto p-6 transition-transform duration-200 ${visible ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">{milestone.title}</h2>
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${stateBadgeClass}`}>
              {milestone.state}
            </span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Description */}
        {milestone.description && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 leading-relaxed">{milestone.description}</p>
          </div>
        )}

        {/* Due date */}
        {milestone.dueDate && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Due Date</p>
            <span
              className={`text-sm font-medium ${isDueDatePast(milestone.dueDate) ? 'text-red-500' : 'text-gray-700'}`}
            >
              {formatDueDate(milestone.dueDate)}
              {isDueDatePast(milestone.dueDate) && ' (overdue)'}
            </span>
          </div>
        )}

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Progress</p>
            <span className="text-xs text-gray-500">
              {done}/{total} done
            </span>
          </div>
          <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">{pct}% complete</p>
        </div>

        {/* Tasks list */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Tasks ({milestoneTasks.length})
          </p>
          {milestoneTasks.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">No tasks linked to this milestone</p>
          ) : (
            <div className="space-y-2">
              {milestoneTasks.map((task) => {
                const taskStatusClass = statusBadgeColor[task.status] ?? 'bg-gray-100 text-gray-600';

                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => onTaskClick(task)}
                    className="w-full text-left bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 hover:border-gray-300 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-gray-400 font-mono flex-shrink-0">#{task.id}</span>
                        <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                      </div>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ml-2 ${taskStatusClass}`}>
                        {task.status}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
