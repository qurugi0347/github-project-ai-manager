# GPM (GitHub Project Manager)

GitHub Project V2를 활용한 프로젝트 매니저. CLI(`gpm`)로 태스크를 관리하고, 웹 UI로 시각화한다.

## 프로젝트 요약

| 항목 | 내용 |
|------|------|
| 목적 | Claude Code에서 GitHub Project 기반 태스크 관리 CLI + 웹 대시보드 |
| SSOT | GitHub Project V2 (로컬 SQLite는 캐시) |
| 대상 | 개인 개발자 (1차), 소규모 팀 (2차 확장) |

## 기술 스택

| 영역 | 기술 |
|------|------|
| CLI | Commander.js, TypeScript |
| Backend | NestJS, TypeORM, SQLite (better-sqlite3) |
| Frontend | React, Vite, TailwindCSS |
| GitHub API | Octokit, GraphQL API v4 |
| 패키지 관리 | Yarn 3 (Berry), Workspaces |
| Node | v24+ (.nvmrc) |

## 프로젝트 구조

```
apps/
├── backend/    # @gpm/backend - NestJS API + 서비스 레이어
├── cli/        # @gpm/cli - Commander.js CLI (backend를 standalone으로 사용)
└── frontend/   # @gpm/frontend - React + Vite 웹 UI
```

### CLI-Backend 관계

CLI는 NestJS Standalone Mode로 backend 서비스를 직접 호출한다 (HTTP 서버 불필요).
`gpm server` 명령어만 HTTP 리스너를 시작하여 웹 UI를 서빙한다.

```
gpm task list  → NestFactory.createApplicationContext → TaskService → SQLite
gpm server     → NestFactory.create (HTTP)           → API + ServeStatic(React)
```

### Workspace 의존성

```
@gpm/cli → @gpm/backend (workspace:*)
```

빌드 순서: `backend` → `cli` → `frontend`

## 기획서 참조 가이드

기획서는 `docs/spec/`에 있다. 기능 구현 전 반드시 해당 스펙 문서를 참조한다.

| 작업 | 참조 문서 |
|------|----------|
| 전체 구조 파악 | `docs/spec/architecture.md` |
| DB 스키마, Entity 작성 | `docs/spec/data-model.md` |
| CLI 명령어 구현 | `docs/spec/cli.md` |
| API 엔드포인트 구현 | `docs/spec/cli.md` (동일 기능의 HTTP 버전) |
| 웹 UI 페이지/컴포넌트 | `docs/spec/web-ui.md` |
| GitHub 동기화 로직 | `docs/spec/sync.md` |
| 개발 우선순위 확인 | `docs/spec/roadmap.md` |

### 개발 순서 (roadmap.md 기준)

1. **Phase 1 (MVP)**: CLI + GitHub Sync (Pull) + Task CRUD
2. **Phase 2**: 웹 UI + 양방향 Sync + `gpm server`
3. **Phase 3**: 라벨/마일스톤 + 필터링 + 대시보드
4. **Phase 4**: Custom Field, 멀티 프로젝트, npm 배포
5. **Phase 5**: 테스트, CI/CD, 문서화

## 개발 명령어

```bash
# 개발 서버
yarn dev:backend          # NestJS watch mode (port 3000)
yarn dev:frontend         # Vite dev server (port 5173, proxy → 3000)

# 빌드
yarn build                # 전체 빌드 (cli → backend → frontend)
yarn build:backend
yarn build:cli
yarn build:frontend

# CLI 실행
yarn gpm -- --help
yarn gpm -- task list --json
yarn gpm -- health        # standalone 연동 검증
```

## 규칙

<rules>

### 코드 작성

- TypeScript strict mode 사용
- backend 서비스 로직은 `apps/backend/src/modules/` 에만 작성
- CLI는 backend의 빌드 결과물(`dist/`)을 import한다 — 소스를 직접 import하지 않는다
- Entity 변경 시 `docs/spec/data-model.md`와 일치하는지 확인

### Git

- 커밋 메시지: `FEAT:`, `FIX:`, `REFACTOR:`, `DOCS:`, `CHORE:` prefix 사용
- 빌드 결과물(`dist/`), `node_modules/`, `.idea/` 는 커밋하지 않는다

### 기획서 동기화

- 스펙 변경 시 `docs/spec/` 문서도 함께 업데이트한다
- 기획서와 코드가 불일치하면 기획서를 기준으로 코드를 수정한다

</rules>
