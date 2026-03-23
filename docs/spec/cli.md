# CLI 명령어 스펙

GPM(GitHub Project Manager) CLI는 Claude Code 환경에서 bash를 통해 GitHub Project V2 태스크를 관리하기 위한 도구이다.

## 전역 옵션

| 옵션 | 축약 | 설명 |
|------|------|------|
| `--help` | `-h` | 도움말 출력 |
| `--version` | `-v` | 버전 출력 |
| `--json` | - | JSON 형식 출력 (Claude Code 파싱용) |
| `--project` | `-p <id>` | 대상 프로젝트 지정 (멀티 프로젝트 시 사용) |

## 명령어 체계

### 초기 설정

#### `gpm init`

GitHub Project 연결을 위한 대화형 초기 설정.

- owner, repo, project number를 대화형으로 입력받는다.
- `~/.gpm/config.json` 파일을 생성한다.
- 이미 설정이 존재하면 덮어쓸지 확인한다.

```bash
$ gpm init
? GitHub Owner (org or user): my-org
? Repository name: my-repo
? Project number: 1
✓ Configuration saved to ~/.gpm/config.json
✓ Connected to project: my-org/my-repo#1
```

#### `gpm auth`

GitHub 인증 확인 및 토큰 저장.

- `gh auth token` 명령어를 통해 기존 GitHub CLI 인증을 확인한다.
- 인증이 없으면 `gh auth login` 안내 메시지를 출력한다.
- 토큰을 `~/.gpm/config.json`에 저장한다.

```bash
$ gpm auth
✓ Authenticated as @username
✓ Token saved to ~/.gpm/config.json
```

#### `gpm config`

설정 조회 및 변경.

```bash
# 전체 설정 조회
$ gpm config

# 특정 키 조회
$ gpm config get sync.interval

# 특정 키 변경
$ gpm config set sync.interval 300
```

### 태스크 관리

#### `gpm task list`

태스크 목록 조회.

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `--status <status>` | 상태 필터 (Todo, In Progress, Done 등) | 전체 |
| `--label <label>` | 라벨 필터 | 전체 |
| `--milestone <milestone>` | 마일스톤 필터 | 전체 |
| `--assignee <assignee>` | 담당자 필터 | 전체 |
| `--limit <n>` | 출력 개수 제한 | 20 |

```bash
$ gpm task list --status "In Progress" --limit 10
```

#### `gpm task show <id>`

태스크 상세 조회.

- 제목, 본문, 상태, 라벨, 마일스톤, 담당자, GitHub 링크 등을 출력한다.

```bash
$ gpm task show 42
```

#### `gpm task create <title>`

새 태스크 생성.

| 옵션 | 설명 |
|------|------|
| `--body <body>` | 태스크 본문 (마크다운) |
| `--status <status>` | 초기 상태 |
| `--label <label>` | 라벨 (복수 지정 가능) |
| `--milestone <milestone>` | 마일스톤 |
| `--assignee <assignee>` | 담당자 |

```bash
$ gpm task create "로그인 기능 구현" --status "Todo" --label "feature" --label "auth"
```

#### `gpm task update <id>`

기존 태스크 수정.

| 옵션 | 설명 |
|------|------|
| `--title <title>` | 제목 변경 |
| `--body <body>` | 본문 변경 |
| `--status <status>` | 상태 변경 |
| `--add-label <label>` | 라벨 추가 |
| `--remove-label <label>` | 라벨 제거 |

```bash
$ gpm task update 42 --status "In Progress" --add-label "urgent"
```

#### `gpm task delete <id>`

태스크 삭제.

- 삭제 전 확인 프롬프트를 출력한다.
- `--yes` 옵션으로 확인 생략 가능.

```bash
$ gpm task delete 42
? Are you sure you want to delete task #42? (y/N)
```

#### `gpm task status <id> <status>`

태스크 상태를 빠르게 변경한다.

```bash
$ gpm task status 42 "Done"
✓ Task #42 status changed to "Done"
```

### 라벨 관리

#### `gpm label list`

프로젝트에 등록된 라벨 목록 조회.

```bash
$ gpm label list
```

#### `gpm label create <name>`

새 라벨 생성.

| 옵션 | 설명 |
|------|------|
| `--color <hex>` | 라벨 색상 (예: `#ff0000`) |
| `--description <desc>` | 라벨 설명 |

```bash
$ gpm label create "bug" --color "#d73a4a" --description "버그 수정"
```

### 마일스톤 관리

#### `gpm milestone list`

마일스톤 목록 조회.

```bash
$ gpm milestone list
```

#### `gpm milestone create <title>`

새 마일스톤 생성.

| 옵션 | 설명 |
|------|------|
| `--due-date <date>` | 마감일 (YYYY-MM-DD) |
| `--description <desc>` | 마일스톤 설명 |

```bash
$ gpm milestone create "v1.0 MVP" --due-date "2026-04-30" --description "MVP 릴리스"
```

### 동기화

#### `gpm sync`

GitHub Project와 로컬 DB 간 동기화 수행.

| 옵션 | 설명 |
|------|------|
| `--pull` | GitHub → 로컬 단방향 동기화 |
| `--push` | 로컬 → GitHub 단방향 동기화 |
| `--force` | 충돌 시 강제 동기화 (로컬 우선) |

```bash
# 양방향 동기화 (기본)
$ gpm sync

# Pull만 수행
$ gpm sync --pull

# 강제 Push
$ gpm sync --push --force
```

#### `gpm sync status`

동기화 상태 확인.

- 마지막 동기화 시각, 변경된 항목 수, 충돌 항목 등을 출력한다.

```bash
$ gpm sync status
Last synced: 2026-03-23 14:30:00
Pending changes: 3 local, 1 remote
Conflicts: 0
```

### 서버

#### `gpm server`

NestJS 로컬 서버(API + React 정적 파일)를 시작한다.

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `--port <port>` | 서버 포트 | 3000 |
| `--no-open` | 브라우저 자동 열기 비활성화 | false |

```bash
$ gpm server --port 8080 --no-open
✓ Server started at http://localhost:8080
```

#### `gpm server stop`

실행 중인 서버를 중지한다.

```bash
$ gpm server stop
✓ Server stopped
```

## CLI 출력 형식

- **기본 형식**: 사람이 읽기 쉬운 테이블/텍스트 형식으로 출력한다.
- **JSON 형식**: `--json` 옵션 사용 시 구조화된 JSON으로 출력한다. Claude Code가 파싱하여 후속 작업에 활용할 수 있다.

```bash
# 테이블 형식 (기본)
$ gpm task list --status "Todo"
ID  Title              Status  Labels       Assignee
42  로그인 기능 구현      Todo    feature,auth  @user1
43  회원가입 페이지       Todo    feature       @user2

# JSON 형식
$ gpm task list --status "Todo" --json
{
  "tasks": [
    {
      "id": 42,
      "title": "로그인 기능 구현",
      "status": "Todo",
      "labels": ["feature", "auth"],
      "assignee": "@user1"
    }
  ],
  "total": 2
}
```

## Claude Code에서의 사용 예시

### 예시 1: 태스크 생성 후 상태 관리

```bash
# 새 태스크 생성
gpm task create "API 엔드포인트 구현" --body "사용자 인증 REST API" --status "Todo" --label "backend" --json

# 작업 시작 시 상태 변경
gpm task status 42 "In Progress"

# 작업 완료 후 상태 변경 및 동기화
gpm task status 42 "Done"
gpm sync --push
```

### 예시 2: 현재 작업 상황 파악

```bash
# 진행 중인 태스크 확인
gpm task list --status "In Progress" --json

# 특정 태스크 상세 확인
gpm task show 42 --json

# 동기화 상태 확인
gpm sync status --json
```

### 예시 3: 마일스톤 기반 태스크 관리

```bash
# 마일스톤 생성
gpm milestone create "Sprint 1" --due-date "2026-04-15" --description "1차 스프린트"

# 마일스톤에 속한 태스크 조회
gpm task list --milestone "Sprint 1" --json

# 태스크 생성 시 마일스톤 지정
gpm task create "DB 스키마 설계" --milestone "Sprint 1" --label "database" --json
```

### 예시 4: 라벨 기반 필터링

```bash
# 버그 태스크만 조회
gpm task list --label "bug" --status "Todo" --json

# 라벨 추가
gpm task update 42 --add-label "critical"

# 전체 라벨 확인
gpm label list --json
```
