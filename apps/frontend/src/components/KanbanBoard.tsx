import { useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import type { Task } from '@/types';
import KanbanColumn from '@/components/KanbanColumn';
import TaskCard from '@/components/TaskCard';

interface KanbanBoardProps {
  tasks: Task[];
  columns: string[];
  onTaskClick: (task: Task) => void;
  onStatusChange: (taskId: number, newStatus: string) => void;
}

export default function KanbanBoard({ tasks, columns, onTaskClick, onStatusChange }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const visibleColumns = columns.length > 0 ? columns : [...new Set(tasks.map((t) => t.status))];

  const grouped = tasks.reduce<Record<string, Task[]>>(
    (acc, task) => {
      acc[task.status] = [...(acc[task.status] ?? []), task];
      return acc;
    },
    Object.fromEntries(visibleColumns.map((col) => [col, []])),
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
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {visibleColumns.map((column) => (
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
