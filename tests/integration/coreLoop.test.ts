import { describe, it, expect, vi } from "vitest";
import { GameState } from "../../src/core/gameState";
import { saveGame, loadGame } from "../../src/save/save";

// idb-keyval은 브라우저 전용이므로 인메모리 목으로 대체
const store = vi.hoisted(() => new Map<string, unknown>());
vi.mock("idb-keyval", () => {
  return {
    get: async (k: string) => store.get(k),
    set: async (k: string, v: unknown) => {
      store.set(k, v);
    },
    del: async (k: string) => {
      store.delete(k);
    },
    keys: async () => [...store.keys()],
  };
});

describe("core loop integration", () => {
  it("full core loop: create → move → combat → level → save → load", async () => {
    const gs = new GameState();

    // 캐릭터 생성
    gs.dispatch({
      type: "createCharacter",
      name: "통합",
      race: "human",
      classId: "warrior",
    });
    expect(gs.getState().player?.name).toBe("통합");

    // 이동
    gs.dispatch({ type: "setPosition", x: 1, y: 0, z: 1 });
    expect(gs.getState().player?.position).toMatchObject({ x: 1, z: 1 });

    // 전투 시작 → 승리 시뮬레이션 (경험치/골드 지급)
    gs.dispatch({ type: "startCombat", monsterIds: ["goblin"] });
    const combat = gs.getState().combat!;
    expect(combat.phase).toBe("active");
    combat.enemies.forEach((e) => {
      e.hp = 0;
      e.alive = false;
    });
    gs.dispatch({ type: "combatEnemyTurn" });
    expect(gs.getState().combat!.phase).toBe("won");
    expect(gs.getState().player!.exp).toBeGreaterThan(0);
    expect(gs.getState().player!.gold).toBeGreaterThan(0);

    // 세이브 → 새 GameState에 로드
    await saveGame(gs, "integration");
    const loaded = await loadGame("integration");
    expect(loaded?.player?.name).toBe("통합");

    const gs2 = new GameState();
    gs2.dispatch({ type: "loadState", data: { ...loaded!, combat: null } });
    const p2 = gs2.getState().player!;
    expect(p2.name).toBe("통합");
    expect(p2.exp).toBe(gs.getState().player!.exp);
    expect(p2.gold).toBe(gs.getState().player!.gold);
    expect(p2.position).toMatchObject({ x: 1, z: 1 });
  });

  it("combat ended mid-save loads without active combat", async () => {
    const gs = new GameState();
    gs.dispatch({
      type: "createCharacter",
      name: "로드",
      race: "elf",
      classId: "mage",
    });
    gs.dispatch({ type: "startCombat", monsterIds: ["goblin"] });
    await saveGame(gs, "midcombat");

    const loaded = await loadGame("midcombat");
    const gs2 = new GameState();
    gs2.dispatch({
      type: "loadState",
      data: { ...loaded!, combat: null },
    });
    expect(gs2.getState().combat).toBeNull();
    expect(gs2.getState().player?.name).toBe("로드");
  });
});
