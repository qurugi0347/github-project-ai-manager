# GPM (GitHub Project Manager) 기획서

GitHub Project V2를 활용한 AI 프로젝트 매니저 서비스.
npm CLI(`gpm`)로 Claude Code에서 태스크를 관리하고, localhost 웹 UI로 시각화합니다.

## 문서 목록

| 문서 | 설명 |
|------|------|
| [서비스 개요](./overview.md) | 목적, 핵심 가치, 대상 사용자, 기술 스택 |
| [시스템 아키텍처](./architecture.md) | 구성도, 레이어 구조, 모듈, 디렉토리, 배포 |
| [데이터 모델](./data-model.md) | GitHub 필드 매핑, SQLite 스키마, 충돌 해결 |
| [CLI 명령어 스펙](./cli.md) | `gpm` 명령어 체계, 옵션, 사용 예시 |
| [웹 UI 스펙](./web-ui.md) | 페이지 구성, 컴포넌트, 반응형, 상태 관리 |
| [동기화 스펙](./sync.md) | Pull/Push 흐름, 충돌 해결, GraphQL API, 폴링 |
| [개발 로드맵](./roadmap.md) | Phase 1(MVP) ~ Phase 5(최적화) |

## 기술 스택 요약

| 영역 | 기술 |
|------|------|
| CLI | Node.js, Commander.js, TypeScript |
| Backend | NestJS, TypeORM, SQLite |
| Frontend | React, Vite, TailwindCSS |
| GitHub API | Octokit, GraphQL API v4 |
| Auth | `gh auth token` 재사용 |
