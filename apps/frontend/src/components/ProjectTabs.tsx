import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '@/api/client';
import type { Project } from '@/types';

interface ProjectTabsProps {
  owner: string;
  repo: string;
  currentProjectId: number;
}

export default function ProjectTabs({ owner, repo, currentProjectId }: ProjectTabsProps) {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    apiGet<Project[]>(`/projects/by-repo?owner=${owner}&repo=${repo}`)
      .then(setProjects)
      .catch(() => setProjects([]));
  }, [owner, repo]);

  if (projects.length <= 1) return null;

  return (
    <div className="flex gap-1 border-b border-gray-200 mb-4">
      {projects.map((project) => {
        const isActive = project.id === currentProjectId;
        const label = project.alias || `Project #${project.projectNumber}`;

        return (
          <Link
            key={project.id}
            to={`/repository/${owner}/${repo}/project/${project.id}`}
            className={`px-3 py-2 text-sm transition-colors ${
              isActive
                ? 'text-blue-600 border-b-2 border-blue-500 font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
