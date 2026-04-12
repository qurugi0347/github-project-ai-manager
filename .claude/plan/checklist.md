---
name: multi-project-checklist
description: 멀티 프로젝트 지원 실행 체크리스트
created: 2026-04-03
---

# 멀티 프로젝트 지원 Checklist

## Phase 1: 계획

- [x] 목적 확인
- [x] Context 수집 (현재 코드 구조 분석)
- [x] 설계 결정 (사용자 확인)
- [x] Plan 문서 작성
- [x] FE 화면 구성 설계 (URL 구조 + 탭 네비게이션)

## Phase 2: 검증

- [ ] Code Flow 분석: gpmrc 로딩 → 헤더 전송 → 미들웨어 resolve 흐름
- [ ] Breaking Change 확인: 레거시 .gpmrc 하위 호환
- [ ] URL 변경 영향: 기존 `/projects/:id` → `/repository/:repoId/project/:projectId`
- [ ] sync 전체 동기화 시 에러 핸들링 (1개 project 실패해도 나머지 계속)

## Phase 3: 구현

### Task 1: GpmConfig 타입 변경 (CLI)
- [ ] `apps/cli/src/types.ts`에 `ProjectConfig`, `MultiProjectGpmConfig` 인터페이스 추가
- [ ] 레거시 `GpmConfig` 타입 유지 (하위 호환)
- [ ] 커밋

### Task 2: gpmrc.ts 리팩토링 (CLI)
- [ ] `loadGpmrc()` — 멀티/레거시 형식 모두 파싱
- [ ] `resolveProject(alias?)` — alias로 project config 조회
- [ ] `getProjectHeaders(alias?)` — 특정 project의 헤더 생성
- [ ] `validateGpmrc()` — 중복 projectNumber/URL 검증
- [ ] 레거시 → 멀티 형식 메모리 내 변환 로직
- [ ] 커밋

### Task 3: --project 전역 옵션 (CLI)
- [ ] `apps/cli/src/index.ts`에 `-p, --project <alias>` 전역 옵션 추가
- [ ] 모든 명령어에서 `opts.project` → `resolveProject()` 연결
- [ ] 미지정 시 `defaultProject` 사용
- [ ] 커밋

### Task 4: gpm project 서브커맨드 (CLI)
- [ ] `apps/cli/src/commands/project.ts` 생성
- [ ] `gpm project list` — 등록된 프로젝트 목록 출력
- [ ] `gpm project add` — interactive로 새 프로젝트 등록 + validation
- [ ] `gpm project remove <alias>` — 프로젝트 제거 (defaultProject면 경고)
- [ ] `gpm project default <alias>` — 기본 프로젝트 변경
- [ ] 커밋

### Task 5: gpm init 멀티 프로젝트 대응 (CLI)
- [ ] 기존 `.gpmrc` 존재 시 "프로젝트 추가?" 질문
- [ ] 같은 URL/projectNumber → 중복 감지 → 무시
- [ ] 새 URL → alias 입력 → 연동
- [ ] `.gpmrc` 없으면 기존 init 로직 + 새 형식으로 생성
- [ ] 커밋

### Task 6: gpm sync 전체 동기화 (CLI)
- [ ] `sync pull` 시 `.gpmrc`의 모든 projects 순회
- [ ] 각 project별 독립 동기화 (getProjectHeaders로 헤더 교체)
- [ ] 동기화 시 alias를 DB에 저장 (sync → ProjectService.findOrCreate에 alias 전달)
- [ ] 개별 project 실패 시 에러 로그 + 나머지 계속
- [ ] 결과 요약 출력 (성공/실패 project 목록)
- [ ] 커밋

### Task 7: Project Entity alias 컬럼 (BE)
- [ ] `project.entity.ts`에 `alias` nullable 컬럼 추가
- [ ] `project.service.ts` — findOrCreate에 alias 파라미터 추가
- [ ] `ProjectContextMiddleware` — 헤더에서 alias도 수신하여 DB 업데이트
- [ ] API 응답 DTO에 alias 포함
- [ ] 커밋

### Task 8: repo별 project 조회 API (BE)
- [ ] `GET /projects/by-repo?owner=X&repo=Y` 엔드포인트 추가
- [ ] 해당 repo의 project 목록 반환 (alias 포함)
- [ ] 커밋

### Task 9: FE URL 구조 변경 (FE)
- [ ] Router 변경: `/repository/:repoId/project/:projectId`
- [ ] `ProjectListPage` → `RepositoryListPage` 리네이밍 + repo 카드 UI
- [ ] `ProjectPage` → `RepositoryProjectPage` 리팩토링
- [ ] `/repository/:repoId` 접속 시 defaultProject로 redirect
- [ ] FE 타입 `Project`에 `alias` 필드 추가
- [ ] 커밋

### Task 10: ProjectTabs 컴포넌트 (FE)
- [ ] `components/ProjectTabs.tsx` 생성
- [ ] repo의 project 목록을 `/projects/by-repo` API로 조회
- [ ] 현재 project 활성 탭 표시 (URL의 :projectId와 매칭)
- [ ] 탭 클릭 시 `/repository/:repoId/project/:projectId`로 navigate
- [ ] `RepositoryProjectPage`에 탭 통합
- [ ] 커밋

### Task 11: 스펙 문서 업데이트 (Docs)
- [ ] `docs/spec/cli.md` — 멀티 프로젝트 명령어 추가
- [ ] `docs/spec/data-model.md` — .gpmrc 스키마 + projects.alias 컬럼
- [ ] `docs/spec/web-ui.md` — URL 구조 변경 + 탭 네비게이션
- [ ] 커밋

## Phase 4: 리뷰

- [ ] 레거시 .gpmrc로 모든 기존 명령어 동작 확인
- [ ] 멀티 프로젝트 .gpmrc로 project 선택/동기화 동작 확인
- [ ] 중복 validation 동작 확인
- [ ] 웹 UI: 탭 전환 시 데이터 격리 확인
- [ ] 웹 UI: URL 직접 접속 시 올바른 project 로드 확인
- [ ] 전체 빌드 성공 확인