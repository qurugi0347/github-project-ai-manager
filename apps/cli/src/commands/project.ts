import { createInterface } from 'readline';
import { Command } from 'commander';
import {
  loadGpmrc,
  saveGpmrc,
  validateGpmrc,
  getAllProjectAliases,
} from '../utils/gpmrc';
import { GpmConfig } from '../types';

const ALIAS_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

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

/**
 * GitHub Project URL에서 projectNumber를 추출한다.
 * 지원 형식:
 *   https://github.com/users/{owner}/projects/{number}
 *   https://github.com/orgs/{orgname}/projects/{number}
 */
export function parseProjectNumber(url: string): number {
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    throw new Error(`유효하지 않은 URL입니다: ${url}`);
  }

  const match = pathname.match(
    /^\/(orgs|users)\/[^/]+\/projects\/(\d+)/,
  );

  if (!match) {
    throw new Error(
      '유효하지 않은 GitHub Project URL입니다.\n' +
      '예시: https://github.com/orgs/my-org/projects/1\n' +
      '      https://github.com/users/my-user/projects/1',
    );
  }

  return parseInt(match[2], 10);
}

function runProjectList(): void {
  let config: GpmConfig;
  try {
    config = loadGpmrc();
  } catch (err) {
    console.error(`✗ ${(err as Error).message}`);
    process.exit(1);
  }

  const aliases = getAllProjectAliases(config);

  if (aliases.length === 0) {
    console.log('등록된 프로젝트가 없습니다.');
    return;
  }

  for (const alias of aliases) {
    const project = config.projects[alias];
    const isDefault = alias === config.defaultProject;
    const defaultLabel = isDefault ? ' (default)' : '';
    console.log(`  ${alias}${defaultLabel}\t#${project.projectNumber}\t${project.projectUrl}`);
  }
}

async function runProjectAdd(): Promise<void> {
  let config: GpmConfig;
  try {
    config = loadGpmrc();
  } catch (err) {
    console.error(`✗ ${(err as Error).message}`);
    process.exit(1);
  }

  // 1. alias 입력
  const alias = await prompt('? Project alias (alphanumeric + hyphens): ');
  if (!alias) {
    console.error('✗ alias를 입력해주세요.');
    process.exit(1);
  }

  if (!ALIAS_PATTERN.test(alias)) {
    console.error(
      `✗ 유효하지 않은 alias입니다: '${alias}'\n` +
      '  소문자 영숫자와 하이픈만 사용 가능합니다 (예: my-project).',
    );
    process.exit(1);
  }

  if (config.projects[alias]) {
    console.error(`✗ alias '${alias}'는 이미 존재합니다.`);
    process.exit(1);
  }

  // 2. GitHub Project URL 입력
  const projectUrl = await prompt('? GitHub Project URL: ');
  if (!projectUrl) {
    console.error('✗ URL을 입력해주세요.');
    process.exit(1);
  }

  // 3. URL에서 projectNumber 추출
  let projectNumber: number;
  try {
    projectNumber = parseProjectNumber(projectUrl);
  } catch (err) {
    console.error(`✗ ${(err as Error).message}`);
    process.exit(1);
  }

  // 4. 설정에 추가
  config.projects[alias] = {
    projectNumber,
    projectUrl,
  };

  // 5. validateGpmrc()로 중복 검증
  try {
    validateGpmrc(config);
  } catch (err) {
    // 롤백
    delete config.projects[alias];
    console.error(`✗ ${(err as Error).message}`);
    process.exit(1);
  }

  // 6. saveGpmrc()로 저장
  saveGpmrc(config);
  console.log(`✓ 프로젝트 '${alias}' (#${projectNumber})가 추가되었습니다.`);
}

async function runProjectRemove(alias: string): Promise<void> {
  let config: GpmConfig;
  try {
    config = loadGpmrc();
  } catch (err) {
    console.error(`✗ ${(err as Error).message}`);
    process.exit(1);
  }

  // alias 존재 확인
  if (!config.projects[alias]) {
    const available = getAllProjectAliases(config).join(', ');
    console.error(`✗ 프로젝트 '${alias}'를 찾을 수 없습니다. 사용 가능: ${available}`);
    process.exit(1);
  }

  // 마지막 프로젝트 제거 불가
  const aliases = getAllProjectAliases(config);
  if (aliases.length <= 1) {
    console.error('✗ 마지막 프로젝트는 제거할 수 없습니다.');
    process.exit(1);
  }

  // defaultProject 제거 시 경고
  if (alias === config.defaultProject) {
    const others = aliases.filter((a) => a !== alias);
    console.error(
      `✗ '${alias}'는 기본 프로젝트입니다.\n` +
      `  먼저 다른 프로젝트를 기본으로 지정하세요: gpm project default <alias>\n` +
      `  사용 가능한 프로젝트: ${others.join(', ')}`,
    );
    process.exit(1);
  }

  delete config.projects[alias];
  saveGpmrc(config);
  console.log(`✓ 프로젝트 '${alias}'가 제거되었습니다.`);
}

function runProjectDefault(alias: string): void {
  let config: GpmConfig;
  try {
    config = loadGpmrc();
  } catch (err) {
    console.error(`✗ ${(err as Error).message}`);
    process.exit(1);
  }

  // alias 존재 확인
  if (!config.projects[alias]) {
    const available = getAllProjectAliases(config).join(', ');
    console.error(`✗ 프로젝트 '${alias}'를 찾을 수 없습니다. 사용 가능: ${available}`);
    process.exit(1);
  }

  if (config.defaultProject === alias) {
    console.log(`'${alias}'는 이미 기본 프로젝트입니다.`);
    return;
  }

  config.defaultProject = alias;
  saveGpmrc(config);
  console.log(`✓ 기본 프로젝트가 '${alias}'로 변경되었습니다.`);
}

export function registerProjectCommand(program: Command): void {
  const projectCmd = program
    .command('project')
    .description('Manage registered projects');

  projectCmd
    .command('list')
    .description('List registered projects')
    .action(() => {
      runProjectList();
    });

  projectCmd
    .command('add')
    .description('Add a new project interactively')
    .action(async () => {
      await runProjectAdd();
    });

  projectCmd
    .command('remove <alias>')
    .description('Remove a project')
    .action(async (alias: string) => {
      await runProjectRemove(alias);
    });

  projectCmd
    .command('default <alias>')
    .description('Set the default project')
    .action((alias: string) => {
      runProjectDefault(alias);
    });
}
