# 개발 로드맵

GPM(GitHub Project Manager) 프로젝트의 단계별 개발 계획이다. 각 Phase는 이전 Phase의 완료를 전제로 하며, Phase 내 항목은 우선순위 순으로 정렬되어 있다.

## Phase 1: MVP

핵심 CLI 기능과 GitHub Project V2 연동을 완성하는 단계. 최소한의 기능으로 Claude Code 환경에서 태스크를 관리할 수 있도록 한다.

### 1.1 프로젝트 초기 설정

- Monorepo 구성 (src/cli, src/server, src/web (단일 패키지 구조))
- TypeScript 설정 (tsconfig, path alias)
- ESLint + Prettier 설정
- 패키지 매니저 설정 (단일 패키지 (모노레포 불필요))
- 빌드 파이프라인 구성

### 1.2 인증 및 초기화

- `gpm init` 명령어 구현 (대화형 프로젝트 연결)
- `gpm auth` 명령어 구현 (gh auth token 연동)
- `~/.gpm/config.json` 설정 파일 관리
- `gpm config` 명령어 구현

### 1.3 SQLite 스키마

- TypeORM 엔티티 정의
  - Task (id, github_item_id, title, body, status, github_updated_at, local_updated_at, is_dirty)
  - Label (id, name, color, description)
  - Milestone (id, title, description, due_date)
  - TaskLabel (task_id, label_id)
  - SyncLog (id, sync_type, started_at, completed_at, status, items_*)
- 마이그레이션 설정
- 로컬 DB 파일 위치: `~/.gpm/data/<project-hash>.db`

### 1.4 GitHub GraphQL API 연동

- Octokit GraphQL 클라이언트 설정
- 프로젝트 항목 조회 쿼리 구현
- 프로젝트 필드 조회 쿼리 구현
- Rate Limit 관리 모듈
- API 에러 핸들링

### 1.5 Pull 동기화

- `gpm sync --pull` 명령어 구현
- GitHub 항목 → 로컬 DB 매핑 로직
- 신규/수정/삭제 항목 감지 및 반영
- 동기화 로그 기록
- 동기화 상태 출력

### 1.6 태스크 CRUD

- `gpm task list` 구현 (필터링 옵션 포함)
- `gpm task show <id>` 구현
- `gpm task create <title>` 구현 (로컬 DB에 생성, is_dirty=true)
- `gpm task update <id>` 구현
- `gpm task delete <id>` 구현
- `gpm task status <id> <status>` 구현

### 1.7 JSON 출력

- `--json` 전역 옵션 구현
- 모든 명령어에 JSON 출력 형식 적용
- Claude Code 파싱에 적합한 JSON 구조 설계

### Phase 1 완료 기준

- `gpm init` → `gpm auth` → `gpm sync --pull` → `gpm task list --json` 워크플로우 동작
- Claude Code에서 `gpm task create/update/status --json`으로 태스크 관리 가능
- 로컬 DB에서 태스크 CRUD 및 Pull 동기화 정상 동작

---

## Phase 2: 웹 UI + 양방향 동기화

웹 기반 칸반 보드와 Push 동기화를 추가하여 시각적 태스크 관리를 가능하게 하는 단계.

### 2.1 NestJS REST API

- NestJS 모듈 설정 (src/server/modules/)
- 태스크 CRUD API 엔드포인트
  - `GET /api/tasks` (필터링, 페이지네이션)
  - `GET /api/tasks/:id`
  - `POST /api/tasks`
  - `PATCH /api/tasks/:id`
  - `DELETE /api/tasks/:id`
- 라벨/마일스톤 조회 API
- 동기화 상태/트리거 API
- SQLite 연결 (TypeORM, CLI와 동일 DB 사용)

### 2.2 React + Vite 셋업

- React + TypeScript + Vite 프로젝트 설정 (src/web/)
- Tailwind CSS 설정
- TanStack Query 설정
- React Router 설정
- 레이아웃 컴포넌트 (Header, Sidebar, Content)
- NestJS에서 정적 파일 서빙 설정 (ServeStaticModule)

### 2.3 칸반 보드

- KanbanColumn 컴포넌트
- TaskCard 컴포넌트
- @dnd-kit 드래그 앤 드롭 통합
- 드래그로 상태 변경 (낙관적 업데이트)
- 필터 바 컴포넌트
- 빠른 태스크 생성 (인라인 입력)

### 2.4 태스크 목록/상세

- TaskTable 컴포넌트 (정렬, 필터링)
- 페이지네이션 컴포넌트
- TaskDetail 컴포넌트
- 인라인 편집 (제목, 본문)
- 마크다운 렌더링
- 메타데이터 사이드바

### 2.5 Push 동기화

- `gpm sync --push` 명령어 구현
- is_dirty 항목 GitHub 반영 로직
- GraphQL Mutation 실행 (생성/수정/삭제)
- 동기화 로그 기록
- 에러 핸들링 및 부분 성공 처리

### 2.6 자동 폴링

- 서버 실행 시 자동 폴링 시작
- 설정 가능한 폴링 간격
- 폴링 결과에 따른 TanStack Query 캐시 무효화
- 에러 시 백오프 전략

### 2.7 서버 명령어

- `gpm server` 명령어 구현 (NestJS + React 정적 파일 서빙 (ServeStaticModule))
- `gpm server stop` 명령어 구현
- 포트 설정 옵션
- 브라우저 자동 열기

### Phase 2 완료 기준

- `gpm server`로 웹 UI 접속 가능
- 칸반 보드에서 드래그 앤 드롭으로 태스크 상태 변경
- 웹 UI에서 태스크 생성/수정/삭제
- 로컬 변경 사항이 `gpm sync --push`로 GitHub에 반영
- 자동 폴링으로 GitHub 변경 사항이 웹 UI에 실시간 반영

---

## Phase 3: 고급 기능

사용 편의성을 높이는 부가 기능을 추가하는 단계.

### 3.1 라벨/마일스톤 CRUD + 동기화

- `gpm label list/create` 구현
- `gpm milestone list/create` 구현
- 라벨/마일스톤 GitHub 동기화
- 웹 UI에서 라벨/마일스톤 관리

### 3.2 필터링/검색

- CLI 고급 필터 조합 (복수 조건)
- 웹 UI 필터 바 고도화
- 텍스트 검색 (제목 + 본문, SQLite FTS)
- 필터 프리셋 저장

### 3.3 대시보드 통계

- 대시보드 페이지 구현
- 프로젝트 요약 카드
- 상태별 태스크 분포 차트
- 마일스톤 진행률
- 최근 활동 타임라인

### 3.4 충돌 해결 UI

- 웹 UI 충돌 감지 알림
- 로컬 vs GitHub 값 비교 diff 뷰
- 항목별 수동 충돌 해결
- 충돌 이력 조회

### Phase 3 완료 기준

- 라벨/마일스톤을 CLI와 웹 UI 모두에서 관리 가능
- 복합 필터와 텍스트 검색으로 태스크 조회 가능
- 대시보드에서 프로젝트 현황을 한눈에 파악 가능
- 양방향 동기화 충돌 시 웹 UI에서 수동 해결 가능

---

## Phase 4: 확장

서비스 범위를 확장하고 배포를 준비하는 단계.

### 4.1 Custom Field 동기화

- GitHub Project V2 Custom Field 조회 및 매핑
- Text, Number, Date, Single Select 필드 지원
- Custom Field 값 표시 및 편집 (웹 UI)
- Custom Field 기반 필터링

### 4.2 멀티 프로젝트

- 여러 GitHub Project 동시 관리
- `--project` 옵션으로 프로젝트 전환
- 프로젝트별 독립 SQLite DB
- 프로젝트 목록 관리 (`gpm project list/add/remove`)

### 4.3 npm 배포

- CLI 패키지 빌드 설정 (esbuild/tsup)
- `npx gpm` 실행 지원
- npm 레지스트리 배포 자동화
- 버전 관리 (semantic versioning)
- CHANGELOG 자동 생성

### 4.4 Webhook 실시간 동기화

- NestJS Webhook 엔드포인트 구현
- `projects_v2_item` 이벤트 처리
- ngrok/cloudflare tunnel 통합
- Webhook Secret 검증
- 폴링 + Webhook 하이브리드 전략

### 4.5 팀 멤버 관리

- GitHub 조직 멤버 조회
- 담당자 자동 완성 (CLI, 웹 UI)
- 멤버별 태스크 필터링
- 워크로드 분포 시각화

### Phase 4 완료 기준

- Custom Field가 동기화되고 웹 UI에서 편집 가능
- 여러 프로젝트를 하나의 GPM 인스턴스로 관리 가능
- `npx gpm`으로 설치 없이 실행 가능
- Webhook으로 GitHub 변경 사항 실시간 반영

---

## Phase 5: 최적화

품질, 안정성, 성능을 강화하는 단계.

### 5.1 E2E 테스트

- CLI 통합 테스트 (실제 SQLite, Mock GitHub API)
- API 통합 테스트 (supertest)
- 웹 UI E2E 테스트 (Playwright)
- 동기화 시나리오 테스트 (충돌 해결 포함)

### 5.2 CI/CD

- GitHub Actions 워크플로우
  - PR 시 린트/테스트 실행
  - main 머지 시 npm 배포
- 코드 커버리지 리포트
- 자동 릴리스 노트

### 5.3 에러 핸들링

- 전역 에러 핸들러 (CLI, API)
- 사용자 친화적 에러 메시지
- 네트워크 에러 재시도 로직
- 데이터 정합성 검증
- 복구 가능한 상태 관리

### 5.4 문서화

- README 작성 (설치, 빠른 시작, 설정)
- CLI 명령어 레퍼런스
- API 문서 (Swagger/OpenAPI)
- 기여 가이드 (CONTRIBUTING.md)
- 아키텍처 문서

### 5.5 성능 최적화

- SQLite 쿼리 최적화 (인덱스, 쿼리 플랜)
- GraphQL 쿼리 최적화 (필요한 필드만 조회)
- 웹 UI 번들 사이즈 최적화 (코드 스플리팅, 트리 셰이킹)
- 대량 데이터 처리 (가상 스크롤, 무한 스크롤)
- 메모리 사용량 최적화

### Phase 5 완료 기준

- 전체 테스트 커버리지 80% 이상
- CI/CD 파이프라인으로 자동 배포
- 에러 발생 시 사용자가 원인을 파악하고 복구할 수 있음
- 1,000개 이상의 태스크에서도 원활한 성능
- 완전한 문서화로 신규 사용자가 독립적으로 시작 가능
