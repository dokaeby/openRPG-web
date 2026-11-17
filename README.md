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

Phase 0 + 시스템 확장 구현 완료. 스캐폴드, 코어 게임 상태/이벤트 버스, 종족 6종/클래스 4종, 세미리얼 ATB 전투(스킬/MP/버프/독 상태이상), 경험치/레벨업(스탯·스킬 포인트), 인벤토리/아이템/장착, 퀘스트 시스템(8종, kill/collect/talk/reach 목표), NPC 대화(4명, 조건 분기), IndexedDB 세이브/로드, Three.js 씬 + 플레이어 이동, 전투 브릿지, 존 3개(마을/초원/숲) + 몬스터 스폰/리스폰 + 포탈 이동, 미니맵, DOM HUD + 캐릭터 생성 UI, 반응형/크로스브라우저 CSS(Chrome/Edge/Safari 대응, rem 기반, 모바일 브레이크포인트)를 포함한다.

조작: WASD 이동, Shift 달리기, Space 공격, 1/2 스킬, Q 체력 포션, F NPC 대화, I 가방, J 퀘스트 로그. 우측 상단 저장/불러오기, 30초 자동저장. 수동 E2E 확인은 아직 미실시 — `pnpm dev` 후 브라우저에서 확인 권장.
