# CLI 명령어 스펙

GPM(GitHub Project Manager) CLI는 Claude Code 환경에서 bash를 통해 GitHub Project V2 태스크를 관리하기 위한 도구이다.

## 전역 옵션

| 옵션 | 축약 | 설명 |
|------|------|------|
| `--help` | `-h` | 도움말 출력 |
| `--version` | `-v` | 버전 출력 |
| `--json` | - | JSON 형식 출력 (Claude Code 파싱용) |
| `--project` | `-p <alias>` | 대상 프로젝트 alias 지정 (멀티 프로젝트 시 사용) |

### `--project` (`-p`) 옵션

`.gpmrc`에 여러 프로젝트가 등록된 멀티 프로젝트 환경에서 특정 프로젝트를 대상으로 명령을 실행한다.

- 지정하지 않으면 `.gpmrc`의 `defaultProject` 필드에 설정된 alias를 사용한다.
- 존재하지 않는 alias를 지정하면 에러와 함께 사용 가능한 alias 목록을 출력한다.

```bash
# 특정 프로젝트 대상으로 명령 실행
$ gpm -p my-project task list

# 기본 프로젝트 사용 (defaultProject)
$ gpm task list

# 유효하지 않은 alias
$ gpm -p nonexistent task list
✗ Project 'nonexistent' not found in .gpmrc. Available: default, my-project
```

## 명령어 체계

### 초기 설정

#### `gpm init`

현재 git repo에 대한 GitHub Project 연결을 설정한다. 멀티 프로젝트 형식의 `.gpmrc`를 생성한다.

**신규 초기화 (`.gpmrc` 미존재)**:

1. `gh auth token` 명령어로 GitHub CLI 인증 상태를 확인한다.
2. GitHub Project URL을 입력받아 owner, ownerType, projectNumber를 추출한다.
3. `git remote -v`에서 repo 정보(owner, repo name)를 자동 추출한다.
4. 프로젝트 alias를 입력받는다 (기본값: `default`).
5. 멀티 프로젝트 형식의 `.gpmrc` 파일을 생성한다.
6. 서버 DB에 프로젝트를 등록한다.
7. Claude Code 연동 설정을 진행한다 (Skill, Agent, Hooks).

```bash
$ gpm init
GitHub CLI 인증 확인 중...
✓ GitHub CLI 인증 확인 완료
? GitHub Project URL: https://github.com/users/my-user/projects/1
? 프로젝트 alias (기본값: default): my-project
✓ .gpmrc created
✓ Connected to project: my-user/projects/1
✓ Repository: my-user/my-repo
```

**프로젝트 추가 (`.gpmrc` 존재)**:

이미 `.gpmrc`가 존재하면 추가 프로젝트를 등록하는 워크플로우로 진행한다.

1. 새 GitHub Project URL을 입력받는다.
2. 중복 체크 (projectNumber, projectUrl)를 수행한다.
3. 프로젝트 alias를 입력받는다.
4. `.gpmrc`에 프로젝트를 추가하고 저장한다.

```bash
$ gpm init
✓ GitHub CLI 인증 확인 완료
? .gpmrc가 이미 존재합니다. 프로젝트를 추가하시겠습니까? (y/N): y
? GitHub Project URL: https://github.com/users/my-user/projects/2
? 프로젝트 alias (예: my-project): another-project
✓ 프로젝트 'another-project' 추가 완료 (Project #2)
```

생성되는 `.gpmrc` 파일 예시:

```json
{
  "owner": "my-user",
  "ownerType": "user",
  "repo": "my-repo",
  "defaultProject": "my-project",
  "projects": {
    "my-project": {
      "projectNumber": 1,
      "projectUrl": "https://github.com/users/my-user/projects/1"
    },
    "another-project": {
      "projectNumber": 2,
      "projectUrl": "https://github.com/users/my-user/projects/2"
    }
  }
}
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

`--project` (`-p`) 옵션이 지정되면 해당 프로젝트만 동기화한다. 지정하지 않으면 `.gpmrc`에 등록된 **모든 프로젝트를 순회하며** 동기화한다.

| 옵션 | 설명 |
|------|------|
| `--pull` | GitHub → 로컬 단방향 동기화 |
| `--push` | 로컬 → GitHub 단방향 동기화 |
| `--force` | 충돌 시 강제 동기화 (로컬 우선) |

```bash
# 전체 프로젝트 동기화 (등록된 모든 프로젝트 순회)
$ gpm sync
Syncing 2 project(s) with GitHub...

▶ Syncing project "my-project"...
  ✓ "my-project" synced: 3 created, 1 updated, 0 deleted

▶ Syncing project "another-project"...
  ✓ "another-project" synced: 5 created, 0 updated, 2 deleted

Sync complete: 2/2 projects synced successfully

# 특정 프로젝트만 동기화
$ gpm sync -p my-project
Syncing with GitHub Project...
✓ Sync completed: 3 created, 1 updated, 0 deleted
  Total items from GitHub: 15
```

#### `gpm sync pull`

`gpm sync`와 동일하게 동작한다 (Pull 방향). `--project` 옵션이 없으면 전체 프로젝트를 순회한다.

```bash
$ gpm sync pull
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

### 프로젝트 관리

#### `gpm project list`

`.gpmrc`에 등록된 프로젝트 목록을 출력한다.

- 각 프로젝트의 alias, projectNumber, projectUrl을 표시한다.
- 기본 프로젝트에는 `(default)` 레이블을 표시한다.

```bash
$ gpm project list
  my-project (default)	#1	https://github.com/users/my-user/projects/1
  another-project	#2	https://github.com/users/my-user/projects/2
```

#### `gpm project add`

대화형으로 새 프로젝트를 `.gpmrc`에 추가한다.

1. alias를 입력받는다 (소문자 영숫자 + 하이픈만 허용).
2. GitHub Project URL을 입력받는다.
3. URL에서 projectNumber를 추출한다.
4. 중복 검증 후 `.gpmrc`에 저장한다.

```bash
$ gpm project add
? Project alias (alphanumeric + hyphens): new-project
? GitHub Project URL: https://github.com/users/my-user/projects/3
✓ 프로젝트 'new-project' (#3)가 추가되었습니다.
```

#### `gpm project remove <alias>`

지정한 alias의 프로젝트를 `.gpmrc`에서 제거한다.

- 마지막 프로젝트는 제거할 수 없다.
- 기본 프로젝트(defaultProject)는 먼저 `gpm project default`로 다른 프로젝트를 지정한 후 제거해야 한다.

```bash
$ gpm project remove another-project
✓ 프로젝트 'another-project'가 제거되었습니다.
```

#### `gpm project default <alias>`

기본 프로젝트를 변경한다. `--project` 옵션 없이 명령을 실행할 때 사용되는 프로젝트를 지정한다.

```bash
$ gpm project default another-project
✓ 기본 프로젝트가 'another-project'로 변경되었습니다.
```

### 서버

#### `gpm server`

NestJS 로컬 서버(API + React 정적 파일)를 포그라운드에서 시작한다.

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `--port <port>` | 서버 포트 | 3000 |
| `--no-open` | 브라우저 자동 열기 비활성화 | false |

```bash
$ gpm server --port 8080 --no-open
✓ Server started at http://localhost:8080
```

#### `gpm server --daemon`

서버를 백그라운드 데몬으로 실행한다.

- 프로세스를 백그라운드로 분리하여 터미널을 반환한다.
- PID 파일을 생성하여 프로세스를 추적한다.
- 로그는 `~/.gpm/server.log`에 기록한다.

```bash
$ gpm server --daemon --port 3000
✓ Server started as daemon (PID: 12345)
✓ Listening at http://localhost:3000
✓ Log: ~/.gpm/server.log
```

#### `gpm server stop`

실행 중인 서버(포그라운드 또는 데몬)를 중지한다.

```bash
$ gpm server stop
✓ Server stopped (PID: 12345)
```

#### `gpm server status`

서버의 실행 상태를 확인한다.

- 서버 실행 여부, PID, 포트, 가동 시간을 출력한다.
- 등록된 프로젝트 수를 표시한다.

```bash
$ gpm server status
✓ Server is running (PID: 12345)
  Port: 3000
  Uptime: 2h 15m
  Projects: 3
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

## CLI 실행 모드

GPM CLI는 두 가지 모드로 동작한다.

### Standalone 모드 (기본)

- NestJS의 `createApplicationContext`로 DI 컨테이너만 부팅하여 Service를 직접 호출
- HTTP 서버 시작 없이 SQLite와 GitHub API에 직접 접근
- 부팅 시간 ~100ms로 빠른 응답
- `gpm task list`, `gpm sync` 등 대부분의 CLI 명령어가 이 모드로 동작

### Server 모드

- `gpm server` 명령어 실행 시에만 HTTP 리스너를 시작
- React 웹 UI 정적 파일 서빙 (ServeStaticModule)
- 브라우저에서 칸반 보드 등 웹 UI 사용 가능

## .gpmrc 기반 요청

CLI는 현재 디렉토리의 `.gpmrc` 파일을 읽어 모든 API 요청에 프로젝트 식별 헤더를 포함한다. 단일 GPM 서버가 여러 git repo의 GitHub Project를 관리하므로, 각 요청에서 어떤 프로젝트를 대상으로 하는지 특정해야 한다.

### .gpmrc 형식

`.gpmrc`는 멀티 프로젝트 형식을 사용한다. 하나의 `.gpmrc`에 여러 GitHub Project를 등록하고 alias로 구분한다.

```json
{
  "owner": "my-user",
  "ownerType": "user",
  "repo": "my-repo",
  "defaultProject": "my-project",
  "projects": {
    "my-project": {
      "projectNumber": 1,
      "projectUrl": "https://github.com/users/my-user/projects/1"
    },
    "another-project": {
      "projectNumber": 2,
      "projectUrl": "https://github.com/users/my-user/projects/2"
    }
  }
}
```

#### 레거시 형식 하위 호환

이전 버전의 단일 프로젝트 `.gpmrc` 형식도 여전히 지원한다. CLI가 로드 시 자동으로 멀티 프로젝트 형식으로 정규화한다.

```json
// 레거시 형식 (하위 호환 지원)
{
  "owner": "my-org",
  "ownerType": "organization",
  "repo": "my-repo",
  "projectNumber": 1,
  "projectUrl": "https://github.com/orgs/my-org/projects/1"
}
```

정규화 결과: `projects: { "default": { projectNumber, projectUrl } }`, `defaultProject: "default"`로 변환된다.

### 프로젝트 선택 (resolve) 로직

1. `--project` (`-p`) 옵션이 지정되면 해당 alias를 사용한다.
2. 미지정 시 `.gpmrc`의 `defaultProject` 필드의 alias를 사용한다.
3. 선택된 alias에 해당하는 `projects[alias]`의 `projectNumber`를 헤더에 포함하여 요청한다.

### 헤더 전달

| 헤더 | 값 (`.gpmrc` 필드) | 설명 |
|------|---------------------|------|
| `X-GPM-Owner` | `owner` | GitHub Owner (org 또는 user) |
| `X-GPM-Owner-Type` | `ownerType` | 소유자 유형 (organization / user) |
| `X-GPM-Repo` | `repo` | GitHub 저장소 이름 |
| `X-GPM-Project-Number` | `projects[alias].projectNumber` | GitHub Project V2 번호 |
| `X-GPM-Project-Alias` | 선택된 alias | 프로젝트 alias |

### 동작 방식

1. CLI 명령어 실행 시 현재 디렉토리에서 `.gpmrc` 파일을 탐색한다.
2. `.gpmrc`를 로드하고 정규화한다 (레거시 형식이면 멀티 형식으로 변환).
3. `--project` 옵션 또는 `defaultProject`로 대상 프로젝트를 resolve한다.
4. resolve된 프로젝트 정보를 HTTP 헤더로 변환하여 서버에 전달한다.
5. 서버는 수신한 헤더를 기반으로 해당 프로젝트의 데이터를 조회/변경한다.

### .gpmrc가 없는 경우

`.gpmrc` 파일이 현재 디렉토리에 존재하지 않으면 CLI는 에러를 출력하고 명령어를 실행하지 않는다.

```bash
$ gpm task list
✗ .gpmrc 파일을 찾을 수 없습니다.
  먼저 gpm init을 실행하세요.
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
