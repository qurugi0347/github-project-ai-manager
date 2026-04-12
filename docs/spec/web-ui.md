# 웹 UI 기능 스펙

GPM 웹 UI는 NestJS 로컬 서버 위에서 동작하는 React 기반 싱글 페이지 애플리케이션이다. `gpm server` 명령어로 실행되며, 칸반 보드를 중심으로 GitHub Project V2 태스크를 시각적으로 관리한다.

## 기술 스택

- **프론트엔드**: React + TypeScript + Vite
- **상태 관리**: TanStack Query (React Query)
- **스타일링**: Tailwind CSS
- **드래그 앤 드롭**: @dnd-kit
- **마크다운 렌더링**: react-markdown

## URL 구조

웹 UI는 Repository → Project 계층 구조의 URL을 사용한다. 하나의 Repository에 여러 GitHub Project가 연결될 수 있으므로 URL로 Project를 식별한다.

### 라우팅 테이블

| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/` | RepositoryListPage | 등록된 Repository 목록 |
| `/repository/:owner/:repo` | RepositoryRedirect | 해당 repo의 기본 프로젝트로 리다이렉트 |
| `/repository/:owner/:repo/project/:projectId` | RepositoryProjectPage | 특정 프로젝트의 칸반 보드 |

### 네비게이션 흐름

```
RepositoryListPage (/)
    │
    │  repo 카드 클릭
    ▼
RepositoryRedirect (/repository/:owner/:repo)
    │
    │  첫 번째 project로 자동 리다이렉트
    ▼
RepositoryProjectPage (/repository/:owner/:repo/project/:projectId)
    │
    │  ProjectTabs로 다른 project 전환
    ▼
RepositoryProjectPage (/repository/:owner/:repo/project/:otherProjectId)
```

## 페이지 구성

### 0. Repository 목록 (`/`)

서버에 등록된 프로젝트를 Repository별로 그룹화하여 표시하는 진입 페이지.

#### 구성 요소

- **Repository 목록**
  - `GET /api/projects` API로 서버에 등록된 전체 프로젝트를 조회한다.
  - 동일 owner/repo를 가진 프로젝트를 그룹화하여 Repository 카드로 표시한다.

- **Repository 카드**
  - Owner (org 또는 user)
  - Repository 이름
  - 연결된 Project 수
  - 카드 클릭 시 `/repository/:owner/:repo`로 이동한다.

### 0.1. Repository 리다이렉트 (`/repository/:owner/:repo`)

해당 Repository에 연결된 프로젝트 중 첫 번째 프로젝트의 상세 페이지로 자동 리다이렉트한다.

- `GET /api/projects/by-repo?owner=:owner&repo=:repo`로 프로젝트 목록을 조회한다.
- 프로젝트가 존재하면 `/repository/:owner/:repo/project/:firstProjectId`로 리다이렉트한다.
- 프로젝트가 없으면 에러 메시지를 표시한다.

### 0.2. 프로젝트 상세 (`/repository/:owner/:repo/project/:projectId`)

선택된 프로젝트의 칸반 보드와 태스크를 관리하는 메인 페이지. 동일 Repository에 여러 프로젝트가 있을 경우 상단에 `ProjectTabs`로 전환할 수 있다.

#### 구성 요소

- **ProjectTabs** (동일 repo에 프로젝트가 2개 이상일 때만 표시)
  - `GET /api/projects/by-repo?owner=:owner&repo=:repo`로 프로젝트 목록을 조회한다.
  - 현재 프로젝트는 활성 탭으로 강조 표시한다.
  - 탭 레이블은 `alias`가 있으면 alias, 없으면 `Project #N` 형식을 사용한다.
  - 탭 클릭 시 `/repository/:owner/:repo/project/:projectId`로 이동한다.

- **프로젝트 헤더**
  - 프로젝트 이름 및 GitHub 링크
  - Sync 버튼
  - 태스크 통계

- **칸반 보드** (아래 "2. 칸반 보드" 섹션 참조)

### 1. 대시보드 (미구현 예정)

프로젝트 전체 현황을 한눈에 파악할 수 있는 메인 페이지.

#### 구성 요소

- **프로젝트 요약 카드**
  - 프로젝트 이름 및 GitHub 링크
  - 전체 태스크 수
  - 상태별 태스크 수 (Todo / In Progress / Done)
  - 완료율 프로그레스 바

- **최근 활동 타임라인**
  - 최근 변경된 태스크 목록 (최대 10개)
  - 변경 유형 아이콘 (생성/수정/상태변경/삭제)
  - 변경 시각 (상대 시간 표시)

- **동기화 상태**
  - 마지막 동기화 시각
  - 다음 동기화 예정 시각
  - 동기화 대기 중인 변경 수
  - 수동 동기화 버튼

- **마일스톤 진행 현황**
  - 활성 마일스톤별 진행률
  - 마감일까지 남은 일수

### 2. 칸반 보드 (`/board`)

Status별 컬럼으로 구성된 칸반 보드. 태스크의 시각적 관리와 드래그 앤 드롭 상태 변경을 지원한다.

#### 구성 요소

- **컬럼 레이아웃**
  - GitHub Project의 Status 필드 옵션별로 컬럼 자동 생성
  - 기본 컬럼: Todo, In Progress, Done
  - 각 컬럼 상단에 태스크 수 표시

- **태스크 카드**
  - 태스크 제목
  - 라벨 배지 (색상 포함)
  - 담당자 아바타
  - 마일스톤 표시
  - 클릭 시 태스크 상세 페이지로 이동

- **드래그 앤 드롭**
  - 카드를 다른 컬럼으로 드래그하여 상태 변경
  - 드래그 중 시각적 피드백 (반투명 카드, 드롭 영역 하이라이트)
  - 드롭 시 낙관적 업데이트 후 서버 반영

- **필터 바**
  - 라벨 필터 (다중 선택)
  - 담당자 필터
  - 마일스톤 필터
  - 키워드 검색

- **빠른 태스크 생성**
  - 각 컬럼 하단에 "+" 버튼
  - 인라인 입력으로 제목만 입력하여 빠르게 생성
  - 해당 컬럼의 Status가 자동 지정

### 3. 태스크 목록 (`/tasks`)

전체 태스크를 테이블 형식으로 조회하는 페이지. 정렬, 필터링, 페이지네이션을 지원한다.

#### 구성 요소

- **테이블**
  - 컬럼: ID, 제목, 상태, 라벨, 담당자, 마일스톤, 생성일, 수정일
  - 행 클릭 시 태스크 상세 페이지로 이동

- **정렬**
  - 생성일 (기본, 내림차순)
  - 수정일
  - 상태
  - 컬럼 헤더 클릭으로 정렬 토글

- **필터링**
  - 상태 필터 (다중 선택 칩)
  - 라벨 필터
  - 담당자 필터
  - 마일스톤 필터
  - 텍스트 검색 (제목, 본문)

- **페이지네이션**
  - 페이지당 20개 (설정 가능)
  - 페이지 번호 네비게이션
  - 전체 태스크 수 표시

### 4. 태스크 상세 (`/tasks/:id`)

개별 태스크의 상세 정보를 조회하고 편집하는 페이지.

#### 구성 요소

- **헤더 영역**
  - 태스크 제목 (인라인 편집 가능)
  - GitHub 링크 버튼 (새 탭으로 열기)
  - 삭제 버튼

- **본문 영역**
  - 마크다운 렌더링 뷰
  - 편집 모드 토글 (마크다운 에디터)

- **사이드바 (메타데이터)**
  - 상태 드롭다운 (변경 즉시 반영)
  - 라벨 태그 (추가/제거 가능)
  - 마일스톤 선택
  - 담당자 선택
  - 생성일 / 수정일
  - 마지막 동기화 시각

- **활동 로그**
  - 태스크 변경 이력
  - 동기화 이력

### 5. 설정 (`/settings`)

프로젝트 연결 정보와 동기화 설정을 관리하는 페이지.

#### 구성 요소

- **프로젝트 연결 정보**
  - GitHub Owner / Repository / Project Number
  - 연결 상태 확인
  - 연결 해제 / 재연결

- **동기화 설정**
  - 자동 동기화 활성화/비활성화 토글
  - 폴링 간격 설정 (분 단위)
  - 충돌 해결 정책 선택 (GitHub 우선 / 로컬 우선 / 수동)

- **동기화 로그**
  - 최근 동기화 이력 테이블
  - 동기화 유형 (Pull / Push / Full)
  - 결과 (성공 / 실패 / 충돌)
  - 변경된 항목 수
  - 상세 보기 (변경 내역)

## 주요 UI 컴포넌트

### ProjectTabs

동일 Repository에 여러 프로젝트가 연결된 경우 프로젝트 간 전환을 위한 탭 네비게이션 컴포넌트.

- Props: `owner`, `repo`, `currentProjectId`
- `GET /api/projects/by-repo?owner=:owner&repo=:repo`로 프로젝트 목록을 조회한다.
- 프로젝트가 1개일 때는 렌더링하지 않는다 (`return null`).
- 탭 레이블: `alias`가 있으면 alias 표시, 없으면 `Project #N` 형식 사용.
- 현재 프로젝트 탭은 활성 스타일 (하단 테두리 강조) 적용.
- 탭 클릭 시 `/repository/:owner/:repo/project/:projectId`로 이동한다.

### TaskCard

칸반 보드에서 사용하는 태스크 카드 컴포넌트.

- Props: `task`, `isDragging`, `onClick`
- 표시 정보: 제목, 라벨 배지, 담당자 아바타, 마일스톤
- 드래그 가능 (dnd-kit Draggable)

### TaskTable

태스크 목록 페이지의 테이블 컴포넌트.

- Props: `tasks`, `sortBy`, `sortOrder`, `onSort`, `onRowClick`
- 컬럼 헤더 클릭으로 정렬
- 행 호버 하이라이트

### TaskDetail

태스크 상세 페이지의 메인 컴포넌트.

- Props: `taskId`
- 인라인 편집 지원 (제목, 본문)
- 메타데이터 사이드바 포함

### KanbanColumn

칸반 보드의 개별 컬럼 컴포넌트.

- Props: `status`, `tasks`, `onTaskDrop`
- dnd-kit Droppable 영역
- 태스크 수 뱃지
- 빠른 생성 입력

### LabelBadge

라벨을 색상과 함께 표시하는 배지 컴포넌트.

- Props: `label` (name, color)
- 색상 배경 + 텍스트

### SyncStatusIndicator

동기화 상태를 표시하는 인디케이터 컴포넌트.

- Props: `lastSyncAt`, `pendingChanges`, `isSyncing`
- 상태별 아이콘 (동기화 완료/진행중/오류)
- 마지막 동기화 시각 (상대 시간)

### FilterBar

필터링 조건을 설정하는 바 컴포넌트.

- Props: `filters`, `onFilterChange`
- 상태/라벨/담당자/마일스톤 필터
- 텍스트 검색 입력
- 활성 필터 칩 표시 및 개별 제거

## 반응형 디자인

### Desktop (1024px 이상)

- 칸반 보드: 모든 컬럼 가로 배치
- 태스크 목록: 전체 컬럼 테이블
- 태스크 상세: 본문 + 사이드바 2단 레이아웃
- 사이드바 네비게이션

### Tablet (768px ~ 1023px)

- 칸반 보드: 가로 스크롤 (컬럼 폭 축소)
- 태스크 목록: 주요 컬럼만 표시
- 태스크 상세: 사이드바를 본문 아래로 이동
- 탑 네비게이션

### Mobile (768px 미만)

- 칸반 보드: 리스트 뷰로 전환 (상태별 접기/펼치기)
- 태스크 목록: 카드 리스트로 전환
- 태스크 상세: 단일 컬럼 레이아웃
- 하단 탭 네비게이션

## 상태 관리

### TanStack Query (React Query) 활용

- **쿼리 키 설계**
  - `['tasks']`: 전체 태스크 목록
  - `['tasks', { status, label, milestone }]`: 필터링된 목록
  - `['tasks', id]`: 개별 태스크 상세
  - `['labels']`: 라벨 목록
  - `['milestones']`: 마일스톤 목록
  - `['sync', 'status']`: 동기화 상태

- **낙관적 업데이트**
  - 태스크 상태 변경 시 즉시 UI 반영
  - 서버 응답 실패 시 이전 상태로 롤백
  - 드래그 앤 드롭 상태 변경에 적용
  - 태스크 생성/수정/삭제에 적용

- **자동 갱신**
  - 동기화 완료 시 관련 쿼리 무효화
  - 포커스 복귀 시 자동 리패치
  - 폴링 간격에 맞춘 주기적 리패치

- **캐시 전략**
  - staleTime: 30초
  - cacheTime: 5분
  - 동기화 이벤트 시 즉시 무효화
