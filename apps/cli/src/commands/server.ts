import { spawn, exec } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

function findProjectRoot(): string {
  // CLI가 실행되는 위치에서 apps/backend/dist/main.js를 찾을 수 있는 프로젝트 루트
  // npm 글로벌 설치 시에는 패키지 내부 경로 사용
  const candidates = [
    join(__dirname, '..', '..', '..', '..'),  // apps/cli/dist/ → 프로젝트 루트
    join(__dirname, '..', '..'),               // npm 패키지 구조
  ];

  for (const root of candidates) {
    if (existsSync(join(root, 'apps', 'backend', 'dist', 'main.js'))) {
      return root;
    }
  }

  throw new Error(
    'Backend build not found. Run "yarn build:backend" first.',
  );
}

function openBrowser(url: string): void {
  const platform = process.platform;
  const cmd = platform === 'darwin' ? 'open'
    : platform === 'win32' ? 'start'
    : 'xdg-open';

  exec(`${cmd} ${url}`);
}

export async function runServer(options: { port: string; open: boolean }): Promise<void> {
  const port = options.port;

  let projectRoot: string;
  try {
    projectRoot = findProjectRoot();
  } catch (err) {
    console.error(`✗ ${(err as Error).message}`);
    process.exit(1);
  }

  const frontendDist = join(projectRoot, 'apps', 'frontend', 'dist');
  if (!existsSync(frontendDist)) {
    console.log('⚠ Frontend build not found. Run "yarn build:frontend" for web UI.');
  }

  const mainJs = join(projectRoot, 'apps', 'backend', 'dist', 'main.js');

  console.log(`Starting GPM server on port ${port}...`);

  const child = spawn('node', [mainJs], {
    env: { ...process.env, GPM_PORT: port },
    stdio: 'inherit',
  });

  // 서버가 시작되면 브라우저 열기
  if (options.open) {
    setTimeout(() => {
      openBrowser(`http://localhost:${port}`);
    }, 2000);
  }

  child.on('error', (err) => {
    console.error(`✗ Failed to start server: ${err.message}`);
    process.exit(1);
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });

  // Ctrl+C 전파
  process.on('SIGINT', () => {
    child.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    child.kill('SIGTERM');
  });
}
