export interface HookDefinition {
  name: string;
  description: string;
  fileName: string;
  event: 'UserPromptSubmit' | 'PostToolUse' | 'Stop';
  matcher?: string;
}

export const HOOK_REGISTRY: HookDefinition[] = [
  {
    name: 'gpm-session-briefing',
    description: '세션 시작 시 태스크 현황 브리핑',
    fileName: 'gpm-session-briefing.sh',
    event: 'UserPromptSubmit',
  },
  {
    name: 'gpm-commit-linker',
    description: '커밋 후 태스크 연결 제안',
    fileName: 'gpm-commit-linker.sh',
    event: 'PostToolUse',
    matcher: 'Bash',
  },
  {
    name: 'gpm-response-suggest',
    description: '응답 완료 후 태스크 완료 제안',
    fileName: 'gpm-response-suggest.sh',
    event: 'Stop',
  },
];

export function findHookByName(name: string): HookDefinition | undefined {
  return HOOK_REGISTRY.find((h) => h.name === name);
}
