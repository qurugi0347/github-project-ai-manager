import { execSync } from 'child_process';
import { createInterface } from 'readline';
import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { GpmConfig } from '../types';

export function validateGhAuth(): string {
  try {
    const token = execSync('gh auth token', { encoding: 'utf-8' }).trim();
    if (!token) {
      throw new Error('Empty token');
    }
    return token;
  } catch {
    throw new Error(
      'GitHub CLI 인증이 필요합니다.\n' +
      '다음 명령어를 실행하세요: gh auth login',
    );
  }
}

interface ParsedProjectUrl {
  owner: string;
  ownerType: 'organization' | 'user';
  projectNumber: number;
}

export function parseProjectUrl(url: string): ParsedProjectUrl {
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    throw new Error(`유효하지 않은 URL입니다: ${url}`);
  }

  // /orgs/{owner}/projects/{number} 또는 /users/{owner}/projects/{number}
  const match = pathname.match(
    /^\/(orgs|users)\/([^/]+)\/projects\/(\d+)/,
  );

  if (!match) {
    throw new Error(
      '유효하지 않은 GitHub Project URL입니다.\n' +
      '예시: https://github.com/orgs/my-org/projects/1\n' +
      '      https://github.com/users/my-user/projects/1',
    );
  }

  const [, type, owner, numberStr] = match;

  return {
    owner,
    ownerType: type === 'orgs' ? 'organization' : 'user',
    projectNumber: parseInt(numberStr, 10),
  };
}

interface RepoInfo {
  owner: string;
  repo: string;
}

export function getRepoFromGitRemote(cwd: string): RepoInfo | null {
  try {
    const remoteUrl = execSync('git remote get-url origin', {
      encoding: 'utf-8',
      cwd,
    }).trim();

    // SSH: git@github.com:owner/repo.git
    const sshMatch = remoteUrl.match(/git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/);
    if (sshMatch) {
      return { owner: sshMatch[1], repo: sshMatch[2] };
    }

    // HTTPS: https://github.com/owner/repo.git
    const httpsMatch = remoteUrl.match(/github\.com\/([^/]+)\/(.+?)(?:\.git)?$/);
    if (httpsMatch) {
      return { owner: httpsMatch[1], repo: httpsMatch[2] };
    }

    return null;
  } catch {
    return null;
  }
}

function prompt(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function runInit(): Promise<void> {
  // 1. gh auth 확인
  console.log('GitHub CLI 인증 확인 중...');
  try {
    validateGhAuth();
    console.log('✓ GitHub CLI 인증 확인 완료');
  } catch (err) {
    console.error(`✗ ${(err as Error).message}`);
    process.exit(1);
  }

  // 2. GitHub Project URL 입력
  const projectUrl = await prompt('? GitHub Project URL: ');
  if (!projectUrl) {
    console.error('✗ URL을 입력해주세요.');
    process.exit(1);
  }

  // 3. URL 파싱
  let parsed: ParsedProjectUrl;
  try {
    parsed = parseProjectUrl(projectUrl);
  } catch (err) {
    console.error(`✗ ${(err as Error).message}`);
    process.exit(1);
  }

  // 4. git remote에서 repo 정보 추출
  const cwd = process.cwd();
  const repoInfo = getRepoFromGitRemote(cwd);
  if (!repoInfo) {
    console.log('⚠ git remote를 찾을 수 없습니다. repo 정보 없이 진행합니다.');
  }

  // 5. .gpmrc 생성
  const gpmrcPath = join(cwd, '.gpmrc');

  if (existsSync(gpmrcPath)) {
    const overwrite = await prompt('? .gpmrc가 이미 존재합니다. 덮어쓰시겠습니까? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('취소되었습니다.');
      return;
    }
  }

  const config: GpmConfig = {
    owner: parsed.owner,
    ownerType: parsed.ownerType,
    ...(repoInfo && { repo: repoInfo.repo }),
    projectNumber: parsed.projectNumber,
    projectUrl: `https://github.com/${parsed.ownerType === 'organization' ? 'orgs' : 'users'}/${parsed.owner}/projects/${parsed.projectNumber}`,
  };

  writeFileSync(gpmrcPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');

  // 6. 성공 메시지
  console.log(`✓ .gpmrc created`);
  console.log(`✓ Connected to project: ${config.owner}/projects/${config.projectNumber}`);
  if (repoInfo) {
    console.log(`✓ Repository: ${repoInfo.owner}/${repoInfo.repo}`);
  }
}
