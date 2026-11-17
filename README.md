# openRPG-web

오픈월드 판타지 RPG 웹 프로토타입. TypeScript + Vite + Three.js + DOM UI.

## 실행 방법

```bash
corepack enable        # pnpm 활성화 (최초 1회)
pnpm install
pnpm dev               # http://localhost:5173
```

기타 명령어:

| 명령 | 용도 |
|------|------|
| `pnpm test` | Vitest 단위 테스트 |
| `pnpm lint` | ESLint |
| `pnpm build` | 타입체크 + 프로덕션 빌드 |

## 문서

- `docs/00`~`05`: 게임 디자인 문서 (GDD, 세계관, 시스템, UI/UX, 데이터 아키텍처, 기술 로드맵)
- `docs/superpowers/plans/2026-11-17-web-prototype.md`: Phase 0 구현 계획
- `AGENTS.md`: 개발 규칙과 프로젝트 구조 (에이전트/신규 환경 필독)

## 현재 상태

Phase 0 진행 중. 스캐폴드, 코어 게임 상태/이벤트 버스, 종족 6종/클래스 4종 데이터, 세미리얼 ATB 전투 코어, 경험치/레벨업이 구현되어 있다. 엔진(Three.js), DOM UI, 입력, 세이브는 아직 미구현이다. 세부 진행 상황은 구현 계획 문서의 체크박스를 따른다.
