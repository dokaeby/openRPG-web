import { describe, expect, it } from "vitest";
import {
  choose,
  conditionMet,
  resolveNode,
  startDialogue,
  visibleChoices,
} from "../../src/core/dialogue";
import type { DialogueContext } from "../../src/core/dialogue";
import type { NpcDef } from "../../src/data/npcs";
import { getNpc, NPCS } from "../../src/data/npcs";

function ctx(overrides: Partial<DialogueContext> = {}): DialogueContext {
  return {
    questStates: {},
    level: 1,
    race: "human",
    ...overrides,
  };
}

const TEST_NPC: NpcDef = {
  id: "test",
  name: "테스트",
  role: "테스터",
  zone: "village",
  x: 0,
  y: 0,
  z: 0,
  nodes: [
    {
      id: "start",
      text: "시작",
      choices: [
        { label: "기본", next: "a" },
        {
          label: "퀘스트 진행 중",
          next: "b",
          condition: { questState: { questId: "q1", state: "active" } },
        },
        {
          label: "고레벨 전용",
          next: "c",
          condition: { level: { min: 10 } },
        },
        {
          label: "오크 전용",
          next: "d",
          condition: { race: "orc" },
        },
      ],
    },
    { id: "a", text: "A", choices: [{ label: "끝", action: { type: "close" } }] },
    { id: "b", text: "B", choices: [{ label: "끝", action: { type: "close" } }] },
    { id: "c", text: "C", choices: [{ label: "끝", action: { type: "close" } }] },
    { id: "d", text: "D", choices: [{ label: "끝", action: { type: "close" } }] },
  ],
};

describe("conditionMet", () => {
  it("returns true for undefined condition", () => {
    expect(conditionMet(undefined, ctx())).toBe(true);
  });

  it("matches quest state, treating missing quest as locked", () => {
    const cond = { questState: { questId: "q1", state: "active" as const } };
    expect(conditionMet(cond, ctx())).toBe(false);
    expect(
      conditionMet(cond, ctx({ questStates: { q1: "active" } })),
    ).toBe(true);
    expect(
      conditionMet(
        { questState: { questId: "q1", state: "locked" } },
        ctx(),
      ),
    ).toBe(true);
  });

  it("matches level min/max", () => {
    expect(conditionMet({ level: { min: 5 } }, ctx({ level: 4 }))).toBe(false);
    expect(conditionMet({ level: { min: 5 } }, ctx({ level: 5 }))).toBe(true);
    expect(conditionMet({ level: { max: 3 } }, ctx({ level: 4 }))).toBe(false);
    expect(
      conditionMet({ level: { min: 2, max: 5 } }, ctx({ level: 3 })),
    ).toBe(true);
  });

  it("matches race", () => {
    expect(conditionMet({ race: "orc" }, ctx({ race: "orc" }))).toBe(true);
    expect(conditionMet({ race: "orc" }, ctx({ race: "elf" }))).toBe(false);
    expect(conditionMet({ race: "orc" }, ctx({ race: undefined }))).toBe(false);
  });

  it("requires all specified conditions", () => {
    const cond = {
      questState: { questId: "q1", state: "active" as const },
      level: { min: 5 },
      race: "dwarf" as const,
    };
    const good = ctx({
      questStates: { q1: "active" },
      level: 10,
      race: "dwarf",
    });
    expect(conditionMet(cond, good)).toBe(true);
    expect(
      conditionMet(cond, { ...good, questStates: { q1: "completed" } }),
    ).toBe(false);
  });
});

describe("resolveNode / visibleChoices", () => {
  it("returns null for unknown id or failed node condition", () => {
    expect(resolveNode(TEST_NPC, "nope", ctx())).toBeNull();
    const npc: NpcDef = {
      ...TEST_NPC,
      nodes: [
        { id: "start", text: "x", condition: { race: "elf" }, choices: [] },
        { id: "alt", text: "y", choices: [] },
      ],
    };
    expect(resolveNode(npc, "start", ctx({ race: "human" }))).toBeNull();
    expect(resolveNode(npc, "alt", ctx())).not.toBeNull();
  });

  it("filters choices by condition", () => {
    const start = resolveNode(TEST_NPC, "start", ctx())!;
    const labels = visibleChoices(start, ctx()).map((c) => c.label);
    expect(labels).toEqual(["기본"]);

    const rich = visibleChoices(
      start,
      ctx({
        questStates: { q1: "active" },
        level: 12,
        race: "orc",
      }),
    ).map((c) => c.label);
    expect(rich).toEqual(["기본", "퀘스트 진행 중", "고레벨 전용", "오크 전용"]);
  });
});

describe("startDialogue", () => {
  it("uses the 'start' node when its condition passes", () => {
    const { node } = startDialogue(TEST_NPC, ctx());
    expect(node.id).toBe("start");
  });

  it("falls back to nodes[0] when no 'start' id exists", () => {
    const npc: NpcDef = {
      ...TEST_NPC,
      nodes: TEST_NPC.nodes.filter((n) => n.id !== "start"),
    };
    const { node } = startDialogue(npc, ctx());
    expect(node.id).toBe("a");
  });

  it("skips entry node whose condition fails and picks first passing node", () => {
    const npc: NpcDef = {
      ...TEST_NPC,
      nodes: [
        { id: "start", text: "엘프 전용", condition: { race: "elf" }, choices: [] },
        { id: "mortal", text: "다른 인사", choices: [] },
      ],
    };
    expect(startDialogue(npc, ctx({ race: "elf" })).node.id).toBe("start");
    expect(startDialogue(npc, ctx({ race: "human" })).node.id).toBe("mortal");
  });

  it("works with real NPC data", () => {
    const elder = getNpc("elder");
    const human = startDialogue(elder, ctx({ race: "human" }));
    expect(human.node.id).toBe("greet");
    const orc = startDialogue(elder, ctx({ race: "orc" }));
    expect(orc.node.id).toBe("start");
    const priest = getNpc("elf_priest");
    expect(startDialogue(priest, ctx({ race: "elf" })).node.id).toBe("start");
    expect(startDialogue(priest, ctx({ race: "human" })).node.id).toBe(
      "start_mortal",
    );
    expect(() => getNpc("missing")).toThrow();
    expect(Object.keys(NPCS)).toHaveLength(4);
  });
});

describe("choose", () => {
  it("resolves next node and passes action through", () => {
    const res = choose(
      TEST_NPC,
      "start",
      1,
      ctx({ questStates: { q1: "active" } }),
    );
    expect(res.ended).toBe(false);
    expect(res.node?.id).toBe("b");
  });

  it("skips invisible choices: index maps to visible list", () => {
    // With default ctx only "기본"(index 0) is visible.
    const res = choose(TEST_NPC, "start", 0, ctx());
    expect(res.node?.id).toBe("a");
    // Index 1 is out of range for the visible list.
    const out = choose(TEST_NPC, "start", 1, ctx());
    expect(out.ended).toBe(true);
    expect(out.node).toBeNull();
  });

  it("returns ended with action when choice has no next", () => {
    const res = choose(TEST_NPC, "a", 0, ctx());
    expect(res.ended).toBe(true);
    expect(res.node).toBeNull();
    expect(res.action).toEqual({ type: "close" });
  });

  it("returns ended when next node id does not exist", () => {
    const npc: NpcDef = {
      ...TEST_NPC,
      nodes: [
        {
          id: "start",
          text: "x",
          choices: [{ label: "go", next: "missing", action: { type: "close" } }],
        },
      ],
    };
    const res = choose(npc, "start", 0, ctx());
    expect(res.ended).toBe(true);
    expect(res.node).toBeNull();
    expect(res.action?.type).toBe("close");
  });

  it("ends when current node cannot be resolved", () => {
    const res = choose(TEST_NPC, "ghost", 0, ctx());
    expect(res.ended).toBe(true);
    expect(res.node).toBeNull();
  });

  it("drives a real elder quest-accept flow", () => {
    const elder = getNpc("elder");
    const c = ctx({ race: "human", questStates: { main_001: "available" } });
    const start = startDialogue(elder, c);
    const hub = choose(elder, start.node.id, 0, c);
    expect(hub.node?.id).toBe("hub");
    const accept = choose(elder, "hub", 0, c);
    expect(accept.node?.id).toBe("accepted");
    expect(accept.action).toEqual({ type: "quest.accept", questId: "main_001" });
    const done = choose(elder, "accepted", 0, c);
    expect(done.ended).toBe(true);
    expect(done.action?.type).toBe("close");
  });
});
