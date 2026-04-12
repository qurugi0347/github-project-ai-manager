---
name: multi-project-plan
description: 멀티 프로젝트 지원 개발 계획
created: 2026-04-03
status: done
---

# 멀티 프로젝트 지원 Plan

## 목적 (Why)

- **목적**: 하나의 repo에서 여러 GitHub Project V2를 관리할 수 있도록 전체 레이어 확장
- **문제**: `.gpmrc`가 단일 `projectNumber`만 지원하여 1 repo = 1 project 제약
- **방법**: `.gpmrc` 구조 변경 + CLI `--project` 전역 옵션 + DB alias 컬럼 + FE 탭 네비게이션

## FE 페이지 Flow

### URL 구조 변경

```
현재:
  /                         → ProjectListPage
  /projects/:id             → ProjectPage (칸반 보드)

변경:
  /                         → RepositoryListPage (repo 카드 목록)
  /repository/:repoId       → defaultProject 탭으로 redirect
  /repository/:repoId/project/:projectId → 칸반 보드 + project 탭
```

### 페이지 흐름도

```
[/] RepositoryListPage
  │
  └─ repo 카드 클릭
      ↓
[/repository/:repoId] → redirect → [/repository/:repoId/project/:defaultProjectId]
      ↓
[/repository/:repoId/project/:projectId] RepositoryProjectPage
  ├─ [dev 탭] ──→ 개발 칸반 보드 (URL: /repository/1/project/1)
  └─ [design 탭] → 기획 칸반 보드 (URL: /repository/1/project/2)
```

### 화면 와이어프레임

```
┌──────────────────────────────────────────────────────────┐
│ [GPM]  GitHub Project Manager                owner/repo  │
├──────────────────────────────────────────────────────────┤
│  ┌─────┐  ┌────────┐                                    │
│  │ dev │  │ design │                    ← project 탭     │
│  │ ━━━ │  │        │                    (활성 탭에 밑줄)  │
│  └─────┘  └────────┘                                    │
├──────────────────────────────────────────────────────────┤
│ [Sync] MilestoneSummary ──────────────── (가로스크롤)     │
│ [All] [v0.3] [v0.4]  Sort: [newest ▼]                   │
│                                                          │
│ ┌──────────┐ ┌───────────┐ ┌──────────┐                 │
│ │   Todo   │ │In Progress│ │   Done   │                 │
│ │ ┌──────┐ │ │ ┌───────┐ │ │ ┌──────┐ │                 │
│ │ │ Task │ │ │ │ Task  │ │ │ │ Task │ │                 │
│ │ └──────┘ │ │ └───────┘ │ │ └──────┘ │                 │
│ └──────────┘ └───────────┘ └──────────┘                 │
└──────────────────────────────────────────────────────────┘
```

### 컴포넌트 구조

```
App (Router)
├── Layout
│   └── Header (GPM 로고 + repo 이름)
├── RepositoryListPage          ← ProjectListPage 리네이밍
│   └── RepositoryCard          ← repo별 카드 (등록된 project 수 표시)
└── RepositoryProjectPage       ← ProjectPage 리팩토링
    ├── ProjectTabs             ← 신규: 탭 네비게이션
    ├── KanbanBoard             ← 기존 유지
    │   ├── KanbanColumn
    │   │   └── TaskCard
    │   └── MilestoneSummary
    ├── TaskDetailPanel          ← 기존 유지
    └── MilestoneDetailPanel     ← 기존 유지
```

### 설계 결정: URL 구조

- **선택:** `/repository/:repoId/project/:projectId` 계층적 URL
- **이유:** repo → project 종속 관계를 URL로 명확히 표현, 탭 전환 시 URL만 변경
- **차선책:** `/projects/:id` 유지 + Header 드롭다운으로 전환
- **차선책 미채택 이유:** 사용자가 repo 하위에 project를 배치하는 구조를 원함

### 설계 결정: project 전환 방식

- **선택:** 탭 네비게이션 (같은 페이지 내 탭)
- **이유:** project 간 빠른 전환, 현재 위치(repo) 유지, 직관적
- **차선책:** Header 드롭다운 selector
- **차선책 미채택 이유:** 드롭다운은 접근성 1단계 더 깊음, 탭이 시각적으로 명확

## DB 수정 계획

### 테이블 변경

| 테이블 | 변경 유형 | 컬럼 | 타입 | 설명 |
|--------|----------|------|------|------|
| projects | ADD | alias | varchar(50) NULL | .gpmrc의 project alias (dev, design 등) |

### 설계 결정: alias 저장 방식

- **선택:** DB `projects` 테이블에 `alias` nullable 컬럼 추가 (A안)
- **이유:** API 응답에 자연스럽게 포함, CLI/서버 양쪽에서 활용, 깔끔
- **차선책:** 서버 메모리에서 `.gpmrc` alias 매핑 유지 (B안)
- **차선책 미채택 이유:** 서버 재시작 시 재로딩 필요, API에 별도 주입 로직 필요

### 마이그레이션 순서

1. `projects` 테이블에 `alias` 컬럼 추가 (nullable, 기존 데이터 영향 없음)
2. `gpm server` 시작 시 `.gpmrc`의 alias를 DB에 업데이트

## API 구성

### 엔드포인트 변경

기존 API는 모두 유지. 추가/변경 사항:

| Method | Path | 변경 | 설명 |
|--------|------|------|------|
| GET | `/projects` | 응답에 `alias` 필드 추가 | 프로젝트 목록 |
| GET | `/projects/:id` | 응답에 `alias` 필드 추가 | 프로젝트 상세 |
| GET | `/projects/by-repo?owner=X&repo=Y` | 신규 | repo에 속한 project 목록 (탭 렌더링용) |

### 설계 결정: repo별 project 조회

- **선택:** 쿼리 파라미터 기반 `/projects/by-repo?owner=X&repo=Y`
- **이유:** 기존 `/projects` 엔드포인트는 전체 목록, repo별 필터가 필요
- **차선책:** `/projects?owner=X&repo=Y`로 기존 엔드포인트에 필터 추가
- **차선책 미채택 이유:** 기존 동작(전체 목록) 변경 없이 별도 엔드포인트가 안전

## CLI 구성

### .gpmrc 스키마 변경

**현재:**
```json
{
  "owner": "qurugi0347",
  "ownerType": "user",
  "repo": "github-project-ai-manager",
  "projectNumber": 1,
  "projectUrl": "https://github.com/users/qurugi0347/projects/1"
}
```

**변경 후:**
```json
{
  "owner": "qurugi0347",
  "ownerType": "user",
  "repo": "github-project-ai-manager",
  "defaultProject": "dev",
  "projects": {
    "design": {
      "projectNumber": 2,
      "projectUrl": "https://github.com/users/qurugi0347/projects/2"
    },
    "dev": {
      "projectNumber": 1,
      "projectUrl": "https://github.com/users/qurugi0347/projects/1"
    }
  }
}
```

### 설계 결정: .gpmrc 구조

- **선택:** `projects` 오브젝트 맵 (alias → config)
- **이유:** `--project dev`처럼 사람이 읽기 쉬운 alias 사용 가능, 확장성 좋음
- **차선책:** `projects` 배열 + `name` 필드 (`[{ "name": "dev", "projectNumber": 1 }]`)
- **차선책 미채택 이유:** 배열은 alias 조회 시 O(n) 탐색 필요, 오브젝트 맵이 직관적
- **트레이드오프:** alias 변경 시 키 자체를 바꿔야 함 (빈도 낮아 수용 가능)

### 명령어 구조

```bash
# 전역 옵션
gpm --project <alias> <command>     # 특정 project 지정
gpm -p <alias> <command>            # 축약형
gpm <command>                       # defaultProject 사용

# 프로젝트 관리
gpm project list                    # 등록된 프로젝트 목록
gpm project add                     # 새 프로젝트 등록 (interactive)
gpm project remove <alias>          # 프로젝트 제거
gpm project default <alias>         # 기본 프로젝트 변경

# sync (항상 전체)
gpm sync pull                       # 모든 등록된 project 동기화

# init (멀티 프로젝트 대응)
gpm init                            # 기존 .gpmrc 있으면 → 추가 여부 질문
                                    # 같은 URL → 중복 무시
                                    # 새 URL → 연동 진행
```

### 설계 결정: sync 범위

- **선택:** sync는 항상 전체 projects 동기화
- **이유:** 사용자 결정 — 부분 sync는 불필요한 복잡도
- **차선책:** `--project` 옵션으로 개별 sync
- **차선책 미채택 이유:** 사용자가 원하지 않음

### 설계 결정: init 재실행

- **선택:** 기존 `.gpmrc` 존재 시 project 추가 여부 질문
- **이유:** `gpm init`이 기존 설정을 덮어쓰면 위험, 자연스러운 UX
- **차선책:** `gpm project add`로만 추가 가능하게 분리
- **차선책 미채택 이유:** 사용자가 init 재실행 시 추가 워크플로우를 원함

### 데이터 격리 방안

| 계층 | 격리 방법 |
|------|----------|
| CLI | `--project` 미지정 시 `defaultProject`만 조회 |
| sync | 각 project별 독립 동기화 (project A issue가 project B에 유입 안 됨) |
| Backend | 이미 `projectId` 스코핑 완료 |
| Frontend | URL의 `:projectId`로 격리 + 탭 전환 시 데이터 재로드 |

### 하위 호환

- 레거시 `.gpmrc` (단일 `projectNumber`) → 자동 변환하여 `projects.default`로 매핑
- 변환은 메모리 내에서만 수행, 파일 자동 마이그레이션 하지 않음
- 사용자가 원할 때 `gpm init`으로 새 형식으로 전환

### Validation 규칙

| 검증 | 시점 | 에러 메시지 |
|------|------|-----------|
| 중복 projectNumber | `gpm init`, `gpm project add` | "Project #N is already registered as '<alias>'" |
| 중복 projectUrl | `gpm init`, `gpm project add` | "This project URL is already registered as '<alias>'" |
| defaultProject 존재 확인 | `.gpmrc` 로드 시 | "Default project '<alias>' not found in projects" |
| alias 유효성 | `gpm project add` | "Alias must be alphanumeric with hyphens" |

## 설계 결정 요약

| 영역 | 결정 | 이유 | 차선책 |
|------|------|------|--------|
| URL 구조 | `/repository/:repoId/project/:projectId` | repo→project 계층 명확 | `/projects/:id` 유지 + 드롭다운 |
| project 전환 | 탭 네비게이션 | 빠른 전환, 직관적 | Header 드롭다운 |
| alias 저장 | DB `projects.alias` 컬럼 (A안) | API 응답에 자연 포함 | 서버 메모리 매핑 |
| repo별 조회 | `/projects/by-repo` 신규 엔드포인트 | 기존 API 미변경 | 기존 `/projects`에 필터 추가 |
| .gpmrc | 오브젝트 맵 (alias → config) | alias 조회 O(1), 직관적 | 배열 + name 필드 |
| sync | 항상 전체 동기화 | 사용자 결정, 복잡도 감소 | 개별 sync |
| init | 재실행 시 추가 질문 + 중복 체크 | 안전한 UX | project add로만 분리 |
| 하위 호환 | 메모리 내 자동 변환 | 파일 수정 없이 안전 | 자동 마이그레이션 |

## TaskList 요약

| Task | 설명 | 의존성 | 영역 |
|------|------|--------|------|
| T1: GpmConfig 타입 변경 | `types.ts`에 멀티 프로젝트 인터페이스 추가 | - | CLI |
| T2: gpmrc.ts 리팩토링 | 멀티 프로젝트 파싱 + 하위 호환 + validation | T1 | CLI |
| T3: --project 전역 옵션 | `index.ts`에 Commander.js 전역 옵션 추가 | T2 | CLI |
| T4: gpm project 서브커맨드 | list/add/remove/default 명령어 구현 | T2 | CLI |
| T5: gpm init 멀티 프로젝트 대응 | 재실행 시 추가 워크플로우 + 중복 체크 | T2 | CLI |
| T6: gpm sync 전체 동기화 | 모든 등록된 project 순회 동기화 + alias DB 저장 | T3 | CLI |
| T7: Project Entity alias 컬럼 | DB에 alias 컬럼 추가 + API 응답 포함 | - | BE |
| T8: repo별 project 조회 API | `/projects/by-repo` 엔드포인트 추가 | T7 | BE |
| T9: FE URL 구조 변경 | Router 변경 + 페이지 리네이밍 | T8 | FE |
| T10: ProjectTabs 컴포넌트 | 탭 네비게이션 구현 | T9 | FE |
| T11: 스펙 문서 업데이트 | cli.md, data-model.md, web-ui.md 업데이트 | T10 | Docs |