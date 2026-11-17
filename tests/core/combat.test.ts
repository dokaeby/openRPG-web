import { describe, it, expect } from "vitest";
import { GameState } from "../../src/core/gameState";
import { tickAtb } from "../../src/core/combat";

function createTestPlayer(gs: GameState) {
  gs.dispatch({
    type: "createCharacter",
    name: "테스트",
    race: "human",
    classId: "warrior",
  });
}

describe("combat", () => {
  it("starts combat with goblin", () => {
    const gs = new GameState();
    createTestPlayer(gs);
    gs.dispatch({ type: "startCombat", monsterIds: ["goblin"] });
    const c = gs.getState().combat!;
    expect(c.enemies).toHaveLength(1);
    expect(c.enemies[0].name).toBe("고블린");
    expect(c.phase).toBe("active");
  });

  it("playerAttack deals damage and can kill", () => {
    const gs = new GameState();
    createTestPlayer(gs);
    gs.dispatch({ type: "startCombat", monsterIds: ["goblin"] });
    const target = gs.getState().combat!.enemies[0];
    target.hp = 1; // 테스트용 약화
    const r = gs.dispatch({
      type: "combatPlayerAttack",
      targetId: target.id,
    }) as { damage: number; killed: boolean };
    expect(r.killed).toBe(true);
  });

  it("enemyTurn damages player", () => {
    const gs = new GameState();
    createTestPlayer(gs);
    gs.dispatch({ type: "startCombat", monsterIds: ["goblin"] });
    const before = gs.getState().player!.hp;
    gs.dispatch({ type: "combatEnemyTurn" });
    expect(gs.getState().player!.hp).toBeLessThan(before);
  });

  it("combat ends with phase won when all enemies dead", () => {
    const gs = new GameState();
    createTestPlayer(gs);
    gs.dispatch({ type: "startCombat", monsterIds: ["goblin"] });
    gs.getState().combat!.enemies.forEach((e) => (e.hp = 0));
    gs.dispatch({ type: "combatEnemyTurn" }); // 정리 트리거
    expect(gs.getState().combat!.phase).toBe("won");
  });

  it("combat ends with phase lost when player hp <= 0", () => {
    const gs = new GameState();
    createTestPlayer(gs);
    gs.dispatch({ type: "startCombat", monsterIds: ["goblin"] });
    gs.getState().player!.hp = 0;
    gs.dispatch({ type: "combatEnemyTurn" });
    expect(gs.getState().combat!.phase).toBe("lost");
  });

  it("tickAtb fills gauge by speed", () => {
    const gs = new GameState();
    createTestPlayer(gs);
    gs.dispatch({ type: "startCombat", monsterIds: ["goblin"] });
    const e = gs.getState().combat!.enemies[0];
    const before = e.atb;
    tickAtb(gs, 1000);
    expect(gs.getState().combat!.enemies[0].atb).toBeGreaterThan(before);
  });
});
