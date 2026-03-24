const BASE_URL = '/api';

export async function apiGet<T>(path: string, headers?: Record<string, string>): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export interface Project {
  id: number;
  owner: string;
  ownerType: string;
  repo: string | null;
  projectNumber: number;
  projectUrl: string;
  createdAt: string;
}
