import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, Project } from '@/api/client';

export default function ProjectListPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Project[]>('/projects')
      .then(setProjects)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

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
          <p className="text-red-500 mb-2">Failed to load projects</p>
          <p className="text-gray-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <p className="text-gray-500 text-lg mb-2">No projects registered</p>
          <p className="text-gray-400 text-sm">
            Run <code className="bg-gray-100 px-2 py-0.5 rounded">gpm init</code> in a git repository to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Projects</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <Link
            key={project.id}
            to={`/projects/${project.id}`}
            className="block bg-white rounded-lg border border-gray-200 p-5 hover:border-blue-400 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-medium text-white bg-blue-500 px-2 py-0.5 rounded">
                #{project.projectNumber}
              </span>
              <span className="text-xs text-gray-400">{project.ownerType}</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{project.owner}</h3>
            {project.repo && (
              <p className="text-sm text-gray-500">{project.repo}</p>
            )}
            <p className="text-xs text-gray-400 mt-3 truncate">{project.projectUrl}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
