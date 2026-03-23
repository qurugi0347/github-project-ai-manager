# GPM 서비스 개요

## 1. 서비스 이름

**GPM** (GitHub Project Manager)

## 2. 목적

Claude Code에서 GitHub Project 기반 태스크 관리를 CLI로 수행하고, 웹 UI로 시각화하는 개인/소규모 팀 프로젝트 관리 도구.

- GitHub Project V2를 백엔드 데이터 저장소로 활용하여 별도 클라우드 인프라 없이 프로젝트 관리
- CLI 명령어(`gpm`)를 통해 Claude Code 세션 내에서 태스크 생성, 상태 변경, 조회 등을 즉시 수행
- localhost NestJS 서버에서 React 웹 UI를 함께 서빙하여 칸반 보드 기반 시각적 작업 관리 제공

## 3. 핵심 가치

| 핵심 가치 | 설명 |
|-----------|------|
| **GitHub Project = SSOT** | GitHub Project V2를 Single Source of Truth로 활용. 로컬 SQLite는 캐시 및 오프라인 작업용. 충돌 시 GitHub 데이터 우선. |
| **CLI-first 워크플로우** | Claude Code에서 bash 명령어로 태스크를 관리. AI 에이전트가 `gpm` CLI를 직접 호출하여 자동화된 프로젝트 관리 가능. |
| **오프라인 작업 후 동기화** | 네트워크 없이 로컬 SQLite에 작업 후, 연결 시 GitHub Project와 양방향 동기화. `is_dirty` 플래그로 변경 추적. |
| **제로 인프라** | npm 패키지 하나로 설치 완료. 별도 서버나 DB 설정 없이 `gpm server`로 즉시 실행. `gh auth` 토큰 재사용. |

## 4. 대상 사용자

- **1차 대상**: 개인 개발자
  - Claude Code를 활용하여 개발하는 개인 개발자
  - GitHub Project로 개인 태스크를 관리하고 싶은 개발자
  - CLI 기반 워크플로우를 선호하는 개발자

- **2차 확장**: 소규모 팀
  - GitHub Organization에서 공유 Project를 사용하는 소규모 팀
  - 각 팀원이 로컬에서 GPM을 실행하고 GitHub Project를 통해 동기화

## 5. 핵심 기능 요약

### CLI 태스크 관리

- `gpm task create` - 새 태스크 생성 (로컬 + GitHub)
- `gpm task list` - 태스크 목록 조회 (필터: 상태, 라벨, 마일스톤)
- `gpm task update` - 태스크 상태/내용 변경
- `gpm task move` - 칸반 상태 이동 (Todo → In Progress → Done)
- `gpm label` - 라벨 관리
- `gpm milestone` - 마일스톤 관리
- `gpm sync` - GitHub Project와 수동 동기화

### 웹 칸반 보드

- 드래그 앤 드롭 칸반 보드 (상태별 컬럼)
- 태스크 상세 보기/편집
- 라벨, 마일스톤 필터링
- 실시간 동기화 상태 표시

### GitHub 동기화

- 주기적 폴링 기반 양방향 동기화
- 로컬 변경사항 Push (is_dirty 기반)
- GitHub 변경사항 Pull
- 동기화 로그 관리

## 6. 기술 스택 요약

| 영역 | 기술 | 설명 |
|------|------|------|
| CLI | Node.js + Commander.js + TypeScript | `gpm` 명령어 인터페이스 |
| Backend | NestJS + TypeORM + SQLite (better-sqlite3) | API + React 정적 파일 단일 서버 (ServeStaticModule) |
| Frontend | React + Vite + TailwindCSS | 칸반 보드 웹 UI |
| GitHub API | Octokit (GraphQL API v4) | GitHub Project V2 연동 |
| 패키지 관리 | npm (모노레포) | CLI + Server + Web 번들링 배포 |
| 인증 | gh auth token 재사용 | 별도 인증 설정 불필요 |
| 데이터 저장 | SQLite (로컬 파일) | ~/.gpm/data.db |
