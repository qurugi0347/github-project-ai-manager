import { useParams, Link } from 'react-router-dom';

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div>
      <div className="mb-6">
        <Link to="/" className="text-sm text-blue-500 hover:text-blue-700">
          &larr; All Projects
        </Link>
      </div>
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        Project #{id}
      </h2>
      <p className="text-gray-500">Task board and management features coming soon.</p>
    </div>
  );
}
