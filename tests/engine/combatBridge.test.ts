import { describe, expect, it } from "vitest";
import { CombatBridge } from "../../src/engine/combatBridge";
import type { SceneManager } from "../../src/engine/scene";
import { GameState } from "../../src/core/gameState";

function makeBridge() {
  const gs = new GameState();
  gs.dispatch({
    type: "createCharacter",
    name: "T",
    race: "human",
    classId: "warrior",
  });
  const added: unknown[] = [];
  const removed: unknown[] = [];
  const fakeScene = {
    addToZone: (o: unknown) => added.push(o),
    removeFromZone: (o: unknown) => removed.push(o),
  } as unknown as SceneManager;
  return { gs, bridge: new CombatBridge(gs, fakeScene), added, removed };
}

describe("CombatBridge", () => {
  it("starts combat and ticks ATB", () => {
    const { gs, bridge, added } = makeBridge();
    bridge.startEncounter(["goblin"]);

    const combat = gs.getState().combat;
    expect(combat).not.toBeNull();
    expect(combat!.phase).toBe("active");
    expect(combat!.enemies).toHaveLength(1);
    expect(bridge.enemyMeshes.size).toBe(1);
    expect(added).toHaveLength(1);

    const enemy = combat!.enemies[0];
    const before = enemy.atb;
    bridge.update(100);
    expect(enemy.atb).toBeGreaterThan(before);
  });

  it("player attack triggers combatPlayerAttack", () => {
    const { gs, bridge } = makeBridge();
    bridge.startEncounter(["goblin"]);

    const combat = gs.getState().combat!;
    const enemy = combat.enemies[0];
    const hpBefore = enemy.hp;

    combat.player.atb = 100;
    expect(bridge.canPlayerAct()).toBe(true);
    bridge.onPlayerAttack();

    expect(enemy.hp).toBeLessThan(hpBefore);
    expect(combat.player.atb).toBe(0);
  });

  it("enemy turn reduces player hp", () => {
    const { gs, bridge } = makeBridge();
    bridge.startEncounter(["goblin"]);

    const combat = gs.getState().combat!;
    const hpBefore = gs.getState().player!.hp;

    combat.enemies[0].atb = 100;
    bridge.onEnemyPhase();

    expect(gs.getState().player!.hp).toBeLessThan(hpBefore);
    expect(combat.enemies[0].atb).toBe(0);
  });

  it("end clears combat visuals on won phase", () => {
    const { gs, bridge, removed } = makeBridge();
    bridge.startEncounter(["goblin"]);

    const combat = gs.getState().combat!;
    combat.enemies[0].hp = 0;
    combat.enemies[0].alive = false;
    gs.dispatch({ type: "combatEnemyTurn" });

    expect(combat.phase).toBe("won");
    expect(bridge.enemyMeshes.size).toBe(1);

    bridge.update(0);

    expect(bridge.enemyMeshes.size).toBe(0);
    expect(removed).toHaveLength(1);
    expect(bridge.canPlayerAct()).toBe(false);
  });
});
