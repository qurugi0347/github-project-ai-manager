import { execSync } from 'child_process';
import { createInterface } from 'readline';
import { existsSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';
import { GpmConfig } from '../types';
import { getAppContext, closeAppContext } from '../utils/bootstrap';
import { HOOK_REGISTRY } from '../hooks/hook-registry';
import { installHookFiles } from './hooks';
import { loadGpmrc, validateGpmrc, saveGpmrc } from '../utils/gpmrc';

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

interface InitOptions {
  hooks?: boolean;
}

async function registerProjectInDb(config: GpmConfig, alias: string): Promise<void> {
  console.log('프로젝트 등록 중...');
  try {
    const app = await getAppContext();
    const { ProjectService } = await import('@gpm/backend/dist/modules/project/project.service');
    const projectService = app.get(ProjectService);
    const project = config.projects[alias];
    await projectService.findOrCreate(config.owner, project.projectNumber, {
      ownerType: config.ownerType,
      repo: config.repo,
      projectUrl: project.projectUrl,
      alias,
    });
    await closeAppContext();
    console.log('✓ 프로젝트 등록 완료');
  } catch (err) {
    console.log(`⚠ 프로젝트 자동 등록 실패 (서버 사용 시 자동 등록됩니다): ${(err as Error).message}`);
  }
}

function resolveProjectUrl(parsed: ParsedProjectUrl): string {
  return `https://github.com/${parsed.ownerType === 'organization' ? 'orgs' : 'users'}/${parsed.owner}/projects/${parsed.projectNumber}`;
}

async function setupClaudeCodeIntegrations(cwd: string, skipHooks: boolean): Promise<void> {
  // Claude Code Skill 설정
  const skillDir = join(cwd, '.claude', 'skills', 'gpm');
  const skillPath = join(skillDir, 'SKILL.md');

  if (!existsSync(skillPath)) {
    const templateCandidates = [
      join(__dirname, '..', '..', '..', '..', 'templates', 'claude-skill-gpm.md'),
      join(__dirname, '..', '..', 'templates', 'claude-skill-gpm.md'),
    ];

    const templatePath = templateCandidates.find((p) => existsSync(p));
    if (templatePath) {
      mkdirSync(skillDir, { recursive: true });
      copyFileSync(templatePath, skillPath);
      console.log('✓ Claude Code Skill 설정 완료 (.claude/skills/gpm/SKILL.md)');
    }
  }

  // Claude Code Agent 설정
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

  // Claude Code Hooks 설정
  if (!skipHooks) {
    const installHooks = await prompt('? Claude Code Hooks를 설치하시겠습니까? (Y/n): ');
    if (installHooks.toLowerCase() !== 'n') {
      const result = installHookFiles(HOOK_REGISTRY, { silent: true });
      if (result.filesInstalled > 0) {
        console.log('✓ Claude Code Hooks 설정 완료 (.claude/hooks/)');
      }
      if (result.settingsChanged) {
        console.log('✓ Claude Code Settings에 Hooks 등록 완료 (.claude/settings.json)');
      }
    }
  }
}

async function runAddProject(existingConfig: GpmConfig, cwd: string): Promise<void> {
  // 1. GitHub Project URL 입력
  const projectUrl = await prompt('? GitHub Project URL: ');
  if (!projectUrl) {
    console.error('✗ URL을 입력해주세요.');
    process.exit(1);
  }

  // 2. URL 파싱
  let parsed: ParsedProjectUrl;
  try {
    parsed = parseProjectUrl(projectUrl);
  } catch (err) {
    console.error(`✗ ${(err as Error).message}`);
    process.exit(1);
  }

  const resolvedUrl = resolveProjectUrl(parsed);

  // 3. 중복 체크
  for (const [alias, project] of Object.entries(existingConfig.projects)) {
    if (project.projectUrl === resolvedUrl) {
      console.log(`이미 '${alias}'로 등록되어 있습니다.`);
      return;
    }
    if (project.projectNumber === parsed.projectNumber) {
      console.log(`Project #${parsed.projectNumber}이 이미 '${alias}'로 등록되어 있습니다.`);
      return;
    }
  }

  // 4. alias 입력
  const alias = await prompt('? 프로젝트 alias (예: my-project): ');
  if (!alias) {
    console.error('✗ alias를 입력해주세요.');
    process.exit(1);
  }

  // 기존 alias와 충돌 체크
  if (existingConfig.projects[alias]) {
    console.error(`✗ alias '${alias}'는 이미 사용 중입니다.`);
    process.exit(1);
  }

  // 5. 프로젝트 추가
  existingConfig.projects[alias] = {
    projectNumber: parsed.projectNumber,
    projectUrl: resolvedUrl,
  };

  // 6. 전체 검증
  try {
    validateGpmrc(existingConfig);
  } catch (err) {
    // 검증 실패 시 추가한 프로젝트 롤백
    delete existingConfig.projects[alias];
    console.error(`✗ 설정 검증 실패: ${(err as Error).message}`);
    process.exit(1);
  }

  // 7. 저장
  saveGpmrc(existingConfig, cwd);

  // 8. DB 등록
  await registerProjectInDb(existingConfig, alias);

  console.log(`✓ 프로젝트 '${alias}' 추가 완료 (Project #${parsed.projectNumber})`);
}

export async function runInit(options: InitOptions = {}): Promise<void> {
  const skipHooks = options.hooks === false;
  const cwd = process.cwd();
  const gpmrcPath = join(cwd, '.gpmrc');

  // 1. gh auth 확인
  console.log('GitHub CLI 인증 확인 중...');
  try {
    validateGhAuth();
    console.log('✓ GitHub CLI 인증 확인 완료');
  } catch (err) {
    console.error(`✗ ${(err as Error).message}`);
    process.exit(1);
  }

  // 2. 기존 .gpmrc 존재 시 프로젝트 추가 워크플로우
  if (existsSync(gpmrcPath)) {
    let existingConfig: GpmConfig;
    try {
      existingConfig = loadGpmrc(cwd);
    } catch (err) {
      console.error(`✗ .gpmrc 로드 실패: ${(err as Error).message}`);
      process.exit(1);
      return; // TypeScript narrowing
    }

    const addProject = await prompt('? .gpmrc가 이미 존재합니다. 프로젝트를 추가하시겠습니까? (y/N): ');
    if (addProject.toLowerCase() !== 'y') {
      console.log('취소되었습니다.');
      return;
    }

    await runAddProject(existingConfig, cwd);
    return;
  }

  // 3. 새 .gpmrc 생성 워크플로우
  // 3-1. GitHub Project URL 입력
  const projectUrl = await prompt('? GitHub Project URL: ');
  if (!projectUrl) {
    console.error('✗ URL을 입력해주세요.');
    process.exit(1);
  }

  // 3-2. URL 파싱
  let parsed: ParsedProjectUrl;
  try {
    parsed = parseProjectUrl(projectUrl);
  } catch (err) {
    console.error(`✗ ${(err as Error).message}`);
    process.exit(1);
  }

  // 3-3. git remote에서 repo 정보 추출
  const repoInfo = getRepoFromGitRemote(cwd);
  if (!repoInfo) {
    console.log('⚠ git remote를 찾을 수 없습니다. repo 정보 없이 진행합니다.');
  }

  // 3-4. alias 입력
  const alias = await prompt('? 프로젝트 alias (기본값: default): ');
  const resolvedAlias = alias || 'default';

  const resolvedUrl = resolveProjectUrl(parsed);

  // 3-5. 멀티 프로젝트 형식으로 .gpmrc 생성
  const config: GpmConfig = {
    owner: parsed.owner,
    ownerType: parsed.ownerType,
    repo: repoInfo?.repo ?? '',
    defaultProject: resolvedAlias,
    projects: {
      [resolvedAlias]: {
        projectNumber: parsed.projectNumber,
        projectUrl: resolvedUrl,
      },
    },
  };

  // 3-6. 검증
  try {
    validateGpmrc(config);
  } catch (err) {
    console.error(`✗ 설정 검증 실패: ${(err as Error).message}`);
    process.exit(1);
  }

  // 3-7. 저장
  saveGpmrc(config, cwd);

  // 3-8. 서버 DB에 프로젝트 등록
  await registerProjectInDb(config, resolvedAlias);

  // 3-9. Claude Code 연동 설정
  await setupClaudeCodeIntegrations(cwd, skipHooks);

  // 3-10. 성공 메시지
  console.log(`✓ .gpmrc created`);
  console.log(`✓ Connected to project: ${config.owner}/projects/${config.projects[resolvedAlias].projectNumber}`);
  if (repoInfo) {
    console.log(`✓ Repository: ${repoInfo.owner}/${repoInfo.repo}`);
  }
}
