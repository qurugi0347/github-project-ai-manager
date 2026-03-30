import { existsSync, mkdirSync, copyFileSync, chmodSync, unlinkSync } from 'fs';
import { join } from 'path';
import { HOOK_REGISTRY, findHookByName, HookDefinition } from '../hooks/hook-registry';
import { mergeHookSettings, removeHookSettings, getInstalledHooks } from '../utils/settings';
import { findTemplateDir } from '../utils/template';

export interface InstallResult {
  filesInstalled: number;
  settingsChanged: boolean;
}

export function installHookFiles(
  hooks: HookDefinition[],
  options: { silent?: boolean } = {},
): InstallResult {
  const cwd = process.cwd();
  const hooksDir = join(cwd, '.claude', 'hooks');
  const settingsPath = join(cwd, '.claude', 'settings.json');

  const templateDir = findTemplateDir();
  if (!templateDir) {
    if (!options.silent) {
      console.error('✗ 템플릿 디렉토리를 찾을 수 없습니다.');
    }
    return { filesInstalled: 0, settingsChanged: false };
  }

  mkdirSync(hooksDir, { recursive: true });

  let installed = 0;
  for (const hook of hooks) {
    const dest = join(hooksDir, hook.fileName);
    if (existsSync(dest)) {
      if (!options.silent) {
        console.log(`  - ${hook.name}: 이미 존재 (건너뜀)`);
      }
      continue;
    }

    const src = join(templateDir, 'hooks', hook.fileName);
    if (!existsSync(src)) {
      if (!options.silent) {
        console.log(`  ⚠ ${hook.name}: 템플릿 없음`);
      }
      continue;
    }

    copyFileSync(src, dest);
    chmodSync(dest, 0o755);
    if (!options.silent) {
      console.log(`  ✓ ${hook.name} 설치됨`);
    }
    installed++;
  }

  const settingsChanged = mergeHookSettings(settingsPath, hooks);
  if (settingsChanged && !options.silent) {
    console.log('✓ settings.json에 hooks 등록 완료');
  }

  return { filesInstalled: installed, settingsChanged };
}

export function runHooksList(): void {
  const cwd = process.cwd();
  const hooksDir = join(cwd, '.claude', 'hooks');
  const settingsPath = join(cwd, '.claude', 'settings.json');

  const hooks = getInstalledHooks(hooksDir, settingsPath, HOOK_REGISTRY);

  console.log('GPM Claude Code Hooks:\n');
  for (const hook of hooks) {
    const installed = hook.fileInstalled && hook.settingsRegistered;
    const icon = installed ? '✓' : '✗';
    console.log(`  ${icon} ${hook.name} — ${hook.description}`);
    if (!installed) {
      if (!hook.fileInstalled) console.log(`    파일 없음: .claude/hooks/`);
      if (!hook.settingsRegistered) console.log(`    설정 없음: .claude/settings.json`);
    }
  }
}

export function runHooksInstall(name?: string): void {
  const hooks = name
    ? ([findHookByName(name)].filter(Boolean) as HookDefinition[])
    : HOOK_REGISTRY;

  if (name && hooks.length === 0) {
    console.error(`✗ '${name}' hook을 찾을 수 없습니다.`);
    console.log(`사용 가능: ${HOOK_REGISTRY.map((h) => h.name).join(', ')}`);
    process.exit(1);
  }

  const result = installHookFiles(hooks);
  if (result.filesInstalled === 0 && !result.settingsChanged) {
    console.log('모든 hooks가 이미 설치되어 있습니다.');
  }
}

export function runHooksRemove(name?: string): void {
  const cwd = process.cwd();
  const hooksDir = join(cwd, '.claude', 'hooks');
  const settingsPath = join(cwd, '.claude', 'settings.json');

  const hooks = name
    ? ([findHookByName(name)].filter(Boolean) as HookDefinition[])
    : HOOK_REGISTRY;

  if (name && hooks.length === 0) {
    console.error(`✗ '${name}' hook을 찾을 수 없습니다.`);
    process.exit(1);
  }

  let removed = 0;
  for (const hook of hooks) {
    const filePath = join(hooksDir, hook.fileName);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
      console.log(`  ✓ ${hook.name} 제거됨`);
      removed++;
    }
  }

  const unregistered = removeHookSettings(settingsPath, hooks);
  if (unregistered) {
    console.log('✓ settings.json에서 hooks 제거 완료');
  }

  if (removed === 0 && !unregistered) {
    console.log('제거할 hooks가 없습니다.');
  }
}
