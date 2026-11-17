import { describe, it, expect, vi } from "vitest";
import { set } from "idb-keyval";
import {
  saveGame,
  loadGame,
  listSaves,
  deleteSave,
  serialize,
  SAVE_VERSION,
} from "../../src/save/save";
import { GameState } from "../../src/core/gameState";

// idb-keyval은 node 환경에서 동작하지 않으므로 인메모리 목으로 대체
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

const makeGs = () => {
  const gs = new GameState();
  gs.dispatch({
    type: "createCharacter",
    name: "세이브테스트",
    race: "elf",
    classId: "mage",
  });
  return gs;
};

describe("save/load", () => {
  it("saves and loads game state", async () => {
    const gs = makeGs();
    await saveGame(gs, "slot1");
    const loaded = await loadGame("slot1");
    expect(loaded?.player?.name).toBe("세이브테스트");
    expect(loaded?.player?.race).toBe("elf");
    expect(loaded?.combat).toBeNull();
  });

  it("returns null for missing save", async () => {
    expect(await loadGame("nonexistent")).toBeNull();
  });

  it("lists saves", async () => {
    const gs = new GameState();
    gs.dispatch({
      type: "createCharacter",
      name: "A",
      race: "human",
      classId: "warrior",
    });
    await saveGame(gs, "slotA");
    const saves = await listSaves();
    expect(saves.map((s) => s.id)).toContain("slotA");
    expect(saves.find((s) => s.id === "slotA")?.savedAt).toBeTypeOf("number");
  });

  it("rejects save with wrong version", async () => {
    const bad = {
      saveVersion: 999,
      savedAt: Date.now(),
      data: {
        player: null,
        questStates: {},
        settings: { muted: false, uiScale: 1 },
        combat: null,
      },
    };
    await set("save:badver", bad);
    expect(await loadGame("badver")).toBeNull();
    // 다른 슬롯은 영향 없음
    await saveGame(makeGs(), "goodver");
    expect((await loadGame("goodver"))?.player?.name).toBe("세이브테스트");
  });

  it("deletes save", async () => {
    const gs = new GameState();
    gs.dispatch({
      type: "createCharacter",
      name: "B",
      race: "dwarf",
      classId: "warrior",
    });
    await saveGame(gs, "slotB");
    await deleteSave("slotB");
    expect(await loadGame("slotB")).toBeNull();
  });

  it("serialize returns a structural clone", () => {
    const gs = makeGs();
    const data = serialize(gs);
    expect(data).not.toBe(gs.getState());
    expect(data.player?.name).toBe("세이브테스트");
    data.player!.name = "mutated";
    expect(gs.getState().player?.name).toBe("세이브테스트");
    expect(SAVE_VERSION).toBe(1);
  });
});
