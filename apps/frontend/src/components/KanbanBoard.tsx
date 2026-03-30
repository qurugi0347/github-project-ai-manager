import { useState } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import type { Task } from '@/types';
import KanbanColumn from '@/components/KanbanColumn';
import TaskCard from '@/components/TaskCard';

interface KanbanBoardProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onStatusChange: (taskId: number, newStatus: string) => void;
}

const COLUMNS = ['Todo', 'In Progress', 'Done'] as const;

export default function KanbanBoard({ tasks, onTaskClick, onStatusChange }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

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

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === Number(event.active.id));
    setActiveTask(task ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = Number(active.id);
    const newStatus = String(over.id);
    const task = tasks.find((t) => t.id === taskId);

    if (task && task.status !== newStatus) {
      onStatusChange(taskId, newStatus);
    }
  }

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} onClick={() => {}} isDragOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
