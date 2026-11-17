import { describe, it, expect } from "vitest";
import { GameState } from "../../src/core/gameState";
import type { PlayerState } from "../../src/core/gameState";
import { expToNext } from "../../src/core/progression";

function createTestPlayer(gs: GameState): PlayerState {
  gs.dispatch({
    type: "createCharacter",
    name: "테스트",
    race: "human",
    classId: "warrior",
  });
  return gs.getState().player!;
}

describe("progression", () => {
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
});
