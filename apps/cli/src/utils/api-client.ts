import { loadGpmrc, getProjectHeaders } from './gpmrc';
import http from 'http';

const BASE_URL = `http://localhost:${process.env.GPM_PORT || '6170'}/api`;

interface RequestOptions {
  method?: string;
  body?: unknown;
  needsProject?: boolean;
  projectAlias?: string;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, needsProject = true, projectAlias } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (needsProject) {
    const config = loadGpmrc();
    Object.assign(headers, getProjectHeaders(config, projectAlias));
  }

  const url = new URL(`${BASE_URL}${path}`);

  return new Promise((resolve, reject) => {
    const req = http.request(
      url,
      { method, headers },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            try {
              const error = JSON.parse(data);
              reject(new Error(error.message || `HTTP ${res.statusCode}`));
            } catch {
              reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            }
            return;
          }
          resolve(data ? JSON.parse(data) : null);
        });
      },
    );

    req.on('error', (err) => {
      if ((err as NodeJS.ErrnoException).code === 'ECONNREFUSED') {
        reject(new Error(
          'gpm server에 연결할 수 없습니다.\n' +
          '먼저 gpm server를 실행하세요.',
        ));
      } else {
        reject(err);
      }
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}
