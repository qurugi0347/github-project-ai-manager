# GPM - GitHub Project Manager

GitHub Project V2를 CLI와 웹 UI로 관리하는 도구.
Claude Code에서 AI PM처럼 태스크를 추천받고, 브라우저에서 칸반 보드로 시각화합니다.

## 설치 & 세팅 (Claude Code에서 그대로 실행)

```bash
# 1. GitHub CLI 인증 (아직 안 했다면)
gh auth login

# 2. git repo 안에서 초기화
npx github-project-manager init
# → GitHub Project URL 입력
# → .gpmrc 생성
# → .claude/skills/gpm/SKILL.md 생성 (Claude Code Skill)
# → .claude/agents/gpm-pm.md 생성 (AI PM Agent)

# 3. 동기화
npx github-project-manager sync
```

init 완료 후 Claude Code에서 `/gpm status`, `/gpm next` 등을 바로 사용할 수 있습니다.

## Claude Code 연동

`gpm init`을 실행하면 아래 파일이 자동 생성됩니다:

```
.gpmrc                          # GitHub Project 연결 설정
.claude/skills/gpm/SKILL.md     # /gpm 슬래시 커맨드 (Skill)
.claude/agents/gpm-pm.md        # AI PM Agent
```

### Skill 커맨드 (`/gpm`)

Claude Code에서 슬래시 커맨드로 사용:

| 커맨드 | 설명 |
|--------|------|
| `/gpm next` | 마일스톤 기한 + 최근 작업 맥락 기반으로 다음 태스크 추천 → 선택 → 작업 시작 |
| `/gpm done` | 현재 작업 완료 처리 (git log 분석으로 태스크 추론 + 사용자 확인) |
| `/gpm status` | 프로젝트 현황 브리핑 (상태별 집계, 진행 중 태스크, 마일스톤 진행률) |
| `/gpm plan` | 남은 태스크 분석 → 마일스톤 기한 기준 작업 순서 제안 |
| `/gpm sync` | GitHub Project와 동기화 |
| `/gpm create <title>` | 태스크 생성 + 목적/완료기준/구현방향 작업 계획 자동 작성 |

### AI PM Agent (`gpm-pm`)

Claude Code가 자동으로 PM처럼 행동합니다:

- **"다음 뭐 해?"** → 마일스톤 기한, 최근 작업, 의존성을 분석하여 추천
- **"이거 끝났어"** → git log에서 작업 추론 + 상태 변경 + 다음 추천
- **"현황 알려줘"** → 마일스톤 진행률 바 + 리스크 감지 + In Progress 목록
- **커밋/PR 시** → "이 작업이 #N 태스크와 관련있네요. 완료 처리할까요?"

### 기존 프로젝트에 GPM 적용하기

이미 CLAUDE.md가 있는 프로젝트에서 GPM을 사용하려면, CLAUDE.md에 아래 내용을 추가하세요:

```markdown
## GPM 태스크 관리

이 프로젝트는 [GPM](https://www.npmjs.com/package/github-project-manager)으로 GitHub Project V2 태스크를 관리합니다.

### 설정 파일
- `.gpmrc` — GitHub Project 연결 정보
- `.claude/skills/gpm/SKILL.md` — /gpm 슬래시 커맨드
- `.claude/agents/gpm-pm.md` — AI PM Agent

### 사용 방법
- `/gpm next` — 다음 작업 추천 (마일스톤 기한 + 최근 작업 맥락 기반)
- `/gpm done` — 현재 작업 완료 처리
- `/gpm status` — 프로젝트 현황 브리핑
- `/gpm plan` — 작업 계획 수립

### 태스크 관리 규칙
- 새 기능 작업 시작 전 `/gpm next`로 GitHub Project 태스크를 확인한다
- 작업 완료 후 `/gpm done`으로 태스크 상태를 업데이트한다
- 새 태스크가 필요하면 `/gpm create`로 GitHub Project에 직접 생성한다
```

이 내용을 CLAUDE.md에 추가하면 Claude Code가 GPM Skill/Agent를 적극적으로 활용합니다.

## 사전 조건

- Node.js 22+
- [GitHub CLI](https://cli.github.com/) (`gh auth login`)
- [Claude Code](https://claude.com/claude-code) (Skill/Agent 사용 시)
- GitHub Project V2

## CLI 명령어

### 태스크 관리

```bash
npx github-project-manager task list                   # 태스크 목록
npx github-project-manager task list --json            # JSON 출력
npx github-project-manager task show <id>              # 태스크 상세
npx github-project-manager task create <title>         # 태스크 생성 (GitHub에 직접 반영)
npx github-project-manager task status <id> <status>   # 상태 변경
npx github-project-manager task delete <id>            # 태스크 삭제
```

### 동기화 & 서버

```bash
npx github-project-manager sync                        # GitHub → 로컬 DB 동기화
npx github-project-manager server                      # 웹 UI 서버 시작 (포트 6170)
npx github-project-manager server --port 8080          # 포트 변경
npx github-project-manager server --no-open            # 브라우저 자동 열기 비활성화
```

> **Tip**: 글로벌 설치(`npm i -g github-project-manager`) 후에는 `gpm` 명령어로 짧게 사용 가능합니다.

## 아키텍처

- **GitHub = SSOT**: 쓰기는 GitHub API에 직접 반영, 로컬 DB는 읽기 캐시 (Pull-only sync)
- **멀티 프로젝트**: 하나의 서버에서 여러 GitHub Project 관리 (`.gpmrc`로 식별)
- **CLI 독립 실행**: NestJS Standalone Mode로 서버 없이도 CLI 사용 가능

```
gpm init  → .gpmrc + .claude/skills + .claude/agents 생성
gpm task create → GitHub Project에 Draft Issue 직접 생성
gpm sync  → GitHub → 로컬 SQLite DB
gpm server → NestJS API + React 웹 UI (단일 포트)
```

## 기술 스택

| 영역 | 기술 |
|------|------|
| CLI | Commander.js, TypeScript |
| Backend | NestJS, TypeORM, SQLite |
| Frontend | React, Vite, TailwindCSS |
| GitHub API | Octokit GraphQL API v4 |
| AI 연동 | Claude Code Skill + Agent |

## 개발

```bash
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
./deploy.sh patch   # 0.1.x → patch 버전 업
./deploy.sh minor   # 0.x.0 → minor 버전 업
```

`v*` 태그 push 시 GitHub Actions가 자동으로 npm에 배포합니다.

## 라이선스

MIT
