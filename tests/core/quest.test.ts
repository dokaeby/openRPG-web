import { describe, it, expect } from "vitest";
import {
  acceptQuest,
  abandonQuest,
  availableQuests,
  createQuestBook,
  entryState,
  isQuestAvailable,
  questProgress,
  recordQuestEvent,
} from "../../src/core/quest";
import { getQuest } from "../../src/data/quests";

describe("quest core", () => {
  it("getQuest returns quest and throws on unknown id", () => {
    expect(getQuest("main_001").name).toBe("고블린의 위협");
    expect(() => getQuest("nope")).toThrow();
  });

  it("accepts an available quest and rejects unknown/prereq/race/duplicate", () => {
    const book = createQuestBook();

    // missing prerequisite: main_002 requires main_001
    expect(() => acceptQuest(book, "main_002")).toThrow();
    // race mismatch: race_elf_001 requires elf
    expect(() => acceptQuest(book, "race_elf_001", "human")).toThrow();
    // unknown id
    expect(() => acceptQuest(book, "nope")).toThrow();

    const entry = acceptQuest(book, "main_001");
    expect(entry.state).toBe("active");
    expect(entry.objectiveIndex).toBe(0);
    expect(entry.counts).toEqual([0]);

    // duplicate
    expect(() => acceptQuest(book, "main_001")).toThrow();
    // race quest accepted for elf
    acceptQuest(book, "race_elf_001", "elf");
  });

  it("advances objectives on matching events and completes the quest", () => {
    const book = createQuestBook();
    acceptQuest(book, "main_001");

    // wrong target does nothing
    expect(recordQuestEvent(book, { type: "kill", target: "slime" })).toEqual([]);
    expect(questProgress(book, "main_001")).toEqual({ done: 0, total: 1 });

    recordQuestEvent(book, { type: "kill", target: "goblin", count: 2 });
    expect(questProgress(book, "main_001")).toEqual({ done: 0, total: 1 });

    const completed = recordQuestEvent(book, {
      type: "kill",
      target: "goblin",
    });
    expect(completed.map((q) => q.id)).toEqual(["main_001"]);
    expect(entryState(book, "main_001")).toBe("completed");
    expect(questProgress(book, "main_001")).toEqual({ done: 1, total: 1 });
  });

  it("handles multi-objective quests sequentially", () => {
    const book = createQuestBook();
    // chain: complete main_001 then main_002 to unlock main_003
    acceptQuest(book, "main_001");
    recordQuestEvent(book, { type: "kill", target: "goblin", count: 3 });
    acceptQuest(book, "main_002");
    recordQuestEvent(book, { type: "talk", target: "elder" });
    acceptQuest(book, "main_003");

    // kill objective must finish before collect counts
    recordQuestEvent(book, { type: "collect", target: "wolf_pelt", count: 5 });
    expect(questProgress(book, "main_003")).toEqual({ done: 0, total: 2 });

    recordQuestEvent(book, { type: "kill", target: "wolf", count: 2 });
    expect(questProgress(book, "main_003")).toEqual({ done: 1, total: 2 });

    const done = recordQuestEvent(book, {
      type: "collect",
      target: "wolf_pelt",
      count: 2,
    });
    expect(done.map((q) => q.id)).toEqual(["main_003"]);
  });

  it("completes multiple active quests from one event", () => {
    const book = createQuestBook();
    acceptQuest(book, "main_001"); // kill goblin x3
    acceptQuest(book, "daily_001"); // kill goblin x2

    const completed = recordQuestEvent(book, {
      type: "kill",
      target: "goblin",
      count: 3,
    });
    expect(completed.map((q) => q.id).sort()).toEqual(["daily_001", "main_001"]);
  });

  it("abandon removes only active entries", () => {
    const book = createQuestBook();
    acceptQuest(book, "main_001");
    abandonQuest(book, "main_001");
    expect(book.entries["main_001"]).toBeUndefined();
    // can accept again after abandon
    acceptQuest(book, "main_001");
    // completed entry is not removed
    recordQuestEvent(book, { type: "kill", target: "goblin", count: 3 });
    abandonQuest(book, "main_001");
    expect(book.entries["main_001"].state).toBe("completed");
  });

  it("isQuestAvailable / availableQuests respect prereqs and race", () => {
    const book = createQuestBook();
    const main001 = getQuest("main_001");
    const main002 = getQuest("main_002");
    const elfQuest = getQuest("race_elf_001");

    expect(isQuestAvailable(book, main001)).toBe(true);
    expect(isQuestAvailable(book, main002)).toBe(false);
    expect(isQuestAvailable(book, elfQuest, "human")).toBe(false);
    expect(isQuestAvailable(book, elfQuest, "elf")).toBe(true);

    const availHuman = availableQuests(book, "human").map((q) => q.id);
    expect(availHuman).toContain("main_001");
    expect(availHuman).toContain("side_001");
    expect(availHuman).not.toContain("race_elf_001");
    expect(availHuman).not.toContain("main_002");

    const availElf = availableQuests(book, "elf").map((q) => q.id);
    expect(availElf).toContain("race_elf_001");

    acceptQuest(book, "main_001");
    recordQuestEvent(book, { type: "kill", target: "goblin", count: 3 });
    const after = availableQuests(book).map((q) => q.id);
    expect(after).toContain("main_002");
    expect(after).not.toContain("main_001");
  });

  it("entryState reports available/active/completed/null", () => {
    const book = createQuestBook();
    expect(entryState(book, "main_001")).toBe("available");
    expect(entryState(book, "main_002")).toBeNull();
    acceptQuest(book, "main_001");
    expect(entryState(book, "main_001")).toBe("active");
    recordQuestEvent(book, { type: "kill", target: "goblin", count: 3 });
    expect(entryState(book, "main_001")).toBe("completed");
    expect(entryState(book, "unknown_quest")).toBeNull();
  });
});
