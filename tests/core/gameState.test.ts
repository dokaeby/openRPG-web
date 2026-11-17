import { describe, it, expect } from "vitest";
import { GameState } from "../../src/core/gameState";

describe("GameState", () => {
  it("creates character with race/class stats applied", () => {
    const gs = new GameState();
    gs.dispatch({
      type: "createCharacter",
      name: "테스트",
      race: "orc",
      classId: "warrior",
    });
    const p = gs.getState().player!;
    expect(p.race).toBe("orc");
    expect(p.level).toBe(1);
    expect(p.maxHp).toBeGreaterThan(0);
  });

  it("rejects invalid race/class on createCharacter", () => {
    const gs = new GameState();
    expect(() =>
      gs.dispatch({
        type: "createCharacter",
        name: "x",
        race: "dragon" as never,
        classId: "warrior",
      }),
    ).toThrow();
  });

  it("updates quest state", () => {
    const gs = new GameState();
    gs.dispatch({ type: "setQuestState", questId: "main_001", state: "active" });
    expect(gs.getState().questStates["main_001"]).toBe("active");
  });

  it("golem has zero maxMp", () => {
    const gs = new GameState();
    gs.dispatch({
      type: "createCharacter",
      name: "골렘",
      race: "golem",
      classId: "warrior",
    });
    expect(gs.getState().player!.maxMp).toBe(0);
  });
});
