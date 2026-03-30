import type { Task } from '@/types';
import KanbanColumn from '@/components/KanbanColumn';

interface KanbanBoardProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

const COLUMNS = ['Todo', 'In Progress', 'Done'] as const;

export default function KanbanBoard({ tasks, onTaskClick }: KanbanBoardProps) {
  const grouped = tasks.reduce<Record<string, Task[]>>(
    (acc, task) => {
      const status = COLUMNS.includes(task.status as typeof COLUMNS[number])
        ? task.status
        : 'Todo';
      acc[status] = [...(acc[status] ?? []), task];
      return acc;
    },
    { Todo: [], 'In Progress': [], Done: [] },
  );

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {COLUMNS.map((column) => (
        <KanbanColumn
          key={column}
          title={column}
          tasks={grouped[column]}
          onTaskClick={onTaskClick}
        />
      ))}
    </div>
  );
}
