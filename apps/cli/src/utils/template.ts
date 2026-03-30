import { existsSync } from 'fs';
import { join } from 'path';

export function findTemplateDir(): string | null {
  const candidates = [
    join(__dirname, '..', '..', '..', '..', 'templates'),  // 개발 환경
    join(__dirname, '..', '..', 'templates'),               // npm 패키지
  ];
  const found = candidates.find((p) => existsSync(p));
  if (!found) {
    console.error('[GPM] 템플릿 디렉토리를 찾을 수 없습니다. 시도한 경로:');
    for (const c of candidates) {
      console.error(`  - ${c}`);
    }
  }
  return found ?? null;
}
