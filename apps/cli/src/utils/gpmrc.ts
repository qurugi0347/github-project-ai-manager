import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { GpmConfig } from '../types';

export function loadGpmrc(cwd: string = process.cwd()): GpmConfig {
  const gpmrcPath = join(cwd, '.gpmrc');

  if (!existsSync(gpmrcPath)) {
    throw new Error(
      '.gpmrc 파일을 찾을 수 없습니다.\n' +
      '먼저 gpm init을 실행하세요.',
    );
  }

  const content = readFileSync(gpmrcPath, 'utf-8');
  return JSON.parse(content) as GpmConfig;
}

export function getProjectHeaders(config: GpmConfig): Record<string, string> {
  return {
    'X-GPM-Owner': config.owner,
    'X-GPM-Project-Number': String(config.projectNumber),
  };
}
