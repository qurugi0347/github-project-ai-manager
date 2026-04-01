import { useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import type { Task, Milestone } from '@/types';
import KanbanColumn from '@/components/KanbanColumn';
import TaskCard from '@/components/TaskCard';

interface KanbanBoardProps {
  tasks: Task[];
  columns: string[];
  milestones?: Milestone[];
  activeMilestoneId?: number | null;
  onMilestoneFilterChange?: (milestoneId: number | null) => void;
  onTaskClick: (task: Task) => void;
  onStatusChange: (taskId: number, newStatus: string) => void;
}

export default function KanbanBoard({ tasks, columns, milestones, activeMilestoneId, onMilestoneFilterChange, onTaskClick, onStatusChange }: KanbanBoardProps) {
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
      {milestones && milestones.length > 0 && onMilestoneFilterChange && (
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex-shrink-0">Milestone</span>
          <button
            type="button"
            onClick={() => onMilestoneFilterChange(null)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex-shrink-0 ${
              activeMilestoneId == null
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
            }`}
          >
            All
          </button>
          {[...milestones].sort((a, b) => {
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          }).map((ms) => (
            <button
              key={ms.id}
              type="button"
              onClick={() => onMilestoneFilterChange(ms.id)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex-shrink-0 ${
                activeMilestoneId === ms.id
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
              }`}
            >
              {ms.title}
            </button>
          ))}
        </div>
      )}
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
