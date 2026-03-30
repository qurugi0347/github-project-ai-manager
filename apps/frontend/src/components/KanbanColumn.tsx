import type { Task } from '@/types';
import TaskCard from '@/components/TaskCard';

interface KanbanColumnProps {
  title: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

const columnHeaderColor: Record<string, string> = {
  Todo: 'bg-gray-400',
  'In Progress': 'bg-blue-500',
  Done: 'bg-green-500',
};

export default function KanbanColumn({ title, tasks, onTaskClick }: KanbanColumnProps) {
  const dotColor = columnHeaderColor[title] ?? 'bg-gray-400';

  return (
    <div className="flex-1 min-w-[280px] bg-gray-50 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        <span className="text-xs text-gray-400 font-medium">({tasks.length})</span>
      </div>
      <div className="flex flex-col gap-2 max-h-[calc(100vh-400px)] overflow-y-auto">
        {tasks.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">No tasks</p>
        )}
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
        ))}
      </div>
    </div>
  );
}
