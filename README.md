# GPM - GitHub Project Manager

GitHub Project V2를 CLI와 웹 UI로 관리하는 도구. Claude Code에서 bash로 태스크를 관리하고, 브라우저에서 칸반 보드로 시각화합니다.

## 설치

```bash
npm install -g github-project-manager
```

## 사전 조건

- Node.js 22+
- [GitHub CLI](https://cli.github.com/) 설치 및 인증 (`gh auth login`)
- GitHub Project V2

## 빠른 시작

```bash
# 1. GitHub Project 연결 (git repo 안에서 실행)
npx github-project-manager init

# 2. GitHub에서 태스크 가져오기
npx github-project-manager sync

# 3. 태스크 목록 확인
npx github-project-manager task list

# 4. 웹 UI 실행
npx github-project-manager server
```

## CLI 명령어

### 초기 설정

```bash
npx github-project-manager init                       # GitHub Project URL 입력 → .gpmrc 생성
```

### 태스크 관리

```bash
npx github-project-manager task list                   # 태스크 목록
npx github-project-manager task list --json            # JSON 출력 (Claude Code 연동)
npx github-project-manager task show <id>              # 태스크 상세
npx github-project-manager task create <title>         # 태스크 생성 (GitHub에 직접 반영)
npx github-project-manager task update <id>            # 태스크 수정
npx github-project-manager task status <id> <status>   # 상태 변경
npx github-project-manager task delete <id>            # 태스크 삭제
```

### 동기화

```bash
npx github-project-manager sync                        # GitHub → 로컬 DB 동기화
```

### 웹 서버

```bash
npx github-project-manager server                      # API + 웹 UI 서버 시작 (포트 6170)
npx github-project-manager server --port 8080          # 포트 변경
npx github-project-manager server --no-open            # 브라우저 자동 열기 비활성화
```

> **Tip**: 글로벌 설치(`npm i -g github-project-manager`) 후에는 `gpm` 명령어로 짧게 사용 가능합니다.

## 아키텍처

```
npx github-project-manager init (any git repo)
  → .gpmrc 생성 + DB에 프로젝트 등록

npx github-project-manager task create "제목"
  → GitHub Project에 Draft Issue 직접 생성

npx github-project-manager sync
  → GitHub → 로컬 SQLite DB (Pull only)

npx github-project-manager server (port 6170)
  → NestJS API + React 웹 UI 단일 포트 서빙
```

- **GitHub = SSOT**: 쓰기는 GitHub에 직접 반영, 로컬 DB는 읽기 캐시
- **멀티 프로젝트**: 하나의 서버에서 여러 GitHub Project 관리
- **CLI 독립 실행**: NestJS Standalone Mode로 서버 없이도 CLI 사용 가능

## 기술 스택

| 영역 | 기술 |
|------|------|
| CLI | Commander.js, TypeScript |
| Backend | NestJS, TypeORM, SQLite |
| Frontend | React, Vite, TailwindCSS |
| GitHub API | Octokit GraphQL API v4 |

## 개발

```bash
# 의존성 설치
yarn install

# 개발 서버 (터미널 2개)
yarn dev:backend          # NestJS (포트 6170)
yarn dev:frontend         # Vite (포트 6171, proxy → 6170)

# 전체 빌드
yarn build

# CLI 실행
yarn gpm -- task list
```

## 배포

```bash
./deploy.sh patch   # 0.1.0 → 0.1.1
./deploy.sh minor   # 0.1.0 → 0.2.0
./deploy.sh major   # 0.1.0 → 1.0.0
```

`v*` 태그 push 시 GitHub Actions가 자동으로 npm에 배포합니다.

## 라이선스

MIT
