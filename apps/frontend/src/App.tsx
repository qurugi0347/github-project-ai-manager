import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import RepositoryListPage from '@/pages/RepositoryListPage';
import RepositoryRedirect from '@/pages/RepositoryRedirect';
import RepositoryProjectPage from '@/pages/RepositoryProjectPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<RepositoryListPage />} />
          <Route path="/repository/:owner/:repo" element={<RepositoryRedirect />} />
          <Route path="/repository/:owner/:repo/project/:projectId" element={<RepositoryProjectPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
