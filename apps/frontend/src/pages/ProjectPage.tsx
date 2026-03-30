import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiGet, apiPost } from '@/api/client';
import type { Project, Task, Milestone } from '@/types';
import MilestoneSummary from '@/components/MilestoneSummary';
import KanbanBoard from '@/components/KanbanBoard';
import TaskDetailPanel from '@/components/TaskDetailPanel';
import MilestoneDetailPanel from '@/components/MilestoneDetailPanel';

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      try {
        const [projectData, taskData, milestoneData] = await Promise.all([
          apiGet<Project>(`/projects/${id}`),
          apiGet<Task[]>(`/tasks?projectId=${id}`),
          apiGet<Milestone[]>(`/milestones?projectId=${id}`),
        ]);
        setProject(projectData);
        setTasks(taskData);
        setMilestones(milestoneData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load project');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const handleSync = async () => {
    if (!id || syncing) return;

    setSyncing(true);
    try {
      await apiPost(`/sync/pull?projectId=${id}`, {});
      const [taskData, milestoneData] = await Promise.all([
        apiGet<Task[]>(`/tasks?projectId=${id}`),
        apiGet<Milestone[]>(`/milestones?projectId=${id}`),
      ]);
      setTasks(taskData);
      setMilestones(milestoneData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleMilestoneClick = (milestone: Milestone) => {
    setSelectedMilestone(milestone);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  const handleMilestoneTaskClick = (task: Task) => {
    setSelectedMilestone(null);
    setSelectedTask(task);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <p className="text-red-500 mb-2">Failed to load project</p>
          <p className="text-gray-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Back link */}
      <div className="mb-4">
        <Link to="/" className="text-sm text-blue-500 hover:text-blue-700">
          &larr; All Projects
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">
            {project?.owner}
            {project?.repo && <span className="text-gray-400"> / {project.repo}</span>}
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Project #{project?.projectNumber}
          </p>
        </div>
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {syncing ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Syncing...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Sync
            </>
          )}
        </button>
      </div>

      {/* Milestone Summary */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
          Milestones
        </h3>
        <MilestoneSummary milestones={milestones} onMilestoneClick={handleMilestoneClick} />
      </div>

      {/* Kanban Board */}
      <div>
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
          Tasks
        </h3>
        <KanbanBoard tasks={tasks} onTaskClick={handleTaskClick} />
      </div>

      {/* Detail Panels */}
      <TaskDetailPanel task={selectedTask} onClose={() => setSelectedTask(null)} />
      <MilestoneDetailPanel
        milestone={selectedMilestone}
        tasks={tasks}
        onClose={() => setSelectedMilestone(null)}
        onTaskClick={handleMilestoneTaskClick}
      />
    </div>
  );
}
