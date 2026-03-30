import { existsSync } from 'fs';
import { join } from 'path';

export function findTemplateDir(): string | null {
  const candidates = [
    join(__dirname, '..', '..', '..', '..', 'templates'),  // 개발 환경
    join(__dirname, '..', '..', 'templates'),               // npm 패키지
  ];
  return candidates.find((p) => existsSync(p)) ?? null;
}
