import { Link } from 'react-router-dom';
import { useProjectListQuery } from '@/hooks/useProjectListQuery';
import type { Project } from '@/types';

interface RepoGroup {
  owner: string;
  repo: string;
  projects: Project[];
}

function groupByRepo(projects: Project[]): RepoGroup[] {
  const map = new Map<string, RepoGroup>();

  for (const project of projects) {
    const repo = project.repo ?? '';
    const key = `${project.owner}/${repo}`;
    const existing = map.get(key);
    if (existing) {
      existing.projects.push(project);
    } else {
      map.set(key, { owner: project.owner, repo, projects: [project] });
    }
  }

  return Array.from(map.values());
}

export default function RepositoryListPage() {
  const { data: projects = [], isLoading, error } = useProjectListQuery();

  if (isLoading) {
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
          <p className="text-gray-400 text-sm">{error?.message ?? 'Unknown error'}</p>
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

  const repoGroups = groupByRepo(projects);

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Repositories</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {repoGroups.map((group) => (
          <Link
            key={`${group.owner}/${group.repo}`}
            to={`/repository/${encodeURIComponent(group.owner)}/${encodeURIComponent(group.repo)}`}
            className="block bg-white rounded-lg border border-gray-200 p-5 hover:border-blue-400 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-medium text-white bg-blue-500 px-2 py-0.5 rounded">
                {group.projects.length} {group.projects.length === 1 ? 'project' : 'projects'}
              </span>
              <span className="text-xs text-gray-400">{group.projects[0].ownerType}</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{group.owner}</h3>
            {group.repo && (
              <p className="text-sm text-gray-500">{group.repo}</p>
            )}
            <div className="mt-3 space-y-1">
              {group.projects.map((project) => (
                <p key={project.id} className="text-xs text-gray-400 truncate">
                  #{project.projectNumber} {project.alias ?? ''}
                </p>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
