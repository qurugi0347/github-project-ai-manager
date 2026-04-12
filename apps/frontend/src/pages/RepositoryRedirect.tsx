import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet } from '@/api/client';
import type { Project } from '@/types';

export default function RepositoryRedirect() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!owner || !repo) return;

    apiGet<Project[]>(`/projects/by-repo?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`)
      .then((projects) => {
        if (projects.length === 0) {
          setError(`No projects found for ${owner}/${repo}`);
          return;
        }
        const defaultProject = projects.find((p) => p.alias === 'default') ?? projects[0];
        navigate(
          `/repository/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/project/${defaultProject.id}`,
          { replace: true },
        );
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load projects');
      });
  }, [owner, repo, navigate]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <p className="text-red-500 mb-2">Failed to find project</p>
          <p className="text-gray-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <p className="text-gray-500">Redirecting...</p>
    </div>
  );
}
