# 동기화 스펙

GPM의 동기화 시스템은 GitHub Project V2와 로컬 SQLite 데이터베이스 간의 양방향 데이터 동기화를 담당한다. GitHub Project V2가 SSOT(Single Source of Truth)이며, SQLite는 오프라인 작업과 빠른 조회를 위한 로컬 캐시 역할을 한다.

## 동기화 개요

```
GitHub Project V2 (SSOT)
        ↑↓
   GraphQL API
        ↑↓
   동기화 엔진 (project 단위)
        ↑↓
  SQLite (로컬 캐시)
        ↑↓
   CLI / Web UI
```

- **Pull**: GitHub → 로컬. GitHub의 최신 상태를 로컬 DB에 반영한다.
- **Push**: 로컬 → GitHub. 로컬에서 변경된 항목을 GitHub에 반영한다.
- **양방향**: Pull 후 Push를 순차 수행하며, 충돌을 감지하고 해결한다.

### 프로젝트 스코핑

동기화는 **project 단위**로 수행된다. 단일 GPM 서버가 여러 git repo의 GitHub Project를 관리하므로, 모든 동기화 작업은 특정 프로젝트에 스코핑된다.

- **CLI에서 `gpm sync` 실행 시**: 현재 디렉토리의 `.gpmrc` 파일에서 `owner`와 `projectNumber`를 읽어 대상 프로젝트를 특정한다. `.gpmrc`가 없으면 에러를 출력한다.
- **서버 자동 폴링**: 서버에 등록된 각 프로젝트별로 독립적인 폴링 스케줄이 실행된다. 한 프로젝트의 동기화 실패가 다른 프로젝트에 영향을 주지 않는다.
- **`sync_log` 스코핑**: `sync_log` 테이블의 각 레코드는 `project_id`로 스코핑되어, 프로젝트별로 동기화 이력을 독립적으로 추적한다.

## Pull 동기화 (GitHub → Local)

### 처리 흐름

1. **GraphQL API 조회**: GitHub Project V2의 전체 항목을 조회한다.
2. **매칭**: 로컬 DB의 `github_item_id` 필드로 기존 항목과 매칭한다.
3. **변경 감지**: `github_updated_at` 타임스탬프를 비교하여 변경 여부를 판단한다.
4. **적용**:
   - 매칭되는 로컬 항목이 없으면 `INSERT` (신규 항목)
   - 매칭되고 GitHub 쪽이 더 최신이면 `UPDATE`
   - 로컬에 있지만 GitHub에 없으면 삭제 표시
5. **동기화 로그**: `sync_log` 테이블에 Pull 결과를 기록한다.

### Pull 시 로컬 데이터 갱신 규칙

| 필드 | 갱신 조건 |
|------|-----------|
| title | GitHub 값으로 덮어쓰기 |
| body | GitHub 값으로 덮어쓰기 |
| status | GitHub 값으로 덮어쓰기 |
| labels | GitHub 값으로 교체 |
| milestone | GitHub 값으로 덮어쓰기 |
| assignees | GitHub 값으로 교체 |
| github_updated_at | GitHub 값으로 갱신 |
| local_updated_at | 현재 시각으로 갱신 |
| is_dirty | `false`로 설정 |

## Push 동기화 (Local → GitHub)

### 처리 흐름

1. **변경 항목 조회**: 로컬 DB에서 `is_dirty = true`인 항목을 조회한다.
2. **GraphQL Mutation 실행**: 각 항목에 대해 적절한 Mutation을 실행한다.
   - 신규 항목: `addProjectV2DraftIssue` 또는 `addProjectV2ItemById`
   - 수정 항목: `updateProjectV2ItemFieldValue`
   - 삭제 항목: `deleteProjectV2Item`
3. **플래그 초기화**: Mutation 성공 시 `is_dirty = false`로 설정한다.
4. **동기화 로그**: `sync_log` 테이블에 Push 결과를 기록한다.

### Push 시 업데이트 대상 필드

| 로컬 변경 필드 | GitHub Mutation |
|----------------|-----------------|
| title | Draft Issue 제목 변경 |
| body | Draft Issue 본문 변경 |
| status | `updateProjectV2ItemFieldValue` (Status 필드) |
| labels | Issue 라벨 추가/제거 |
| milestone | Issue 마일스톤 변경 |
| assignees | Issue 담당자 변경 |

## 양방향 동기화

### 처리 흐름

1. **Pull 먼저 수행**: GitHub의 최신 상태를 로컬에 반영한다.
2. **충돌 감지**: Pull 대상 항목 중 `is_dirty = true`인 항목을 충돌로 판별한다.
3. **충돌 해결**: 충돌 해결 정책에 따라 처리한다.
4. **Push 수행**: 로컬 변경 사항을 GitHub에 반영한다.

### 충돌 감지 조건

양쪽 모두 변경된 항목은 아래 조건으로 판별한다:

- 로컬: `is_dirty = true` (로컬에서 수정됨)
- GitHub: `github_updated_at`가 마지막 동기화 시점보다 최신

## 폴링 설정

| 설정 항목 | 기본값 | 설명 |
|-----------|--------|------|
| `sync.interval` | 300 (5분) | 폴링 간격 (초) |
| `sync.auto` | `true` | 서버 실행 시 자동 폴링 활성화 |
| `sync.onFocus` | `true` | 웹 UI 포커스 복귀 시 동기화 |

- `gpm server` 실행 시 자동으로 폴링을 시작한다.
- 설정 변경은 `gpm config set sync.interval 600` 등으로 가능하다.
- 폴링 중 에러 발생 시 간격을 2배로 늘려 재시도한다 (최대 30분).

## 충돌 해결

### 충돌 해결 정책 테이블

| 상황 | 기본 동작 | `--force` 동작 |
|------|-----------|----------------|
| 로컬만 변경 | Push | Push |
| GitHub만 변경 | Pull | Pull |
| 양쪽 변경 | GitHub 우선 (경고 출력) | 로컬 우선 |
| GitHub에서 삭제 | 로컬도 삭제 | 로컬도 삭제 |
| 로컬에서 삭제 | GitHub도 삭제 | GitHub도 삭제 |

### 충돌 발생 시 CLI 출력

```bash
$ gpm sync
⚠ Conflict detected on 2 tasks:
  #42 "로그인 기능 구현" - both sides modified
    Local:  status changed to "Done" at 2026-03-23 14:00
    GitHub: status changed to "In Review" at 2026-03-23 14:05
    → Resolved: GitHub version applied (use --force for local)

  #43 "회원가입 페이지" - both sides modified
    Local:  title changed at 2026-03-23 13:50
    GitHub: title changed at 2026-03-23 13:55
    → Resolved: GitHub version applied (use --force for local)

✓ Sync completed: 5 pulled, 3 pushed, 2 conflicts resolved
```

### 충돌 해결 웹 UI (Phase 3)

- 충돌 항목 목록 표시
- 로컬 vs GitHub 값 비교 diff 뷰
- 항목별 "로컬 선택" / "GitHub 선택" 버튼
- 일괄 해결 옵션

## GitHub GraphQL API

### 주요 쿼리

#### 프로젝트 항목 조회

```graphql
query GetProjectItems($owner: String!, $number: Int!, $cursor: String) {
  user(login: $owner) {
    projectV2(number: $number) {
      items(first: 100, after: $cursor) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          id
          content {
            ... on DraftIssue {
              title
              body
              updatedAt
            }
            ... on Issue {
              title
              body
              updatedAt
              labels(first: 20) {
                nodes { name color }
              }
              milestone { title }
              assignees(first: 10) {
                nodes { login avatarUrl }
              }
            }
          }
          fieldValues(first: 20) {
            nodes {
              ... on ProjectV2ItemFieldSingleSelectValue {
                name
                field { ... on ProjectV2SingleSelectField { name } }
              }
              ... on ProjectV2ItemFieldTextValue {
                text
                field { ... on ProjectV2FieldCommon { name } }
              }
            }
          }
        }
      }
    }
  }
}
```

#### 프로젝트 필드 조회

```graphql
query GetProjectFields($owner: String!, $number: Int!) {
  user(login: $owner) {
    projectV2(number: $number) {
      fields(first: 50) {
        nodes {
          ... on ProjectV2SingleSelectField {
            id
            name
            options { id name color }
          }
          ... on ProjectV2FieldCommon {
            id
            name
          }
        }
      }
    }
  }
}
```

### 주요 Mutation

#### Draft Issue 추가

```graphql
mutation AddDraftIssue($projectId: ID!, $title: String!, $body: String) {
  addProjectV2DraftIssue(input: {
    projectId: $projectId
    title: $title
    body: $body
  }) {
    projectItem { id }
  }
}
```

#### 기존 Issue를 프로젝트에 추가

```graphql
mutation AddItemToProject($projectId: ID!, $contentId: ID!) {
  addProjectV2ItemById(input: {
    projectId: $projectId
    contentId: $contentId
  }) {
    item { id }
  }
}
```

#### 필드 값 업데이트

```graphql
mutation UpdateFieldValue($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: ProjectV2FieldValue!) {
  updateProjectV2ItemFieldValue(input: {
    projectId: $projectId
    itemId: $itemId
    fieldId: $fieldId
    value: $value
  }) {
    projectV2Item { id }
  }
}
```

#### 항목 삭제

```graphql
mutation DeleteItem($projectId: ID!, $itemId: ID!) {
  deleteProjectV2Item(input: {
    projectId: $projectId
    itemId: $itemId
  }) {
    deletedItemId
  }
}
```

## Rate Limit 관리

### GitHub GraphQL API 제한

| 항목 | 값 |
|------|-----|
| 시간당 포인트 | 5,000 |
| sync 1회 소비 | ~10-50 포인트 (항목 수에 따라) |
| 항목 100개 조회 | ~1-2 포인트 |
| Mutation 1회 | ~1 포인트 |

### Rate Limit 처리 전략

1. **사전 확인**: API 호출 전 남은 포인트를 확인한다.
2. **자동 대기**: 포인트 부족 시 리셋 시각까지 자동 대기한다.
3. **재시도**: 429 응답 시 `Retry-After` 헤더 값만큼 대기 후 재시도한다.
4. **배치 처리**: 다수 항목 Push 시 Mutation을 배치로 묶어 호출한다.

### Rate Limit CLI 출력

```bash
$ gpm sync
ℹ Rate limit: 4,850/5,000 points remaining (resets in 45m)
✓ Sync completed: used 25 points
```

## 동기화 로그 스키마

```sql
CREATE TABLE sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,       -- 대상 프로젝트 식별자
  sync_type TEXT NOT NULL,           -- 'pull' | 'push' | 'full'
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL,              -- 'success' | 'failure' | 'partial'
  items_pulled INTEGER DEFAULT 0,
  items_pushed INTEGER DEFAULT 0,
  items_created INTEGER DEFAULT 0,
  items_updated INTEGER DEFAULT 0,
  items_deleted INTEGER DEFAULT 0,
  conflicts INTEGER DEFAULT 0,
  error_message TEXT,
  rate_limit_used INTEGER DEFAULT 0
);
```

## 추후 확장: Webhook (Phase 2 이후)

### 개요

현재 폴링 방식의 한계를 보완하기 위해, GitHub Webhook을 활용한 실시간 동기화를 Phase 2 이후에 도입한다.

### 대상 이벤트

- `projects_v2_item`: 프로젝트 항목 생성/수정/삭제/이동
- Webhook payload에서 변경된 항목의 `node_id`를 추출하여 해당 항목만 Pull한다.

### 구현 방향

1. `gpm server`에 Webhook 엔드포인트 추가 (`POST /api/webhook/github`)
2. ngrok 또는 cloudflare tunnel을 통한 로컬 서버 노출
3. Webhook 수신 시 해당 항목만 즉시 Pull (선택적 동기화)
4. 폴링과 Webhook 병행 (Webhook 실패 시 폴링으로 보완)

### 제약 사항

- 로컬 서버가 외부에서 접근 가능해야 함 (터널링 필요)
- GitHub App 또는 Webhook 설정 필요
- 보안을 위한 Webhook Secret 검증 필수
