import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Task } from '@/types';
import { normalizeAssignees } from '@/types';

interface TaskDetailPanelProps {
  task: Task | null;
  onClose: () => void;
}

const statusBadgeColor: Record<string, string> = {
  Todo: 'bg-gray-100 text-gray-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  Done: 'bg-green-100 text-green-700',
};

const contentTypeBadgeColor: Record<string, string> = {
  Issue: 'bg-purple-100 text-purple-700',
  DraftIssue: 'bg-yellow-100 text-yellow-700',
  PullRequest: 'bg-cyan-100 text-cyan-700',
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TaskDetailPanel({ task, onClose }: TaskDetailPanelProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (task) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [task]);

  if (!task) return null;

  const statusClass = statusBadgeColor[task.status] ?? 'bg-gray-100 text-gray-600';
  const contentTypeClass = contentTypeBadgeColor[task.contentType] ?? 'bg-gray-100 text-gray-600';

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
            <span className="text-sm text-gray-400 font-mono">#{task.id}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${contentTypeClass}`}>
              {task.contentType}
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

        {/* Title */}
        <h2 className="text-lg font-semibold text-gray-900 mb-3">{task.title}</h2>

        {/* Status badge */}
        <div className="flex items-center gap-2 mb-4">
          <span className={`text-xs px-2 py-1 rounded font-medium ${statusClass}`}>
            {task.status}
          </span>
        </div>

        {/* Branch */}
        {task.branch && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Branch</p>
            <span className="text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded font-mono inline-flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><path fillRule="evenodd" d="M11.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5zm-2.25.75a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.492 2.492 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25zM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5zM3.5 3.25a.75.75 0 1 1 1.5 0 .75.75 0 0 1-1.5 0z"/></svg>
              {task.branch}
            </span>
          </div>
        )}

        {/* Milestone */}
        {task.milestone && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Milestone</p>
            <span className="text-sm bg-blue-50 text-blue-600 px-2 py-1 rounded">
              {task.milestone.title}
            </span>
          </div>
        )}

        {/* Labels */}
        {task.labels && task.labels.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Labels</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {task.labels.map((label) => (
                <span
                  key={label.id}
                  className="text-xs px-2 py-0.5 rounded"
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
        )}

        {/* Author */}
        {task.authorLogin && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Author</p>
            <div className="flex items-center gap-2">
              {task.authorAvatarUrl && (
                <img
                  src={task.authorAvatarUrl}
                  alt={task.authorLogin}
                  className="w-6 h-6 rounded-full"
                />
              )}
              <span className="text-sm text-gray-700">{task.authorLogin}</span>
            </div>
          </div>
        )}

        {/* Assignees */}
        {task.assignees && task.assignees.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Assignees</p>
            <div className="flex items-center gap-2 flex-wrap">
              {normalizeAssignees(task.assignees).map((assignee) => (
                <span key={assignee.login} className="inline-flex items-center gap-1.5 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                  <img
                    src={assignee.avatarUrl}
                    alt={assignee.login}
                    className="w-4 h-4 rounded-full"
                  />
                  {assignee.login}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Body */}
        {task.body && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Description</p>
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 leading-relaxed [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1.5 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2 [&_li]:mb-0.5 [&_code]:bg-gray-200 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono [&_pre]:bg-gray-800 [&_pre]:text-gray-100 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:mb-2 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_a]:text-blue-600 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-3 [&_blockquote]:text-gray-500 [&_blockquote]:mb-2 [&_hr]:my-3 [&_hr]:border-gray-200 [&_strong]:font-semibold [&_table]:w-full [&_table]:border-collapse [&_table]:mb-2 [&_th]:border [&_th]:border-gray-300 [&_th]:px-2 [&_th]:py-1 [&_th]:bg-gray-100 [&_th]:text-left [&_th]:text-xs [&_td]:border [&_td]:border-gray-300 [&_td]:px-2 [&_td]:py-1 [&_td]:text-xs">
              <ReactMarkdown>{task.body ?? ''}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* Dates */}
        <div className="border-t border-gray-100 pt-4 mt-4">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Created: {formatDate(task.createdAt)}</span>
            <span>Updated: {formatDate(task.updatedAt)}</span>
          </div>
        </div>
      </div>
    </>
  );
}
