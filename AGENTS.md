# AGENTS.md

openRPG-web: 오픈월드 판타지 RPG 웹 프로토타입.

## 환경

- Node.js 20+ (`.nvmrc` 참조, 현재 개발 환경은 Node 24)
- 패키지 매니저: pnpm (`packageManager` 필드로 버전 고정, `corepack enable` 후 `pnpm install`)
- OS 비의존. Windows/macOS/Linux 모두 동일하게 동작해야 한다.

## 명령어

- `pnpm dev` — Vite 개발 서버
- `pnpm test` — Vitest (`tests/**/*.test.ts`)
- `pnpm lint` — ESLint (`src`, `tests`)
- `pnpm build` — `tsc --noEmit` + Vite 빌드

## 아키텍처 규칙 (필수)

- `src/core/**`, `src/data/**`는 Three.js, DOM, `window`, `document`, `fetch`, `idb-keyval`을 import하지 않는다. ESLint `no-restricted-imports`로 강제된다. 이 계층은 Unity C# 포팅 대상이므로 브라우저/렌더링 의존을 추가하면 안 된다.
- `core` 시스템 간 통신은 `EventBus` 이벤트로 한다. UI는 상태를 직접 변경하지 않고 `GameState.dispatch(action)`만 호출한다.
- 게임 데이터는 `src/data`의 TypeScript 모듈로 관리한다. 수치 밸런스 변경은 데이터 파일에서만 한다.
- UI 텍스트는 한국어. 커밋 메시지는 conventional commits.

## 프로젝트 구조

```
src/
  core/    # 순수 TS 게임 로직 (gameState, eventBus, combat, progression, types)
  data/    # 종족/클래스/몬스터 정의 (races, classes, monsters)
  app.ts, main.ts  # 부트스트랩
tests/     # Vitest, tests/core/*
docs/      # 디자인 문서 00~05 + superpowers/plans (구현 계획)
```

`engine/`, `input/`, `ui/`, `world/` 디렉터리는 계획상 존재하지만 아직 미구현이다 (`docs/05` §2.3, §3 참조).

## 문서

- 디자인 스펙: `docs/00`~`05` (한국어). 구현 상태와 다른 부분이 있으면 코드를 기준으로 문서를 수정한다.
- 구현 계획/진행: `docs/superpowers/plans/2026-11-17-web-prototype.md` — Task 단위 체크박스로 진행 상황 추적.
- 작업 지시문: `docs/senior-engineer-prompt.md` — 이 프로젝트에서만 사용하는 수석 엔지니어 프롬프트(각색본). 새 작업 시 기준으로 삼는다.
