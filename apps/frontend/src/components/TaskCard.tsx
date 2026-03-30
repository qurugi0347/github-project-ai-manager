import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '@/types';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  isDragOverlay?: boolean;
}

const contentTypeBadgeColor: Record<string, string> = {
  Issue: 'bg-purple-100 text-purple-700',
  DraftIssue: 'bg-yellow-100 text-yellow-700',
  PullRequest: 'bg-green-100 text-green-700',
};

export default function TaskCard({ task, onClick, isDragOverlay }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: isDragOverlay,
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  const badgeClass = contentTypeBadgeColor[task.contentType] ?? 'bg-gray-100 text-gray-600';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick();
      }}
      className={`w-full text-left bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs text-gray-400 font-mono">#{task.id}</span>
        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${badgeClass}`}>
          {task.contentType}
        </span>
      </div>
      <p className="text-sm font-medium text-gray-900 leading-snug mb-2">{task.title}</p>
      <div className="flex items-center gap-2 flex-wrap">
        {task.milestone && (
          <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
            {task.milestone.title}
          </span>
        )}
        {task.labels?.map((label) => (
          <span
            key={label.id}
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: label.color ? `#${label.color}20` : undefined,
              color: label.color ? `#${label.color}` : undefined,
            }}
          >
            {label.name}
          </span>
        ))}
      </div>
    </div>
  );
}
