import { describe, it, expect } from "vitest";
import { GameState } from "../../src/core/gameState";
import type { PlayerState } from "../../src/core/gameState";
import {
  allocateStat,
  expToNext,
  computeMaxHp,
} from "../../src/core/progression";
import { getClass } from "../../src/data";

function createTestPlayer(gs: GameState): PlayerState {
  gs.dispatch({
    type: "createCharacter",
    name: "테스트",
    race: "human",
    classId: "warrior",
  });
  return gs.getState().player!;
}

describe("level-up stat/skill point grants", () => {
  it("grants 3 stat points and 1 skill point per level", () => {
    const gs = new GameState();
    const player = createTestPlayer(gs);
    expect(player.statPoints).toBe(0);
    expect(player.skillPoints).toBe(0);

    gs.dispatch({ type: "addExp", amount: expToNext(1) });
    expect(player.level).toBe(2);
    expect(player.statPoints).toBe(3);
    expect(player.skillPoints).toBe(1);
  });

  it("accumulates points across multiple levels", () => {
    const gs = new GameState();
    const player = createTestPlayer(gs);

    // L1→L2 needs 100, L2→L3 needs 282 (floor(100*2^1.5)=282)
    gs.dispatch({ type: "addExp", amount: expToNext(1) + expToNext(2) });
    expect(player.level).toBe(3);
    expect(player.statPoints).toBe(6);
    expect(player.skillPoints).toBe(2);
  });

  it("grants no points at level cap", () => {
    const gs = new GameState();
    const player = createTestPlayer(gs);
    player.level = 50;
    player.exp = 0;
    player.statPoints = 7;
    player.skillPoints = 2;

    gs.dispatch({ type: "addExp", amount: 999999 });
    expect(player.statPoints).toBe(7);
    expect(player.skillPoints).toBe(2);
  });
});

describe("allocateStat", () => {
  function leveledPlayer(): { gs: GameState; player: PlayerState } {
    const gs = new GameState();
    const player = createTestPlayer(gs);
    gs.dispatch({ type: "addExp", amount: expToNext(1) });
    return { gs, player };
  }

  it("increases stat and consumes points", () => {
    const { player } = leveledPlayer();
    const before = player.stats.str;
    const result = allocateStat(player, "str", 2);
    expect(result.ok).toBe(true);
    expect(player.stats.str).toBe(before + 2);
    expect(player.statPoints).toBe(1);
  });

  it("recomputes maxHp when vit is allocated", () => {
    const { player } = leveledPlayer();
    const cls = getClass(player.classId);
    const before = player.maxHp;
    allocateStat(player, "vit", 1);
    expect(player.maxHp).toBe(computeMaxHp(cls, player.stats.vit));
    expect(player.maxHp).toBe(before + 10);
    expect(player.hp).toBeLessThanOrEqual(player.maxHp);
  });

  it("fails with insufficient points", () => {
    const { player } = leveledPlayer();
    const result = allocateStat(player, "str", 10);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("스탯 포인트가 부족합니다");
  });

  it("fails for non-allocatable stat", () => {
    const { player } = leveledPlayer();
    const result = allocateStat(player, "hp" as never, 1);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("잘못된 스탯입니다");
  });

  it("fails for zero or negative amount", () => {
    const { player } = leveledPlayer();
    expect(allocateStat(player, "str", 0).reason).toBe(
      "올바르지 않은 수치입니다",
    );
    expect(allocateStat(player, "str", -1).reason).toBe(
      "올바르지 않은 수치입니다",
    );
    expect(allocateStat(player, "str", 1.5).reason).toBe(
      "올바르지 않은 수치입니다",
    );
  });
});
