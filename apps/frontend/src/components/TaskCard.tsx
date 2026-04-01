import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '@/types';
import { normalizeAssignees } from '@/types';

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
  const assignees = normalizeAssignees(task.assignees);
  const displayAssignees = assignees.slice(0, 3);
  const extraCount = assignees.length - 3;

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
        {task.branch && (
          <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono inline-flex items-center gap-1">
            <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor"><path fillRule="evenodd" d="M11.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5zm-2.25.75a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.492 2.492 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25zM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5zM3.5 3.25a.75.75 0 1 1 1.5 0 .75.75 0 0 1-1.5 0z"/></svg>
            {task.branch}
          </span>
        )}
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
      {/* Author + Assignees avatars */}
      {(task.authorAvatarUrl || assignees.length > 0) && (
        <div className="flex items-center mt-2 pt-2 border-t border-gray-100">
          {task.authorAvatarUrl && (
            <img
              src={task.authorAvatarUrl}
              alt={task.authorLogin ?? 'author'}
              title={task.authorLogin ?? 'author'}
              className="w-5 h-5 rounded-full ring-1 ring-white"
            />
          )}
          {assignees.length > 0 && (
            <div className="flex items-center ml-auto -space-x-1.5">
              {displayAssignees.map((a) => (
                <img
                  key={a.login}
                  src={a.avatarUrl}
                  alt={a.login}
                  title={a.login}
                  className="w-5 h-5 rounded-full ring-1 ring-white"
                />
              ))}
              {extraCount > 0 && (
                <span className="text-xs text-gray-500 pl-1.5">+{extraCount}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
