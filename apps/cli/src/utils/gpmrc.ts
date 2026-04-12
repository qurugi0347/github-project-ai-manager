import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  GpmConfig,
  RawGpmConfig,
  LegacyGpmConfig,
  ProjectConfig,
} from '../types';

const ALIAS_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function isLegacyConfig(raw: RawGpmConfig): raw is LegacyGpmConfig {
  return 'projectNumber' in raw && !('projects' in raw);
}

function normalizeConfig(raw: RawGpmConfig): GpmConfig {
  if (isLegacyConfig(raw)) {
    const { projectNumber, projectUrl, ...rest } = raw;
    return {
      ...rest,
      defaultProject: 'default',
      projects: {
        default: { projectNumber, projectUrl },
      },
    };
  }
  return raw;
}

export function loadGpmrc(cwd: string = process.cwd()): GpmConfig {
  const gpmrcPath = join(cwd, '.gpmrc');

  if (!existsSync(gpmrcPath)) {
    throw new Error(
      '.gpmrc 파일을 찾을 수 없습니다.\n' +
      '먼저 gpm init을 실행하세요.',
    );
  }

  const content = readFileSync(gpmrcPath, 'utf-8');
  const raw = JSON.parse(content) as RawGpmConfig;
  return normalizeConfig(raw);
}

export function resolveProject(
  config: GpmConfig,
  alias?: string,
): ProjectConfig {
  const targetAlias = alias ?? config.defaultProject;
  const project = config.projects[targetAlias];

  if (!project) {
    const available = Object.keys(config.projects).join(', ');
    throw new Error(
      `Project '${targetAlias}' not found in .gpmrc. Available: ${available}`,
    );
  }

  return project;
}

export function getProjectHeaders(
  config: GpmConfig,
  alias?: string,
): Record<string, string> {
  const targetAlias = alias ?? config.defaultProject;
  const project = resolveProject(config, targetAlias);

  return {
    'X-GPM-Owner': config.owner,
    'X-GPM-Owner-Type': config.ownerType,
    'X-GPM-Repo': config.repo,
    'X-GPM-Project-Number': String(project.projectNumber),
    'X-GPM-Project-Alias': targetAlias,
  };
}

export function validateGpmrc(config: GpmConfig): void {
  // defaultProject가 projects에 존재하는지 검증
  if (!config.projects[config.defaultProject]) {
    const available = Object.keys(config.projects).join(', ');
    throw new Error(
      `defaultProject '${config.defaultProject}' not found in projects. Available: ${available}`,
    );
  }

  // alias 형식 검증
  for (const alias of Object.keys(config.projects)) {
    if (!ALIAS_PATTERN.test(alias)) {
      throw new Error(
        `Invalid project alias '${alias}'. Aliases must contain only lowercase alphanumeric characters and hyphens (e.g., 'my-project').`,
      );
    }
  }

  const entries = Object.entries(config.projects);

  // 중복 projectNumber 검증
  const numberToAliases = new Map<number, string[]>();
  for (const [alias, project] of entries) {
    const existing = numberToAliases.get(project.projectNumber) ?? [];
    existing.push(alias);
    numberToAliases.set(project.projectNumber, existing);
  }
  for (const [num, aliases] of numberToAliases) {
    if (aliases.length > 1) {
      throw new Error(
        `Duplicate projectNumber ${num} found in aliases: ${aliases.join(', ')}. Each project must have a unique projectNumber.`,
      );
    }
  }

  // 중복 projectUrl 검증
  const urlToAliases = new Map<string, string[]>();
  for (const [alias, project] of entries) {
    const existing = urlToAliases.get(project.projectUrl) ?? [];
    existing.push(alias);
    urlToAliases.set(project.projectUrl, existing);
  }
  for (const [url, aliases] of urlToAliases) {
    if (aliases.length > 1) {
      throw new Error(
        `Duplicate projectUrl '${url}' found in aliases: ${aliases.join(', ')}. Each project must have a unique projectUrl.`,
      );
    }
  }
}

export function getAllProjectAliases(config: GpmConfig): string[] {
  return Object.keys(config.projects);
}

export function saveGpmrc(
  config: GpmConfig,
  cwd: string = process.cwd(),
): void {
  const gpmrcPath = join(cwd, '.gpmrc');
  writeFileSync(gpmrcPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}
