# GPM 시스템 아키텍처

## 1. 시스템 구성도

### 멀티 프로젝트 구조

    ┌───────────────────┐
    │  Repo A (.gpmrc)  │──┐
    └───────────────────┘  │
    ┌───────────────────┐  │    ┌──────────────────┐     ┌────────────────────┐
    │  Repo B (.gpmrc)  │──┼───▶│   gpm server     │────▶│  ~/.gpm/data.db    │
    └───────────────────┘  │    │  localhost:3000   │     │  (단일 SQLite)      │
    ┌───────────────────┐  │    └────────┬─────────┘     └────────────────────┘
    │  Repo C (.gpmrc)  │──┘             │
    └───────────────────┘          ┌─────▼───────┐
                                   │  GitHub API │
                                   │  (GraphQL)  │
                                   └─────────────┘

- 하나의 `gpm server`가 여러 Git Repository의 GitHub Project를 관리
- 각 Repo 루트에 `.gpmrc` 파일이 존재하며, owner/projectNumber 등 프로젝트 식별 정보를 포함
- CLI는 현재 디렉토리의 `.gpmrc`를 읽어 HTTP 헤더로 서버에 전달
- 서버는 `project_id`로 모든 데이터를 스코핑하여 프로젝트 간 데이터 격리 보장
- 단일 SQLite 파일(`~/.gpm/data.db`)에 모든 프로젝트 데이터를 저장

### 개발 환경 (Development)

    ┌──────────────────┐  proxy /api/*  ┌──────────────┐     ┌─────────────┐
    │  Vite Dev Server │ ─────────────▶ │  NestJS API  │────▶│   SQLite    │
    │  localhost:5173  │                │ localhost:3000│     │   (Local)   │
    │  (HMR, React)   │                └──────┬────────┘     └─────────────┘
    └──────────────────┘                      │
                                        ┌─────▼───────┐
                                        │  GitHub API │
                                        │  (GraphQL)  │
                                        └─────────────┘

- Vite dev server에서 React 개발 (HMR, Fast Refresh)
- `vite.config.ts`의 proxy 설정으로 `/api/*` 요청을 NestJS로 전달
- UI 개발 체험은 일반 React+Vite 프로젝트와 동일

### 배포 환경 (Production)

    ┌─────────────┐     ┌───────────────────────────┐     ┌─────────────┐
    │  CLI (gpm)  │────▶│      NestJS Server        │────▶│   SQLite    │
    └─────────────┘     │  ┌─────────────────────┐  │     │   (Local)   │
                        │  │ /api/*   Controller  │  │     └─────────────┘
    ┌─────────────┐     │  ├─────────────────────┤  │
    │  Browser    │────▶│  │ /*  ServeStatic     │  │     ┌─────────────┐
    └─────────────┘     │  │ (React 빌드 결과물)   │  │────▶│  GitHub API │
                        │  └─────────────────────┘  │     │  (GraphQL)  │
                        └───────────────────────────┘     └─────────────┘
                               localhost:3000

- `gpm server` 하나만 실행하면 API + Web UI 모두 제공
- `@nestjs/serve-static`의 ServeStaticModule로 React 빌드 결과물 서빙
- API: `http://localhost:3000/api/*`
- Web UI: `http://localhost:3000/`

### CLI 독립 실행 모드

    ┌─────────────┐     NestJS Standalone     ┌─────────────┐
    │  CLI (gpm)  │────(DI Container만)──────▶│   SQLite    │
    └─────────────┘     Service 직접 호출      │   (Local)   │
                              │               └─────────────┘
                        ┌─────▼───────┐
                        │  GitHub API │
                        │  (GraphQL)  │
                        └─────────────┘

- HTTP 서버 없이 NestJS DI 컨테이너만 부팅 (~100ms)
- CLI에서 TaskService, SyncService 등을 직접 호출
- `gpm server`만 HTTP 리스너를 시작

### 데이터 흐름

- **CLI → API**: CLI 명령어 실행 시 localhost NestJS API에 HTTP 요청
- **Browser → Server**: 웹 브라우저에서 정적 파일 + API 모두 같은 NestJS 서버에서 제공
- **API → SQLite**: TypeORM을 통해 로컬 SQLite DB에 CRUD 수행
- **API → GitHub**: Octokit GraphQL 클라이언트로 GitHub Project V2 API 호출
- **동기화**: SyncService가 주기적으로 GitHub ↔ SQLite 간 폴링 동기화

#### ProjectContext 흐름 (멀티 프로젝트)

    ┌─────────────┐       X-GPM-Owner, X-GPM-Project-Number
    │  CLI (gpm)  │──────────────────────────────────────────▶ NestJS Server
    │  .gpmrc 읽기 │       HTTP 헤더로 전달
    └─────────────┘
                                    │
                                    ▼
                          ┌────────────────────────┐
                          │ ProjectContextMiddleware│
                          │ 헤더에서 owner,          │
                          │ projectNumber 추출       │
                          │ → projects 테이블 조회    │
                          │ → request에 project 주입  │
                          └──────────┬─────────────┘
                                    │
                                    ▼
                          ┌────────────────────────┐
                          │   Controller / Service  │
                          │ request.project로       │
                          │ project_id 스코핑 쿼리   │
                          └────────────────────────┘

1. CLI가 현재 디렉토리의 `.gpmrc`에서 `owner`, `projectNumber`를 읽음
2. HTTP 요청 시 `X-GPM-Owner`, `X-GPM-Project-Number` 헤더로 서버에 전달
3. `ProjectContextMiddleware`가 헤더를 파싱하여 `projects` 테이블에서 해당 project를 resolve
4. resolve된 project 정보를 `request.project`에 주입
5. 모든 Service는 `project_id`로 스코핑된 쿼리를 실행하여 데이터 격리

## 2. 레이어 구조

### CLI Layer

- **기술**: Commander.js + TypeScript
- **역할**: 사용자 명령어 파싱 및 NestJS Standalone Mode로 Service 직접 호출
- **특징**: HTTP 서버 없이 NestFactory.createApplicationContext로 DI 컨테이너만 부팅하여 Service 사용. 서버 시작 불필요.
- **의존성**: @gpm/backend (workspace dependency)
- **위치**: `src/cli/`

### API Layer

- **기술**: NestJS Controller
- **역할**: HTTP 엔드포인트 제공, 요청 검증 (ValidationPipe), 응답 직렬화
- **서빙**: localhost 전용 (기본 포트: 3000)
- **위치**: `src/server/modules/*/`

### Service Layer

- **기술**: NestJS Injectable Services
- **역할**: 비즈니스 로직 처리
- **주요 서비스**:
  - TaskService: 태스크 CRUD, 상태 관리
  - SyncService: GitHub ↔ 로컬 동기화 로직
  - LabelService: 라벨 CRUD
  - MilestoneService: 마일스톤 CRUD
  - ProjectService: GitHub Project 설정 관리
  - GitHubService: GitHub GraphQL API 호출 래퍼

### Data Layer

- **기술**: TypeORM + better-sqlite3
- **역할**: 데이터 영속성 관리
- **DB 위치**: `~/.gpm/data.db`
- **GitHub 연동**: Octokit GraphQL API v4로 Project V2 필드 읽기/쓰기

### Frontend Layer

- **기술**: React + Vite + TailwindCSS
- **역할**: 칸반 보드 웹 UI
- **개발**: Vite dev server (HMR) + proxy로 NestJS API 호출
- **배포**: Vite로 정적 파일 빌드 → NestJS ServeStaticModule로 서빙
- **위치**: `src/web/`

## 3. NestJS 모듈 구조

    AppModule
    ├── ServeStaticModule      # React 빌드 결과물 정적 서빙 (prod)
    ├── ProjectModule          # 멀티 프로젝트 관리 (Global)
    │   ├── ProjectController  # /api/projects
    │   ├── ProjectService     # project CRUD, resolve by owner+projectNumber
    │   ├── ProjectEntity
    │   └── ProjectContextMiddleware  # 헤더 → project resolve → request 주입
    ├── TaskModule             # 태스크 CRUD, 상태 관리
    │   ├── TaskController     # /api/tasks
    │   ├── TaskService
    │   └── TaskEntity
    ├── SyncModule             # GitHub ↔ 로컬 동기화
    │   ├── SyncController     # /api/sync
    │   ├── SyncService
    │   ├── SyncLogEntity
    │   └── GitHubService
    ├── LabelModule            # 라벨 관리
    │   ├── LabelController    # /api/labels
    │   ├── LabelService
    │   └── LabelEntity
    └── MilestoneModule        # 마일스톤 관리
        ├── MilestoneController # /api/milestones
        ├── MilestoneService
        └── MilestoneEntity

### 모듈 간 의존성

| 모듈 | 의존 모듈 | 설명 |
|------|-----------|------|
| ProjectModule | 없음 | Global 모듈. 멀티 프로젝트 관리, ProjectContextMiddleware 제공 |
| TaskModule | ProjectModule, LabelModule, MilestoneModule | 태스크는 프로젝트에 소속, 라벨/마일스톤 참조 |
| SyncModule | TaskModule, LabelModule, MilestoneModule, ProjectModule | 전체 데이터 동기화 수행 |
| LabelModule | ProjectModule | 라벨은 프로젝트 범위 |
| MilestoneModule | ProjectModule | 마일스톤은 프로젝트 범위 |

> **ProjectModule**은 `@Global()` 모듈로 등록되어 모든 모듈에서 `ProjectService`와 미들웨어를 사용할 수 있습니다. `ProjectContextMiddleware`는 `AppModule`의 `configure()`에서 모든 `/api/*` 경로에 적용됩니다.

## 4. 인증 흐름

    1. 사용자가 gh auth login 완료 (사전 조건)
           │
           ▼
    2. gpm init 실행
           │
           ▼
    3. gh auth token 명령어로 토큰 추출
           │
           ▼
    4. ~/.gpm/config.json에 토큰 및 프로젝트 정보 저장
       {
         "github_token": "gho_xxxx...",
         "owner": "username",
         "repo": "repo-name",
         "project_number": 1
       }
           │
           ▼
    5. NestJS 서버 시작 시 config.json 로드
           │
           ▼
    6. Octokit 클라이언트에 토큰 주입
           │
           ▼
    7. GitHub API 요청 시 Authorization: Bearer 헤더 자동 첨부

### 토큰 갱신

- `gh auth token`은 항상 유효한 토큰을 반환 (gh CLI가 자동 갱신)
- GPM은 서버 시작 시마다 최신 토큰을 확인
- 토큰 만료 시 사용자에게 `gh auth login` 재실행 안내

## 5. 디렉토리 구조

    src/
    ├── cli/                           # CLI
    │   ├── commands/
    │   │   ├── task.ts                # gpm task create|list|update|delete|status
    │   │   ├── sync.ts                # gpm sync
    │   │   ├── label.ts               # gpm label create|list
    │   │   ├── milestone.ts           # gpm milestone create|list
    │   │   ├── server.ts              # gpm server
    │   │   └── init.ts                # gpm init / gpm auth / gpm config
    │   ├── utils/
    │   │   ├── api-client.ts          # NestJS API HTTP 클라이언트
    │   │   ├── config.ts              # ~/.gpm/config.json 관리
    │   │   └── formatter.ts           # CLI 출력 포매팅
    │   └── index.ts                   # CLI 엔트리포인트
    ├── server/                        # NestJS 백엔드
    │   ├── modules/
    │   │   ├── task/
    │   │   │   ├── task.controller.ts
    │   │   │   ├── task.service.ts
    │   │   │   ├── task.entity.ts
    │   │   │   ├── task.module.ts
    │   │   │   └── dto/
    │   │   ├── sync/
    │   │   │   ├── sync.controller.ts
    │   │   │   ├── sync.service.ts
    │   │   │   ├── sync-log.entity.ts
    │   │   │   ├── sync.module.ts
    │   │   │   └── github.service.ts
    │   │   ├── label/
    │   │   │   ├── label.controller.ts
    │   │   │   ├── label.service.ts
    │   │   │   ├── label.entity.ts
    │   │   │   └── label.module.ts
    │   │   ├── milestone/
    │   │   │   ├── milestone.controller.ts
    │   │   │   ├── milestone.service.ts
    │   │   │   ├── milestone.entity.ts
    │   │   │   └── milestone.module.ts
    │   │   └── project/
    │   │       ├── project.controller.ts
    │   │       ├── project.service.ts
    │   │       ├── project.entity.ts
    │   │       ├── project.module.ts
    │   │       └── project-context.middleware.ts  # 헤더에서 project resolve
    │   ├── app.module.ts              # AppModule (ServeStaticModule 포함)
    │   └── main.ts                    # NestJS 서버 부트스트랩
    └── web/                           # React 프론트엔드
        ├── src/
        │   ├── components/
        │   │   ├── Board/             # 칸반 보드
        │   │   ├── Task/              # 태스크 카드, 상세
        │   │   ├── Label/             # 라벨 뱃지, 관리
        │   │   └── Layout/            # 헤더, 사이드바
        │   ├── pages/
        │   │   ├── DashboardPage.tsx
        │   │   ├── BoardPage.tsx
        │   │   ├── TaskListPage.tsx
        │   │   ├── TaskDetailPage.tsx
        │   │   └── SettingsPage.tsx
        │   ├── hooks/
        │   │   ├── useTask.ts
        │   │   ├── useSync.ts
        │   │   └── useProject.ts
        │   ├── api/
        │   │   └── client.ts          # API 호출 래퍼
        │   ├── App.tsx
        │   └── main.tsx
        ├── index.html
        ├── vite.config.ts             # proxy: { '/api': 'http://localhost:3000' }
        └── tailwind.config.js

### 설정 파일 경로

| 파일 | 경로 | 용도 |
|------|------|------|
| 사용자 설정 | `~/.gpm/config.json` | GitHub 토큰, 글로벌 설정 |
| 로컬 DB | `~/.gpm/data.db` | SQLite 데이터베이스 (모든 프로젝트 데이터) |
| 서버 PID | `~/.gpm/server.pid` | 데몬 모드 서버 프로세스 ID |
| 로그 | `~/.gpm/logs/` | 서버 및 동기화 로그 |
| 프로젝트 설정 | `<repo>/.gpmrc` | 프로젝트별 owner, projectNumber 등 |

## 6. 배포 구조

### npm 패키지 구성

    gpm (npm 패키지)
    ├── bin/
    │   └── gpm                        # CLI 엔트리포인트 (#!/usr/bin/env node)
    ├── dist/
    │   ├── cli/                       # CLI 빌드 결과
    │   ├── server/                    # NestJS 빌드 결과
    │   └── web/                       # React 정적 빌드 결과
    └── package.json
        └── bin: { "gpm": "./bin/gpm" }

### 설치 및 실행

```bash
# 글로벌 설치
npm install -g gpm

# 초기 설정
gpm init

# 서버 시작 (NestJS + React 정적 파일 서빙)
gpm server

# CLI 사용
gpm task list
gpm task create "새 기능 구현"
```

### 서버 상주 방식

| 명령어 | 동작 | 설명 |
|--------|------|------|
| `gpm server` | 포그라운드 실행 | 터미널에서 직접 실행. Ctrl+C로 종료 |
| `gpm server --daemon` | 백그라운드 실행 | 데몬으로 실행. PID를 `~/.gpm/server.pid`에 기록 |
| `gpm server stop` | 서버 종료 | `~/.gpm/server.pid`를 읽어 프로세스 종료 |

- **포그라운드**: `gpm server` — 로그가 터미널에 직접 출력됨
- **백그라운드 (데몬)**: `gpm server --daemon` — 프로세스를 detach하고 PID를 `~/.gpm/server.pid`에 저장. 로그는 `~/.gpm/logs/`에 기록
- **종료**: `gpm server stop` — PID 파일에서 프로세스 ID를 읽어 graceful shutdown
- **서버 미실행 시 CLI standalone fallback**: 서버가 실행 중이지 않을 때 CLI 명령어를 실행하면, NestJS Standalone Mode로 DI 컨테이너만 부팅하여 Service를 직접 호출 (HTTP 서버 없이 동작)

### 서버 실행 구조

- `gpm server` 실행 시 NestJS 서버가 localhost에서 시작
- `ServeStaticModule`로 React 빌드 결과물(dist/web/)을 정적 서빙
- SPA fallback: 모든 비-API 경로를 `index.html`로 라우팅
- API 엔드포인트: `http://localhost:3000/api/*`
- 웹 UI: `http://localhost:3000/`

### 개발 서버 실행 (개발자용)

```bash
# 터미널 1: NestJS API 서버
npm run start:dev

# 터미널 2: Vite dev server (HMR)
npm run dev:web
# → http://localhost:5173 에서 개발
# → /api/* 요청은 localhost:3000으로 proxy
```
