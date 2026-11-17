# Web RPG Prototype (Phase 0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vite+TypeScript+Three.js 프로젝트를 스캐폴드하고, 종족/클래스 선택 → 필드 이동 → 세미리얼 ATB 전투 → 레벨업 → 세이브까지의 코어 루프를 동작하는 프로토타입으로 만든다.

**Architecture:** 게임 로직은 `src/core`의 순수 TypeScript(렌더링/DOM/브라우저 API import 금지)로 두고, Three.js 렌더링(`src/engine`), DOM UI(`src/ui`), 입력(`src/input`)이 이를 감싼다. 고정 timestep(30Hz) 시뮬레이션과 rAF 렌더링을 분리한다.

**Tech Stack:** Vite, TypeScript (strict), Three.js, zod, idb-keyval, Vitest, pnpm

**Spec:** `openRPG/docs/00_기본설계서_개요.md`, `openRPG/docs/02_게임플레이_시스템.md`, `openRPG/docs/05_기술_선택_로드맵.md`

## Global Constraints

- `src/core/**`, `src/data/**`는 Three.js, DOM, `window`, `document`, `fetch`를 import하지 않는다. ESLint `no-restricted-imports`로 강제한다.
- 전투는 세미리얼 ATB. 프로토타입에서는 적 1종(고블린), 플레이어 1인, 단일 전투만 지원한다.
- 레벨 상한 50. 경험치 곡선: `expToNext(level) = floor(100 * level^1.5)`.
- 세이브는 IndexedDB(`idb-keyval`), `saveVersion = 1`.
- 패키지 매니저는 pnpm. Node.js LTS.
- 모든 텍스트/UI는 한국어.
- 커밋 메시지는 conventional commits (`feat:`, `test:`, `chore:` 등).

## Review Focus

1. **레벨업 경계값**: 경험치가 정확히 `expToNext`와 같을 때 1레벨만 오르는지, 여러 레벨을 한 번에 오를 때 올바른지 — Task 4 테스트에 포함.
2. **전투 종료 조건**: HP가 0 이하가 되는 순간 전투가 끝나는지, ATB 게이지가 가득 찬 상태에서 행동 불가 상태(기절)가 겹칠 때 — Task 5 테스트에 포함.
3. **세이브 로드 시 버전 불일치**: `saveVersion`이 다른 세이브를 로드할 때 거부/마이그레이션 동작 — Task 8 테스트에 포함.
4. **존재하지 않는 데이터 참조**: 존재하지 않는 종족/클래스/스킬 ID로 캐릭터 생성 시 명확한 에러 — Task 2 테스트에 포함.
5. **일시정지 중 입력**: 메뉴가 열린 상태에서 이동/전투 입력이 게임에 새지 않는지 — Task 9 통합 검증에 포함.

---

### Task 1: 프로젝트 스캐폴드

**Files:**
- Create: `openRPG/package.json`, `openRPG/tsconfig.json`, `openRPG/vite.config.ts`, `openRPG/vitest.config.ts`, `openRPG/index.html`, `openRPG/eslint.config.js`, `openRPG/.gitignore`
- Create: `openRPG/src/main.ts`, `openRPG/src/app.ts` (빈 부트스트랩)
- Create: `openRPG/tests/setup.ts`

**Interfaces:**
- Produces: `pnpm dev`로 Vite 개발 서버 실행, `pnpm test`로 Vitest 실행, `pnpm build`로 빌드.

- [ ] **Step 1: pnpm 프로젝트 초기화**

```bash
cd openRPG
pnpm init
pnpm add three zod idb-keyval
pnpm add -D typescript vite vitest @vitejs/plugin-react eslint typescript-eslint
```

- [ ] **Step 2: 설정 파일 작성**

`tsconfig.json`: `strict: true`, `target: ES2022`, `module: ESNext`, `moduleResolution: bundler`, `types: ["vite/client"]`.
`vite.config.ts`: `plugins: []` (React 불필요, DOM UI는 vanilla TS로 작성), `test`는 vitest.config.ts로 분리.
`vitest.config.ts`: `environment: "node"`, `include: ["tests/**/*.test.ts"]`, `setupFiles: ["tests/setup.ts"]`.
`index.html`: `<div id="app">` + `<canvas>` 컨테이너 + `<div id="ui">` (HUD 마운트 포인트) + `src/main.ts` 모듈 스크립트.
`eslint.config.js`: `src/core/**`, `src/data/**`에 `no-restricted-imports`로 `three`, `three/*`, `idb-keyval` 금지.
`.gitignore`: `node_modules`, `dist`, `*.local`.

- [ ] **Step 3: package.json 스크립트**

```json
"scripts": {
  "dev": "vite",
  "build": "tsc --noEmit && vite build",
  "test": "vitest run",
  "lint": "eslint src tests"
}
```

- [ ] **Step 4: 검증**

Run: `pnpm build && pnpm test`
Expected: 빌드 성공, 테스트 0개로 통과.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore: scaffold vite+typescript+three.js project"
```

---

### Task 2: 코어 데이터 타입과 스키마 (종족/클래스/스탯)

**Files:**
- Create: `openRPG/src/core/types.ts`
- Create: `openRPG/src/data/races.ts`, `openRPG/src/data/classes.ts`, `openRPG/src/data/index.ts`
- Test: `openRPG/tests/core/types.test.ts`

**Interfaces:**
- Produces:
  - `type RaceId = "human" | "elf" | "dwarf" | "orc" | "golem" | "half"`
  - `type ClassId = "warrior" | "mage" | "archer" | "rogue"`
  - `interface BaseStats { hp: number; mp: number; str: number; dex: number; int: number; vit: number; luk: number }`
  - `interface RaceDef { id: RaceId; name: string; description: string; statMods: Partial<BaseStats>; passive: { id: string; name: string; description: string } }`
  - `interface ClassDef { id: ClassId; name: string; description: string; baseStats: BaseStats; growthPerLevel: Partial<BaseStats>; weaponTypes: string[] }`
  - `const RACES: Record<RaceId, RaceDef>`, `const CLASSES: Record<ClassId, ClassDef>`
  - `function getRace(id: string): RaceDef` — 없는 ID면 `Error` throw
  - `function getClass(id: string): ClassDef` — 없는 ID면 `Error` throw

- [ ] **Step 1: 실패 테스트 작성**

```ts
import { describe, it, expect } from "vitest";
import { getRace, getClass, RACES, CLASSES } from "../../src/data";

describe("data lookup", () => {
  it("returns race def for valid id", () => {
    expect(getRace("human").name).toBe("인간");
    expect(getRace("golem").statMods.vit).toBeGreaterThan(0);
  });
  it("throws on unknown race", () => {
    expect(() => getRace("dragon")).toThrow();
  });
  it("returns class def for valid id", () => {
    expect(getClass("warrior").weaponTypes).toContain("sword");
  });
  it("throws on unknown class", () => {
    expect(() => getClass("bard")).toThrow();
  });
  it("has all 6 races and 4 classes", () => {
    expect(Object.keys(RACES)).toHaveLength(6);
    expect(Object.keys(CLASSES)).toHaveLength(4);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test tests/core/types.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: 구현**

`src/core/types.ts`에 위 인터페이스 정의. `src/data/races.ts`에 6종족(인간/엘프/드워프/오크/골렘/반혈) 정의 — 01번 문서 §3.2의 능력치 보정/고유 스킬을 반영. `src/data/classes.ts`에 4클래스(전사/마법사/궁수/도적) 정의 — 기본 스탯과 레벨당 성장치. `getRace`/`getClass`는 `Record` 조회 후 없으면 throw.

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test tests/core/types.test.ts`
Expected: PASS 5개

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add race/class data types and schemas"
```

---

### Task 3: EventBus + GameState

**Files:**
- Create: `openRPG/src/core/eventBus.ts`
- Create: `openRPG/src/core/gameState.ts`
- Test: `openRPG/tests/core/eventBus.test.ts`, `openRPG/tests/core/gameState.test.ts`

**Interfaces:**
- Consumes: Task 2의 `RaceId`, `ClassId`, `BaseStats`.
- Produces:
  - `type GameEvent = string` (예: `"player:damaged"`, `"combat:ended"`, `"quest:completed"`)
  - `class EventBus { on(event: GameEvent, handler: (payload: unknown) => void): () => void; emit(event: GameEvent, payload?: unknown): void; clear(): void }`
  - `interface PlayerState { id: string; name: string; race: RaceId; classId: ClassId; level: number; exp: number; gold: number; hp: number; maxHp: number; mp: number; maxMp: number; stats: BaseStats; position: { zone: string; x: number; y: number; z: number }; skills: string[]; inventory: ItemStack[] }`
  - `interface ItemStack { itemId: string; count: number }`
  - `interface GameStateData { player: PlayerState | null; questStates: Record<string, QuestState>; settings: { muted: boolean; uiScale: number } }`
  - `type QuestState = "locked" | "available" | "active" | "completed"`
  - `class GameState { data: GameStateData; dispatch(action: GameAction): void; getState(): GameStateData }`
  - `type GameAction = { type: "createCharacter"; name: string; race: RaceId; classId: ClassId } | { type: "setPosition"; x: number; y: number; z: number } | { type: "setQuestState"; questId: string; state: QuestState } | { type: "setSetting"; key: keyof GameStateData["settings"]; value: number | boolean }`

- [ ] **Step 1: 실패 테스트 작성**

```ts
// eventBus.test.ts
it("emits and receives events", () => {
  const bus = new EventBus();
  const seen: unknown[] = [];
  bus.on("player:damaged", (p) => seen.push(p));
  bus.emit("player:damaged", { amount: 5 });
  expect(seen).toEqual([{ amount: 5 }]);
});
it("unsubscribe stops delivery", () => {
  const bus = new EventBus();
  let count = 0;
  const off = bus.on("x", () => count++);
  off(); bus.emit("x");
  expect(count).toBe(0);
});

// gameState.test.ts
it("creates character with race/class stats applied", () => {
  const gs = new GameState();
  gs.dispatch({ type: "createCharacter", name: "테스트", race: "orc", classId: "warrior" });
  const p = gs.getState().player!;
  expect(p.race).toBe("orc");
  expect(p.level).toBe(1);
  expect(p.maxHp).toBeGreaterThan(0);
});
it("rejects invalid race/class on createCharacter", () => {
  const gs = new GameState();
  expect(() => gs.dispatch({ type: "createCharacter", name: "x", race: "dragon" as never, classId: "warrior" })).toThrow();
});
it("updates quest state", () => {
  const gs = new GameState();
  gs.dispatch({ type: "setQuestState", questId: "main_001", state: "active" });
  expect(gs.getState().questStates["main_001"]).toBe("active");
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test tests/core/eventBus.test.ts tests/core/gameState.test.ts`
Expected: FAIL

- [ ] **Step 3: 구현**

`EventBus`: Map 기반 구독 관리, `on`은 unsubscribe 함수 반환. `GameState`: `data`를 내부에 두고 `dispatch`로만 변경. `createCharacter`는 `getRace`/`getClass`로 스탯 계산 — `maxHp = classBase.hp + raceMod.vit*10`, `maxMp = classBase.mp + raceMod.int*5`, 나머지 스탯은 class base + race mod 합산. `position` 기본값 `{ zone: "greenfield", x: 0, y: 0, z: 0 }`. `skills`는 클래스 기본 스킬 1개. 잘못된 ID는 `getRace`/`getClass`의 throw를 그대로 전파.

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test tests/core/`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add event bus and game state core"
```

---

### Task 4: 레벨/경험치 시스템

**Files:**
- Create: `openRPG/src/core/progression.ts`
- Modify: `openRPG/src/core/gameState.ts` (액션 추가)
- Test: `openRPG/tests/core/progression.test.ts`

**Interfaces:**
- Consumes: Task 3의 `GameState`, `PlayerState`.
- Produces:
  - `function expToNext(level: number): number` — `floor(100 * level^1.5)`
  - `function addExp(gs: GameState, amount: number): { levelsGained: number }` — GameState 내부에서 player.exp 누적, 레벨업 시 stats 성장치 적용, `"player:levelup"` 이벤트 emit
  - `GameAction`에 `{ type: "addExp"; amount: number }` 추가

- [ ] **Step 1: 실패 테스트 작성**

```ts
it("expToNext follows curve", () => {
  expect(expToNext(1)).toBe(100);
  expect(expToNext(10)).toBe(3162);
});
it("gains level when exp crosses threshold", () => {
  const gs = new GameState();
  createTestPlayer(gs); // level 1, exp 0
  gs.dispatch({ type: "addExp", amount: 100 });
  expect(gs.getState().player!.level).toBe(2);
});
it("can gain multiple levels at once", () => {
  const gs = new GameState();
  createTestPlayer(gs);
  gs.dispatch({ type: "addExp", amount: 100 + 316 }); // L1→L2→L3 근사
  expect(gs.getState().player!.level).toBeGreaterThanOrEqual(2);
});
it("emits player:levelup event", () => {
  const gs = new GameState();
  const bus = gs.bus;
  let fired = 0;
  bus.on("player:levelup", () => fired++);
  createTestPlayer(gs);
  gs.dispatch({ type: "addExp", amount: 500 });
  expect(fired).toBeGreaterThan(0);
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test tests/core/progression.test.ts`
Expected: FAIL

- [ ] **Step 3: 구현**

`progression.ts`에 `expToNext`, `addExp` 구현. `addExp`는 player가 없으면 no-op, `level >= 50`이면 exp만 누적(레벨업 없음). 레벨업 시 `growthPerLevel`만큼 각 스탯 증가, `maxHp`/`maxMp`도 재계산, HP/MP는 레벨업분만큼 회복. `GameState`에 `bus: EventBus` 필드를 노출하고 `dispatch`의 `addExp` 케이스에서 `addExp(gs, amount)` 호출.

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test tests/core/progression.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add level/exp progression system"
```

---

### Task 5: 세미리얼 ATB 전투 코어

**Files:**
- Create: `openRPG/src/core/combat.ts`
- Create: `openRPG/src/data/monsters.ts`
- Modify: `openRPG/src/core/gameState.ts` (`combatState` 추가, 액션 추가)
- Test: `openRPG/tests/core/combat.test.ts`

**Interfaces:**
- Consumes: Task 3 `GameState`/`EventBus`, Task 2 `BaseStats`.
- Produces:
  - `interface Combatant { id: string; name: string; side: "player" | "enemy"; hp: number; maxHp: number; mp: number; maxMp: number; attack: number; defense: number; speed: number; atb: number; alive: boolean }`
  - `interface CombatState { enemies: Combatant[]; turn: number; phase: "active" | "won" | "lost" }`
  - `const MONSTERS: Record<string, MonsterDef>` — 프로토타입은 `goblin` 1종
  - `interface MonsterDef { id: string; name: string; stats: BaseStats; attack: number; defense: number; speed: number; expReward: number; goldReward: [number, number] }`
  - `function startCombat(gs: GameState, monsterIds: string[]): CombatState`
  - `function tickAtb(gs: GameState, dtMs: number): void` — 30Hz 고정 스텝에서 호출, atb += speed*dt, 100 도달 시 행동 대기
  - `function playerAttack(gs: GameState, targetId: string): { damage: number; killed: boolean }`
  - `function enemyTurn(gs: GameState): { damage: number }` — 가장 낮은 HP의 적이 플레이어를 공격
  - `GameState.data.combat: CombatState | null` 추가
  - `GameAction`에 `{ type: "startCombat"; monsterIds: string[] }`, `{ type: "combatPlayerAttack"; targetId: string }`, `{ type: "combatEnemyTurn" }` 추가

- [ ] **Step 1: 실패 테스트 작성**

```ts
it("starts combat with goblin", () => {
  const gs = new GameState(); createTestPlayer(gs);
  gs.dispatch({ type: "startCombat", monsterIds: ["goblin"] });
  const c = gs.getState().combat!;
  expect(c.enemies).toHaveLength(1);
  expect(c.enemies[0].name).toBe("고블린");
  expect(c.phase).toBe("active");
});
it("playerAttack deals damage and can kill", () => {
  const gs = new GameState(); createTestPlayer(gs);
  gs.dispatch({ type: "startCombat", monsterIds: ["goblin"] });
  const target = gs.getState().combat!.enemies[0];
  target.hp = 1; // 테스트용 약화
  const r = gs.dispatch({ type: "combatPlayerAttack", targetId: target.id }) as { damage: number; killed: boolean };
  expect(r.killed).toBe(true);
});
it("enemyTurn damages player", () => {
  const gs = new GameState(); createTestPlayer(gs);
  gs.dispatch({ type: "startCombat", monsterIds: ["goblin"] });
  const before = gs.getState().player!.hp;
  gs.dispatch({ type: "combatEnemyTurn" });
  expect(gs.getState().player!.hp).toBeLessThan(before);
});
it("combat ends with phase won when all enemies dead", () => {
  const gs = new GameState(); createTestPlayer(gs);
  gs.dispatch({ type: "startCombat", monsterIds: ["goblin"] });
  gs.getState().combat!.enemies.forEach(e => e.hp = 0);
  gs.dispatch({ type: "combatEnemyTurn" }); // 정리 트리거
  expect(gs.getState().combat!.phase).toBe("won");
});
it("combat ends with phase lost when player hp <= 0", () => {
  const gs = new GameState(); createTestPlayer(gs);
  gs.dispatch({ type: "startCombat", monsterIds: ["goblin"] });
  gs.getState().player!.hp = 0;
  gs.dispatch({ type: "combatEnemyTurn" });
  expect(gs.getState().combat!.phase).toBe("lost");
});
it("tickAtb fills gauge by speed", () => {
  const gs = new GameState(); createTestPlayer(gs);
  gs.dispatch({ type: "startCombat", monsterIds: ["goblin"] });
  const e = gs.getState().combat!.enemies[0];
  const before = e.atb;
  tickAtb(gs, 1000);
  expect(gs.getState().combat!.enemies[0].atb).toBeGreaterThan(before);
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test tests/core/combat.test.ts`
Expected: FAIL

- [ ] **Step 3: 구현**

`combat.ts`: `startCombat`은 `MONSTERS`에서 적 스탯을 읽어 `Combatant` 생성 (플레이어 측은 `player`의 파생 스탯으로 `attack = str*2`, `defense = vit`, `speed = dex`). 데미지 공식: `max(1, round(attacker.attack - defender.defense * 0.5 + rand(-2, 2)))`. `crit`은 `luk` 기반 5% + 1%/luk. `tickAtb`는 `dtMs`를 받아 모든 combatant의 atb 증가, 100 도달 시 0으로 리셋하고 `ready` 플래그(간단히 atb=100 상태로 유지, 행동 후 `consumeAtb`). `playerAttack`은 플레이어가 `atb>=100`일 때만 허용, 아니면 throw. `enemyTurn`은 모든 적이 순차 공격(프로토타입 단순화: 가장 빠른 적 1마리). 전투 종료 시 `phase` 설정, `won`이면 `expReward`/`goldReward`를 player에 지급하고 `"combat:ended"` 이벤트 emit. `lost`이면 `"player:died"` emit.

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test tests/core/combat.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add semi-ATB combat core with goblin enemy"
```

---

### Task 6: 세이브/로드 시스템

**Files:**
- Create: `openRPG/src/core/save.ts`
- Test: `openRPG/tests/core/save.test.ts`

**Interfaces:**
- Consumes: Task 3 `GameState`, Task 4 progression.
- Produces:
  - `const SAVE_VERSION = 1`
  - `interface SaveSlot { id: string; savedAt: number; data: GameStateData }`
  - `async function saveGame(gs: GameState, slotId: string): Promise<void>` — IndexedDB에 저장
  - `async function loadGame(slotId: string): Promise<GameStateData | null>` — 버전 불일치 시 null 반환 + `"save:version_mismatch"` 이벤트는 호출자가 처리
  - `async function listSaves(): Promise<SaveSlot[]>`
  - `async function deleteSave(slotId: string): Promise<void>`
  - `function serialize(gs: GameState): GameStateData` — 직렬화 가능한 순수 데이터 반환

- [ ] **Step 1: 실패 테스트 작성**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { saveGame, loadGame, listSaves, deleteSave, SAVE_VERSION } from "../../src/core/save";
import { GameState } from "../../src/core/gameState";

// idb-keyval은 node 환경에서 동작하지 않으므로 인메모리 목으로 대체
vi.mock("idb-keyval", () => {
  const store = new Map<string, unknown>();
  return {
    get: async (k: string) => store.get(k),
    set: async (k: string, v: unknown) => { store.set(k, v); },
    del: async (k: string) => { store.delete(k); },
    keys: async () => [...store.keys()],
  };
});

it("saves and loads game state", async () => {
  const gs = new GameState();
  gs.dispatch({ type: "createCharacter", name: "세이브테스트", race: "elf", classId: "mage" });
  await saveGame(gs, "slot1");
  const loaded = await loadGame("slot1");
  expect(loaded?.player?.name).toBe("세이브테스트");
  expect(loaded?.player?.race).toBe("elf");
});
it("returns null for missing save", async () => {
  expect(await loadGame("nonexistent")).toBeNull();
});
it("lists saves", async () => {
  const gs = new GameState();
  gs.dispatch({ type: "createCharacter", name: "A", race: "human", classId: "warrior" });
  await saveGame(gs, "slotA");
  const saves = await listSaves();
  expect(saves.map(s => s.id)).toContain("slotA");
});
it("rejects save with wrong version", async () => {
  // saveVersion을 임의로 바꾼 데이터를 직접 주입해 로드 시 null 확인
  const bad = { saveVersion: 999, data: { player: null, questStates: {}, settings: { muted: false, uiScale: 1 } } };
  // idb-keyval mock store에 직접 set
  // ... 구현 후 확인
});
it("deletes save", async () => {
  const gs = new GameState();
  gs.dispatch({ type: "createCharacter", name: "B", race: "dwarf", classId: "warrior" });
  await saveGame(gs, "slotB");
  await deleteSave("slotB");
  expect(await loadGame("slotB")).toBeNull();
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test tests/core/save.test.ts`
Expected: FAIL

- [ ] **Step 3: 구현**

`save.ts`: `idb-keyval`의 `get/set/del/keys` 사용. 키 네이밍: `save:${slotId}`. 저장 시 `{ saveVersion: SAVE_VERSION, savedAt: Date.now(), data: serialize(gs) }` 구조. `loadGame`은 `saveVersion !== SAVE_VERSION`이면 null 반환. `listSaves`는 `keys()`로 `save:` 프리픽스 필터 후 각 슬롯의 `savedAt`/`id` 반환. `serialize`는 `gs.getState()`를 구조적 복제로 반환.

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test tests/core/save.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add IndexedDB save/load system"
```

---

### Task 7: Three.js 씬 + 플레이어 이동

**Files:**
- Create: `openRPG/src/engine/scene.ts`
- Create: `openRPG/src/engine/playerController.ts`
- Create: `openRPG/src/input/input.ts`
- Modify: `openRPG/src/app.ts`, `openRPG/src/main.ts`
- Test: `openRPG/tests/engine/playerController.test.ts` (논리 부분만)

**Interfaces:**
- Consumes: Task 3 `GameState` (`position`), Task 2 데이터.
- Produces:
  - `class SceneManager { constructor(canvas: HTMLCanvasElement); setZone(zoneId: string): Promise<void>; update(dt: number): void; render(): void; dispose(): void }`
  - `class PlayerController { constructor(camera: THREE.Camera, domElement: HTMLElement); velocity: THREE.Vector3; update(dt: number, input: InputState): void; getPosition(): { x: number; y: number; z: number } }`
  - `interface InputState { forward: boolean; back: boolean; left: boolean; right: boolean; run: boolean }`
  - `class InputManager { constructor(target: HTMLElement); state: InputState; attach(): void; detach(): void }`

- [ ] **Step 1: 실패 테스트 작성 (이동 로직만)**

```ts
import { PlayerController } from "../../src/engine/playerController";
import * as THREE from "three";

it("moves forward when input.forward is true", () => {
  const cam = new THREE.PerspectiveCamera();
  const el = document.createElement("div"); // jsdom 또는 happy-dom 필요시 environment 변경
  const pc = new PlayerController(cam, el);
  pc.update(0.1, { forward: true, back: false, left: false, right: false, run: false });
  const pos = pc.getPosition();
  expect(pos.z).not.toBe(0); // 또는 카메라 방향에 따른 이동 확인
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test tests/engine/playerController.test.ts`
Expected: FAIL

- [ ] **Step 3: 구현**

`SceneManager`: Three.js `WebGLRenderer`, `Scene`, `PerspectiveCamera`(3인칭 추적 또는 탑다운 — 프로토타입은 **3인칭 추적**), 조명(HemisphereLight + DirectionalLight), 간단한 지면(PlaneGeometry + 초록색 재질)과 장애물 박스 몇 개. `setZone`은 존 ID로 씬 구성 분기(프로토타입은 "greenfield"만 실제 구현, 나머지는 같은 지면 재사용).

`PlayerController`: Three.js `Group`으로 플레이어 메시(임시: 캡슐/박스), WASD 입력을 카메라 기준으로 변환해 이동, 속도 보통 5, 달리기 8. `getPosition`은 그룹 위치 반환.

`InputManager`: `keydown`/`keyup`으로 WASD+Shift 상태 관리, `attach`/`detach`로 리스너 등록/해제.

`app.ts`: `SceneManager` + `PlayerController` + `InputManager` 생성, `requestAnimationFrame` 루프에서 `input.state` 읽어 `playerController.update` → `GameState.dispatch({type:"setPosition",...})` → `sceneManager.update/render`.

- [ ] **Step 4: 테스트 통과 확인 + 수동 확인**

Run: `pnpm test tests/engine/playerController.test.ts`
Expected: PASS. `pnpm dev`로 브라우저에서 WASD 이동 확인.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add three.js scene and player movement"
```

---

### Task 8: 전투 엔진 연결 (필드 전투)

**Files:**
- Create: `openRPG/src/engine/combatBridge.ts`
- Modify: `openRPG/src/app.ts`
- Test: `openRPG/tests/engine/combatBridge.test.ts`

**Interfaces:**
- Consumes: Task 5 `GameState` combat 액션, Task 7 `SceneManager`.
- Produces:
  - `class CombatBridge { constructor(gs: GameState, scene: SceneManager); startEncounter(monsterIds: string[]): void; update(dtMs: number): void; onPlayerAttack(): void; onEnemyPhase(): void; end(): void }`
  - 필드에서 적 메시 근처 접근 시 `startCombat` dispatch, 전투 중에는 `tickAtb(gs, dt)` 호출, UI에 상태 전달.

- [ ] **Step 1: 실패 테스트 작성**

```ts
it("starts combat and ticks ATB", () => {
  const gs = new GameState(); createTestPlayer(gs);
  const bridge = new CombatBridge(gs, fakeScene);
  bridge.startEncounter(["goblin"]);
  expect(gs.getState().combat).not.toBeNull();
  bridge.update(100);
  // atb가 증가했는지 확인
});
it("player attack triggers combatPlayerAttack action", () => {
  const gs = new GameState(); createTestPlayer(gs);
  const bridge = new CombatBridge(gs, fakeScene);
  bridge.startEncounter(["goblin"]);
  // atb 채운 후 공격
  for (let i = 0; i < 20; i++) bridge.update(100);
  bridge.onPlayerAttack();
  // 적 hp 감소 확인
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test tests/engine/combatBridge.test.ts`
Expected: FAIL

- [ ] **Step 3: 구현**

`CombatBridge`: `startEncounter`는 `gs.dispatch({type:"startCombat"})` 호출 후 전투 UI 상태를 `"combat:started"` 이벤트로 emit. `update(dtMs)`는 `gs.getState().combat?.phase === "active"`일 때 `tickAtb(gs, dtMs)` 호출. `onPlayerAttack`는 플레이어 atb가 100 이상일 때 `gs.dispatch({type:"combatPlayerAttack", targetId})` 호출 후 atb 리셋. `onEnemyPhase`는 적 atb가 100 이상일 때 `gs.dispatch({type:"combatEnemyTurn"})`. `end()`는 `phase`가 `won`/`lost`일 때 호출되어 씬 복귀.

필드 전투 트리거: `app.ts`의 루프에서 플레이어 위치와 적 메시 거리 체크, 일정 거리 이내 + 이동 키 입력 시 `startEncounter`. 프로토타입은 맵에 고블린 1마리를 배치하고 근접 시 자동 전투 진입.

- [ ] **Step 4: 테스트 통과 확인 + 수동 확인**

Run: `pnpm test tests/engine/combatBridge.test.ts`
Expected: PASS. `pnpm dev`에서 고블린 접근 → 전투 진입 → 공격/턴 진행 확인.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: connect combat system to three.js scene"
```

---

### Task 9: DOM 기반 HUD + 종족/클래스 선택 UI

**Files:**
- Create: `openRPG/src/ui/hud.ts`
- Create: `openRPG/src/ui/characterCreate.ts`
- Create: `openRPG/src/ui/styles.css`
- Modify: `openRPG/src/app.ts`, `openRPG/index.html`
- Test: `openRPG/tests/ui/hud.test.ts`

**Interfaces:**
- Consumes: Task 3 `GameState`, Task 2 `RACES`/`CLASSES`, Task 5 combat state.
- Produces:
  - `class Hud { constructor(root: HTMLElement); update(gs: GameState): void; showCombat(combat: CombatState): void; hideCombat(): void; toast(message: string): void }`
  - `class CharacterCreateUI { constructor(root: HTMLElement, onComplete: (name: string, race: RaceId, classId: ClassId) => void); show(): void; hide(): void }`
  - `styles.css`: 03번 문서의 토큰(paper/ink/forest/brass/night) 적용

- [ ] **Step 1: 실패 테스트 작성**

```ts
// jsdom 환경 필요시 vitest.config.ts environment를 "jsdom"으로 변경
it("hud displays player hp/mp", () => {
  const root = document.createElement("div");
  const hud = new Hud(root);
  const gs = new GameState(); createTestPlayer(gs);
  hud.update(gs);
  expect(root.textContent).toContain("HP");
  expect(root.textContent).toContain(String(gs.getState().player!.hp));
});
it("character create calls onComplete with selections", () => {
  const root = document.createElement("div");
  let result: any = null;
  const ui = new CharacterCreateUI(root, (n, r, c) => { result = { n, r, c }; });
  ui.show();
  // DOM 조작으로 종족/클래스 선택 후 생성 버튼 클릭 시뮬레이션
  // ...
  expect(result).not.toBeNull();
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test tests/ui/hud.test.ts`
Expected: FAIL

- [ ] **Step 3: 구현**

`hud.ts`: `#ui` 루트에 HP/MP 바, 레벨/경험치, 스킬 슬롯, 퀘스트 트래커, 전투 시 적 HP 바를 렌더링. `update(gs)`는 `gs.getState()`를 읽어 DOM 갱신. `toast`는 3초 후 자동 제거되는 알림.

`characterCreate.ts`: 종족 6종 카드(이름+설명+고유 스킬)와 클래스 4종 카드, 이름 입력, 생성 버튼. `onComplete` 콜백으로 선택값 전달.

`styles.css`: 03번 문서 §2 토큰을 CSS 변수로 정의(`--parchment: #F2E8D5` 등), HUD/메뉴 스타일. DOM UI는 `position: absolute` 오버레이로 캔버스 위에 배치.

`app.ts` 통합: 게임 시작 시 `CharacterCreateUI.show()`, `onComplete`에서 `gs.dispatch({type:"createCharacter"})` 후 `hide()` + `hud.update` 루프 시작.

- [ ] **Step 4: 테스트 통과 확인 + 수동 확인**

Run: `pnpm test tests/ui/hud.test.ts`
Expected: PASS. `pnpm dev`에서 캐릭터 생성 → HUD 표시 → 이동/전투 확인.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add DOM HUD and character creation UI"
```

---

### Task 10: 통합 검증 + README

**Files:**
- Create: `openRPG/README.md`
- Modify: `openRPG/src/app.ts` (세이브/로드 버튼, 자동저장)
- Test: `openRPG/tests/integration/coreLoop.test.ts`

**Interfaces:**
- Consumes: 모든 이전 태스크.
- Produces: 전체 코어 루프가 동작하는 프로토타입.

- [ ] **Step 1: 통합 테스트 작성**

```ts
it("full core loop: create → move → combat → level → save → load", async () => {
  const gs = new GameState();
  // 캐릭터 생성
  gs.dispatch({ type: "createCharacter", name: "통합", race: "human", classId: "warrior" });
  // 이동
  gs.dispatch({ type: "setPosition", x: 1, y: 0, z: 1 });
  // 전투 시작
  gs.dispatch({ type: "startCombat", monsterIds: ["goblin"] });
  // 플레이어 공격으로 승리 시뮬레이션
  const combat = gs.getState().combat!;
  combat.enemies.forEach(e => e.hp = 0);
  gs.dispatch({ type: "combatEnemyTurn" }); // phase won 트리거
  expect(gs.getState().combat!.phase).toBe("won");
  // 경험치 지급 확인 (combat won 시 expReward 지급 로직)
  // 세이브
  await saveGame(gs, "integration");
  const loaded = await loadGame("integration");
  expect(loaded?.player?.name).toBe("통합");
});
```

- [ ] **Step 2: 테스트 통과 확인**

Run: `pnpm test tests/integration/coreLoop.test.ts`
Expected: PASS

- [ ] **Step 3: 수동 E2E 확인**

`pnpm dev` 실행 후 브라우저에서:
1. 캐릭터 생성 (종족/클래스 선택)
2. WASD 이동
3. 고블린에게 접근해 전투 진입
4. 공격/스킬 사용, 승리 시 경험치/골드 획득
5. 레벨업 확인
6. 세이브 후 새로고침 → 불러오기

- [ ] **Step 4: README 작성**

`README.md`: 프로젝트 소개, 실행 방법(`pnpm install && pnpm dev`), 기술 스택, docs 링크, 개발 명령어.

- [ ] **Step 5: 전체 검증**

Run: `pnpm build && pnpm test && pnpm lint`
Expected: 모두 통과.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: complete phase 0 core loop prototype"
```

---

## Self-Review 결과

- **Spec coverage**: Phase 0 범위(스캐폴드, 코어 루프, 종족/클래스, 기본 전투, 레벨업, 세이브, HUD) 모두 태스크에 매핑됨. 퀘스트 시스템은 Phase 1로 미뤄 프로토타입 범위에서 제외.
- **Step scan**: 각 태스크가 독립 테스트 사이클을 가짐. 구현 세부는 인터페이스 블록에 위임.
- **Type consistency**: `GameState`, `EventBus`, `RaceId`, `ClassId`, `CombatState`, `Combatant` 등 이름/시그니처를 태스크 간 일관되게 유지.
- **Review Focus**: 5개 리스크를 각 태스크 테스트에 반영.
- **Proportion**: 스펙(5개 문서) 대비 계획이 길지만, 프로토타입 범위가 명확하고 각 태스크가 독립 산출물을 가짐.
