---
name: gpm
description: GitHub Project Manager — 태스크 관리 자동화. /gpm next로 다음 작업 시작, /gpm done으로 완료 처리.
user_invocable: true
---

# GPM — GitHub Project Manager Skill

이 Skill은 `npx github-project-manager` CLI를 통해 GitHub Project V2의 태스크를 관리합니다.
프로젝트 루트에 `.gpmrc` 파일이 있어야 동작합니다. 없으면 `npx github-project-manager init`을 먼저 실행하세요.

<instructions>

## /gpm next — 다음 태스크 시작

1. GitHub에서 최신 태스크를 동기화합니다:
   ```bash
   npx github-project-manager sync
   ```

2. Todo 상태의 태스크 목록을 조회합니다:
   ```bash
   npx github-project-manager task list --json
   ```

3. 가장 먼저 나오는 Todo 태스크를 선택하여 "In Progress"로 변경합니다:
   ```bash
   npx github-project-manager task status <id> "In Progress"
   ```

4. 해당 태스크의 제목과 내용을 바탕으로 구현 계획을 수립하고 작업을 시작합니다.
   - 프로젝트의 docs/spec/ 문서가 있으면 참조하세요
   - CLAUDE.md의 코딩 규칙을 따르세요

## /gpm done — 현재 작업 완료

1. 현재 In Progress 상태의 태스크를 찾습니다:
   ```bash
   npx github-project-manager task list --json
   ```
   JSON 결과에서 status가 "In Progress"인 태스크를 찾으세요.

2. 해당 태스크를 "Done"으로 변경합니다:
   ```bash
   npx github-project-manager task status <id> "Done"
   ```

3. GitHub과 동기화합니다:
   ```bash
   npx github-project-manager sync
   ```

4. 다음 추천 태스크를 표시합니다 (Todo 목록에서 첫 번째).

## /gpm status — 프로젝트 현황

1. 최신 동기화:
   ```bash
   npx github-project-manager sync
   ```

2. 전체 태스크 목록을 JSON으로 조회:
   ```bash
   npx github-project-manager task list --json --limit 100
   ```

3. 상태별로 집계하여 요약 출력:
   ```
   📊 프로젝트 현황
   - Todo: N개
   - In Progress: N개
   - Done: N개
   - 기타: N개
   총 태스크: N개
   ```

## /gpm plan — 작업 계획 수립

1. Todo 태스크 목록을 조회합니다:
   ```bash
   npx github-project-manager task list --json --limit 100
   ```

2. 태스크 제목과 라벨을 분석하여:
   - Phase별 그룹핑 (제목에 [Phase2], [Phase3] 등이 있으면)
   - 의존성 추론 (예: "TanStack Query 설정"은 "칸반 보드"보다 먼저)
   - 작업 난이도 예측

3. 추천 작업 순서를 제안합니다:
   ```
   📋 추천 작업 순서:
   1. #8 TanStack Query 설정 (기반 작업)
   2. #10 태스크 목록/상세 페이지 (UI 기본)
   3. #9 칸반 보드 구현 (UI 고급)
   ```

## /gpm sync — GitHub 동기화

GitHub Project에서 최신 태스크를 로컬 DB로 가져옵니다:
```bash
npx github-project-manager sync
```

결과를 사용자에게 보고합니다.

## /gpm create <title> — 태스크 생성

GitHub Project에 새 태스크를 직접 생성합니다:
```bash
npx github-project-manager task create "<title>" --json
```

생성된 태스크 정보를 표시합니다.

</instructions>

<constraints>
- .gpmrc 파일이 없으면 "npx github-project-manager init을 먼저 실행하세요"라고 안내
- gpm server가 실행 중이어야 task create/status가 동작함. 서버가 안 떠있으면 standalone 모드로 sync만 가능
- GitHub API rate limit에 주의. sync는 필요할 때만 실행
- 태스크 상태 변경 시 사용 가능한 상태값은 GitHub Project의 Status 필드 옵션에 따라 다름
</constraints>
