/** 개별 프로젝트 설정 (.gpmrc의 projects 맵 값) */
export interface ProjectConfig {
  projectNumber: number;
  projectUrl: string;
}

/** 멀티 프로젝트 .gpmrc 형식 */
export interface MultiProjectGpmConfig {
  owner: string;
  ownerType: 'user' | 'organization';
  repo: string;
  defaultProject: string;
  projects: Record<string, ProjectConfig>;
}

/** 레거시 단일 프로젝트 .gpmrc 형식 (하위 호환) */
export interface LegacyGpmConfig {
  owner: string;
  ownerType: 'user' | 'organization';
  repo: string;
  projectNumber: number;
  projectUrl: string;
}

/** .gpmrc 파일의 raw 형식 (레거시 또는 멀티) */
export type RawGpmConfig = LegacyGpmConfig | MultiProjectGpmConfig;

/** 정규화된 설정 (항상 멀티 프로젝트 형식) */
export type GpmConfig = MultiProjectGpmConfig;
