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

type SortOption = 'newest' | 'oldest' | 'priority' | 'title';

const PRIORITY_ORDER: Record<string, number> = {
  Urgent: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

function sortTasks(tasks: Task[], option: SortOption): Task[] {
  const sorted = [...tasks];
  switch (option) {
    case 'newest':
      return sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    case 'oldest':
      return sorted.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
    case 'priority':
      return sorted.sort((a, b) => {
        const pa = PRIORITY_ORDER[a.priority ?? ''] ?? 99;
        const pb = PRIORITY_ORDER[b.priority ?? ''] ?? 99;
        return pa - pb;
      });
    case 'title':
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    default:
      return sorted;
  }
}

export default function KanbanBoard({ tasks, columns, milestones, activeMilestoneId, onMilestoneFilterChange, onTaskClick, onStatusChange }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('newest');
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

  // Apply sorting to each column
  for (const col of visibleColumns) {
    grouped[col] = sortTasks(grouped[col], sortOption);
  }

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
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        {milestones && milestones.length > 0 && onMilestoneFilterChange && (
          <>
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
          </>
        )}

        {/* Sort dropdown (always visible) */}
        <div className="flex items-center gap-2 ml-auto flex-shrink-0">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sort</span>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            className="text-xs border border-gray-300 rounded-md px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="priority">Priority</option>
            <option value="title">Title A-Z</option>
          </select>
        </div>
      </div>

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
