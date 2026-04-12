---
name: multi-project-context
description: 멀티 프로젝트 지원 작업 맥락
created: 2026-04-03
---

# 멀티 프로젝트 지원 Context

## 사용자 요청 원문

> 이 gpm 이 하나의 github repo에서 하나의 gpm project만 관리할 수 있는데
> 이걸 하나의 repo에서 여러개의 project를 관리할 수 있도록 구조를 잡아줘
> ex) 기획 & 디자인 project, 개발 project
> 이런식으로 2개의 project에서 각자 milestone 과 issue를 생성하고 관리할 예정이야

## 비즈니스 배경

- 하나의 repo에서 "기획 & 디자인"과 "개발" 등 여러 GitHub Project V2를 동시에 운영
- 각 project는 독립적인 milestone과 issue를 가짐
- project 간 데이터가 섞이지 않아야 함 (격리)

## 기술적 배경

### 이미 멀티 프로젝트 대응 완료된 영역 (변경 불필요)

- **DB**: `projects` 테이블 존재, 모든 Entity에 `project_id` FK
- **Backend Service**: 모든 메서드가 `projectId` 파라미터로 스코핑
- **ProjectContextMiddleware**: HTTP 헤더 `X-GPM-Owner` + `X-GPM-Project-Number`로 resolve
- **Frontend**: `ProjectListPage` → `ProjectPage` (projectId 쿼리스트링)

### 병목: "1 repo = 1 project" 가정이 남아있는 영역 (변경 필요)

- `.gpmrc`: `projectNumber` 단일 값
- CLI `--project` 옵션: 스펙에만 정의, 미구현
- `gpm init`: 단일 project만 생성
- `getProjectHeaders()`: 항상 같은 projectNumber 전송

## 탐색한 코드

| 파일 | 관련 내용 |
|------|----------|
| `.gpmrc` | 현재 단일 project 설정 구조 |
| `apps/cli/src/types.ts` | `GpmConfig` 인터페이스 |
| `apps/cli/src/utils/gpmrc.ts` | `.gpmrc` 파싱, `getProjectHeaders()` |
| `apps/cli/src/utils/api-client.ts` | 모든 API 요청에 project 헤더 자동 첨부 |
| `apps/cli/src/index.ts` | CLI 명령어 정의 (`--project` 옵션 없음) |
| `apps/backend/src/modules/project/project.entity.ts` | Project Entity (UNIQUE: owner + project_number) |
| `apps/backend/src/modules/project/project.service.ts` | findOrCreate 로직 |
| `apps/backend/src/middleware/project-context.middleware.ts` | 헤더 기반 project resolve |
| `docs/spec/cli.md` | `--project` 전역 옵션 스펙 정의 |
| `docs/spec/architecture.md` | 멀티 프로젝트 아키텍처 다이어그램 |

## 결정 사항

| 결정 | 근거 | 일시 |
|------|------|------|
| sync는 항상 전체 projects 동기화 | 부분 sync 불필요한 복잡도 | 2026-04-03 |
| gpm init 재실행 시 project 추가 여부 질문 | UX 자연스러움 | 2026-04-03 |
| 같은 URL → 중복 무시, 새 URL → 연동 | 중복 등록 방지 | 2026-04-03 |
| 중복 projectNumber validation 진행 | 같은 project 다른 alias 방지 | 2026-04-03 |
| 같은 repo 가정, project 간 데이터 격리 보장 | 기획 issue도 같은 repo지만 다른 project 데이터 혼재 방지 | 2026-04-03 |
| URL을 `/repository/:repoId/project/:projectId`로 변경 | repo→project 계층 구조를 URL에 반영, 사용자 요청 | 2026-04-03 |
| project 전환을 탭 네비게이션으로 구현 | 같은 repo 내 빠른 전환, 직관적 | 2026-04-03 |
| DB `projects` 테이블에 `alias` 컬럼 추가 (A안) | API 응답에 자연 포함, CLI/서버 양쪽 활용 | 2026-04-03 |
| `/projects/by-repo` 신규 엔드포인트 추가 | 기존 `/projects` API 변경 없이 repo별 조회 | 2026-04-03 |