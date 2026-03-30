import { execSync } from 'child_process';
import { createInterface } from 'readline';
import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, chmodSync } from 'fs';
import { join } from 'path';
import { GpmConfig } from '../types';
import { getAppContext, closeAppContext } from '../utils/bootstrap';

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

  // 6. 서버 DB에 프로젝트 등록 (standalone mode)
  console.log('프로젝트 등록 중...');
  try {
    const app = await getAppContext();
    const { ProjectService } = await import('@gpm/backend/dist/modules/project/project.service');
    const projectService = app.get(ProjectService);
    await projectService.findOrCreate(config.owner, config.projectNumber, {
      ownerType: config.ownerType,
      repo: config.repo,
      projectUrl: config.projectUrl,
    });
    await closeAppContext();
    console.log('✓ 프로젝트 등록 완료');
  } catch (err) {
    console.log(`⚠ 프로젝트 자동 등록 실패 (서버 사용 시 자동 등록됩니다): ${(err as Error).message}`);
  }

  // 7. Claude Code Skill 설정
  const skillDir = join(cwd, '.claude', 'skills', 'gpm');
  const skillPath = join(skillDir, 'SKILL.md');

  if (!existsSync(skillPath)) {
    // 템플릿 파일 위치 탐색
    const templateCandidates = [
      join(__dirname, '..', '..', '..', '..', 'templates', 'claude-skill-gpm.md'),  // 개발 환경
      join(__dirname, '..', '..', 'templates', 'claude-skill-gpm.md'),              // npm 패키지
    ];

    const templatePath = templateCandidates.find((p) => existsSync(p));
    if (templatePath) {
      mkdirSync(skillDir, { recursive: true });
      copyFileSync(templatePath, skillPath);
      console.log('✓ Claude Code Skill 설정 완료 (.claude/skills/gpm/SKILL.md)');
    }
  }

  // 8. Claude Code Agent 설정
  const agentDir = join(cwd, '.claude', 'agents');
  const agentPath = join(agentDir, 'gpm-pm.md');

  if (!existsSync(agentPath)) {
    const agentCandidates = [
      join(__dirname, '..', '..', '..', '..', 'templates', 'claude-agent-gpm-pm.md'),
      join(__dirname, '..', '..', 'templates', 'claude-agent-gpm-pm.md'),
    ];

    const agentTemplatePath = agentCandidates.find((p) => existsSync(p));
    if (agentTemplatePath) {
      mkdirSync(agentDir, { recursive: true });
      copyFileSync(agentTemplatePath, agentPath);
      console.log('✓ Claude Code Agent 설정 완료 (.claude/agents/gpm-pm.md)');
    }
  }

  // 9. Claude Code Hooks 설정
  const hooksDir = join(cwd, '.claude', 'hooks');
  const hookFiles = [
    'gpm-session-briefing.sh',
    'gpm-commit-linker.sh',
    'gpm-response-suggest.sh',
  ];

  const hookTemplateDirCandidates = [
    join(__dirname, '..', '..', '..', '..', 'templates', 'hooks'),  // 개발 환경
    join(__dirname, '..', '..', 'templates', 'hooks'),              // npm 패키지
  ];
  const hookTemplateDir = hookTemplateDirCandidates.find((p) => existsSync(p));

  if (hookTemplateDir) {
    let hooksInstalled = false;
    for (const hookFile of hookFiles) {
      const hookDest = join(hooksDir, hookFile);
      if (!existsSync(hookDest)) {
        const hookSrc = join(hookTemplateDir, hookFile);
        if (existsSync(hookSrc)) {
          mkdirSync(hooksDir, { recursive: true });
          copyFileSync(hookSrc, hookDest);
          chmodSync(hookDest, 0o755);
          hooksInstalled = true;
        }
      }
    }
    if (hooksInstalled) {
      console.log('✓ Claude Code Hooks 설정 완료 (.claude/hooks/)');
    }
  }

  // 10. Claude Code 프로젝트 settings.json에 Hooks 등록
  const settingsPath = join(cwd, '.claude', 'settings.json');
  const settingsTemplateCandidates = [
    join(__dirname, '..', '..', '..', '..', 'templates', 'claude-settings-hooks.json'),
    join(__dirname, '..', '..', 'templates', 'claude-settings-hooks.json'),
  ];
  const settingsTemplatePath = settingsTemplateCandidates.find((p) => existsSync(p));

  if (settingsTemplatePath) {
    const hookSettings = JSON.parse(readFileSync(settingsTemplatePath, 'utf-8'));
    let currentSettings: Record<string, unknown> = {};

    if (existsSync(settingsPath)) {
      try {
        currentSettings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
      } catch {
        currentSettings = {};
      }
    }

    // hooks 키를 머지 (기존 hooks 보존, GPM hooks 추가)
    const currentHooks = (currentSettings.hooks ?? {}) as Record<string, unknown[]>;
    const newHooks = hookSettings.hooks as Record<string, unknown[]>;
    let settingsChanged = false;

    for (const [event, entries] of Object.entries(newHooks)) {
      const existing = currentHooks[event] ?? [];
      const existingStr = JSON.stringify(existing);
      // GPM hook이 이미 등록되어 있는지 확인
      const hasGpmHook = existingStr.includes('gpm-');
      if (!hasGpmHook) {
        currentHooks[event] = [...existing, ...entries];
        settingsChanged = true;
      }
    }

    if (settingsChanged) {
      currentSettings.hooks = currentHooks;
      mkdirSync(join(cwd, '.claude'), { recursive: true });
      writeFileSync(settingsPath, JSON.stringify(currentSettings, null, 2) + '\n', 'utf-8');
      console.log('✓ Claude Code Settings에 Hooks 등록 완료 (.claude/settings.json)');
    }
  }

  // 11. 성공 메시지
  console.log(`✓ .gpmrc created`);
  console.log(`✓ Connected to project: ${config.owner}/projects/${config.projectNumber}`);
  if (repoInfo) {
    console.log(`✓ Repository: ${repoInfo.owner}/${repoInfo.repo}`);
  }
}
