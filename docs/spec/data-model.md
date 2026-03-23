# GPM 데이터 모델

## 1. GitHub Project V2 필드 매핑

GitHub Project V2의 Item 필드를 로컬 SQLite 테이블 컬럼으로 매핑합니다.

| GitHub Project V2 필드 | SQLite 컬럼 | 타입 | 설명 |
|------------------------|-------------|------|------|
| Item ID | `github_item_id` | string | Project Item의 고유 ID (node ID) |
| Content ID | `github_content_id` | string | 연결된 Issue/PR의 node ID |
| Content Type | `content_type` | string | ISSUE, DRAFT_ISSUE, PULL_REQUEST |
| Title | `title` | string | 태스크 제목 |
| Body | `body` | text | 태스크 본문 (마크다운) |
| Status | `status` | string | 칸반 상태 (Todo, In Progress, Done 등) |
| Assignees | `assignees` | json | 담당자 배열 `["username1", "username2"]` |
| Labels | labels 테이블 | FK (다대다) | task_labels 조인 테이블로 관리 |
| Milestone | `milestone_id` | FK | milestones 테이블 참조 |
| Priority | `priority` | string (nullable) | 우선순위 커스텀 필드 |
| Created At | `github_created_at` | datetime | GitHub에서의 생성 시각 |
| Updated At | `github_updated_at` | datetime | GitHub에서의 마지막 수정 시각 |

## 2. SQLite 스키마

### projects

프로젝트 설정 및 GitHub Project 연결 정보를 저장합니다.

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 로컬 고유 ID |
| `github_project_id` | TEXT | NOT NULL, UNIQUE | GitHub Project node ID |
| `github_owner` | TEXT | NOT NULL | GitHub 소유자 (user 또는 org) |
| `github_repo` | TEXT | NOT NULL | GitHub 저장소 이름 |
| `project_number` | INTEGER | NOT NULL | GitHub Project 번호 |
| `title` | TEXT | NOT NULL | 프로젝트 제목 |
| `created_at` | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 로컬 생성 시각 |
| `updated_at` | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 로컬 수정 시각 |

```sql
CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    github_project_id TEXT NOT NULL UNIQUE,
    github_owner TEXT NOT NULL,
    github_repo TEXT NOT NULL,
    project_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### tasks

GitHub Project Item과 매핑되는 태스크 데이터를 저장합니다.

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 로컬 고유 ID |
| `project_id` | INTEGER | NOT NULL, FK → projects(id) | 소속 프로젝트 |
| `github_item_id` | TEXT | UNIQUE | GitHub Project Item node ID |
| `github_content_id` | TEXT | | 연결된 Issue/PR node ID |
| `content_type` | TEXT | NOT NULL, DEFAULT 'DRAFT_ISSUE' | ISSUE, DRAFT_ISSUE, PULL_REQUEST |
| `title` | TEXT | NOT NULL | 태스크 제목 |
| `body` | TEXT | | 태스크 본문 (마크다운) |
| `status` | TEXT | NOT NULL, DEFAULT 'Todo' | 칸반 상태 |
| `assignees` | TEXT | DEFAULT '[]' | JSON 배열 (담당자 username 목록) |
| `priority` | TEXT | | 우선순위 (nullable) |
| `created_at` | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 로컬 생성 시각 |
| `updated_at` | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 로컬 수정 시각 |
| `github_created_at` | DATETIME | | GitHub 생성 시각 |
| `github_updated_at` | DATETIME | | GitHub 수정 시각 |
| `synced_at` | DATETIME | | 마지막 동기화 시각 |
| `is_dirty` | BOOLEAN | NOT NULL, DEFAULT 0 | 로컬 수정 후 미동기화 여부 |

```sql
CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    github_item_id TEXT UNIQUE,
    github_content_id TEXT,
    content_type TEXT NOT NULL DEFAULT 'DRAFT_ISSUE',
    title TEXT NOT NULL,
    body TEXT,
    status TEXT NOT NULL DEFAULT 'Todo',
    assignees TEXT DEFAULT '[]',
    priority TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    github_created_at DATETIME,
    github_updated_at DATETIME,
    synced_at DATETIME,
    is_dirty BOOLEAN NOT NULL DEFAULT 0,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

### labels

프로젝트에 속하는 라벨 데이터를 저장합니다.

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 로컬 고유 ID |
| `github_label_id` | TEXT | UNIQUE | GitHub Label node ID |
| `project_id` | INTEGER | NOT NULL, FK → projects(id) | 소속 프로젝트 |
| `name` | TEXT | NOT NULL | 라벨 이름 |
| `color` | TEXT | | 라벨 색상 (hex, 예: "ff0000") |
| `description` | TEXT | | 라벨 설명 |

```sql
CREATE TABLE labels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    github_label_id TEXT UNIQUE,
    project_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    color TEXT,
    description TEXT,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

### task_labels

태스크와 라벨의 다대다(N:M) 관계를 관리하는 조인 테이블입니다.

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| `task_id` | INTEGER | NOT NULL, FK → tasks(id) | 태스크 ID |
| `label_id` | INTEGER | NOT NULL, FK → labels(id) | 라벨 ID |

```sql
CREATE TABLE task_labels (
    task_id INTEGER NOT NULL,
    label_id INTEGER NOT NULL,
    PRIMARY KEY (task_id, label_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE
);
```

### milestones

프로젝트의 마일스톤 데이터를 저장합니다.

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 로컬 고유 ID |
| `github_milestone_id` | TEXT | UNIQUE | GitHub Milestone node ID |
| `project_id` | INTEGER | NOT NULL, FK → projects(id) | 소속 프로젝트 |
| `title` | TEXT | NOT NULL | 마일스톤 제목 |
| `description` | TEXT | | 마일스톤 설명 |
| `due_date` | DATE | | 마감일 |
| `state` | TEXT | NOT NULL, DEFAULT 'OPEN' | OPEN 또는 CLOSED |

```sql
CREATE TABLE milestones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    github_milestone_id TEXT UNIQUE,
    project_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date DATE,
    state TEXT NOT NULL DEFAULT 'OPEN',
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

### sync_log

동기화 작업의 이력을 기록합니다.

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 로컬 고유 ID |
| `project_id` | INTEGER | NOT NULL, FK → projects(id) | 대상 프로젝트 |
| `synced_at` | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 동기화 실행 시각 |
| `direction` | TEXT | NOT NULL | PULL, PUSH, BOTH |
| `items_synced` | INTEGER | NOT NULL, DEFAULT 0 | 동기화된 항목 수 |
| `status` | TEXT | NOT NULL | SUCCESS 또는 FAILED |
| `error_message` | TEXT | | 실패 시 에러 메시지 (nullable) |

```sql
CREATE TABLE sync_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    synced_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    direction TEXT NOT NULL,
    items_synced INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    error_message TEXT,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

## 3. 충돌 해결 전략

### 기본 원칙: GitHub = SSOT

GitHub Project V2가 Single Source of Truth입니다. 충돌 발생 시 GitHub 데이터가 우선합니다.

### 동기화 흐름

```
[로컬 수정 발생]
       │
       ▼
  is_dirty = 1 설정
       │
       ▼
[동기화 실행 (PUSH)]
       │
       ├── GitHub에 해당 Item이 존재하고 변경이 없음
       │   → 로컬 변경사항을 GitHub에 Push
       │   → is_dirty = 0, synced_at 갱신
       │
       └── GitHub에 해당 Item이 이미 변경됨 (충돌)
           → GitHub 데이터로 로컬 덮어쓰기
           → 로컬 변경사항은 sync_log에 기록
           → is_dirty = 0, synced_at 갱신
           → 사용자에게 충돌 알림
```

### is_dirty 플래그 동작

| 동작 | is_dirty 값 |
|------|-------------|
| CLI/웹에서 로컬 수정 | `1` (true) |
| GitHub Push 성공 | `0` (false) |
| GitHub Pull로 덮어쓰기 | `0` (false) |
| 동기화 실패 | `1` (유지) |

### 충돌 판정 기준

- 로컬 `synced_at` < GitHub `updated_at`이고, 로컬 `is_dirty = 1`이면 충돌
- 충돌 시 GitHub 데이터를 채택하고, 로컬 변경사항은 로그에 보존

## 4. 인덱스

데이터 조회 성능을 위한 인덱스 정의입니다.

### tasks 테이블

```sql
-- github_item_id로 빠른 조회 (동기화 시 매칭)
CREATE UNIQUE INDEX idx_tasks_github_item_id ON tasks(github_item_id);

-- 프로젝트별 상태 필터링 (칸반 보드 조회)
CREATE INDEX idx_tasks_project_status ON tasks(project_id, status);

-- 더티 태스크 조회 (동기화 대상)
CREATE INDEX idx_tasks_is_dirty ON tasks(is_dirty) WHERE is_dirty = 1;
```

### labels 테이블

```sql
-- github_label_id로 빠른 조회 (동기화 시 매칭)
CREATE UNIQUE INDEX idx_labels_github_label_id ON labels(github_label_id);

-- 프로젝트별 라벨 조회
CREATE INDEX idx_labels_project_id ON labels(project_id);
```

### milestones 테이블

```sql
-- github_milestone_id로 빠른 조회 (동기화 시 매칭)
CREATE UNIQUE INDEX idx_milestones_github_milestone_id ON milestones(github_milestone_id);

-- 프로젝트별 마일스톤 조회
CREATE INDEX idx_milestones_project_id ON milestones(project_id);
```

### sync_log 테이블

```sql
-- 프로젝트별 최근 동기화 이력 조회
CREATE INDEX idx_sync_log_project_synced ON sync_log(project_id, synced_at DESC);
```

### ER 다이어그램

```
┌──────────────┐
│   projects   │
│──────────────│
│ id (PK)      │──────────────────┐
│ github_...   │                  │
│ title        │                  │
└──────────────┘                  │
       │                          │
       │ 1:N                      │ 1:N
       ▼                          ▼
┌──────────────┐           ┌──────────────┐
│    tasks     │           │   labels     │
│──────────────│           │──────────────│
│ id (PK)      │◀──┐      │ id (PK)      │◀──┐
│ project_id   │   │      │ project_id   │   │
│ title        │   │      │ name         │   │
│ status       │   │      │ color        │   │
│ is_dirty     │   │      └──────────────┘   │
└──────────────┘   │                          │
       │           │     ┌──────────────┐     │
       │ 1:N       └─────│ task_labels  │─────┘
       │                 │──────────────│
       │                 │ task_id (FK) │
       │                 │ label_id (FK)│
       │                 └──────────────┘
       │
       │ N:1
       ▼
┌──────────────┐           ┌──────────────┐
│  milestones  │           │  sync_log    │
│──────────────│           │──────────────│
│ id (PK)      │           │ id (PK)      │
│ project_id   │           │ project_id   │
│ title        │           │ direction    │
│ state        │           │ status       │
└──────────────┘           └──────────────┘
```
