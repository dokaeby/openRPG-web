import { describe, it, expect } from "vitest";
import { QuestLogUI } from "../../src/ui/questLog";
import type { QuestLogDeps } from "../../src/ui/questLog";
import type { QuestListItem } from "../../src/ui/questLog";
import { QUESTS } from "../../src/data/quests";
import type { QuestDef } from "../../src/data/quests";
import {
  acceptQuest,
  createQuestBook,
} from "../../src/core/quest";
import type { QuestBook } from "../../src/core/quest";

function makeItems(book: QuestBook): QuestListItem[] {
  return Object.values(QUESTS).map((def: QuestDef) => ({
    def,
    entry: book.entries[def.id] ?? null,
    available:
      !book.entries[def.id] &&
      (def.raceId === undefined || def.raceId === "elf"),
  }));
}

function setup(book: QuestBook) {
  const root = document.createElement("div");
  document.body.append(root);
  const actions: { action: "accept" | "abandon"; questId: string }[] = [];
  const deps: QuestLogDeps = {
    getQuests: () => makeItems(book),
    onAction: (action, questId) => actions.push({ action, questId }),
  };
  const log = new QuestLogUI(root, deps);
  return { root, log, actions };
}

describe("QuestLogUI", () => {
  it("renders three Korean sections with quest info and type badges", () => {
    const book = createQuestBook();
    acceptQuest(book, "main_001");
    acceptQuest(book, "race_elf_001", "elf");
    book.entries["side_002"] = { state: "completed", objectiveIndex: 1, counts: [5] };

    const { root, log } = setup(book);
    log.show();

    const text = root.textContent ?? "";
    expect(text).toContain("수락 가능");
    expect(text).toContain("진행 중");
    expect(text).toContain("완료");
    expect(text).toContain("슬라임 청소부"); // completed
    expect(text).toContain("메인");
    expect(text).toContain("종족");

    const panel = root.querySelector<HTMLElement>(".quest-log-panel")!;
    expect(panel.hidden).toBe(false);
  });

  it("accept button fires onAction('accept', id)", () => {
    const book = createQuestBook();
    const { root, log, actions } = setup(book);
    log.show();

    const acceptBtn = Array.from(
      root.querySelectorAll<HTMLButtonElement>(".quest-accept"),
    ).find((b) => b.closest("li")?.textContent?.includes("고블린의 위협"))!;
    acceptBtn.click();

    expect(actions).toEqual([{ action: "accept", questId: "main_001" }]);
  });

  it("abandon button fires onAction('abandon', id) and shows objective progress", () => {
    const book = createQuestBook();
    acceptQuest(book, "main_001");
    book.entries["main_001"].counts[0] = 1;

    const { root, log, actions } = setup(book);
    log.show();

    const text = root.textContent ?? "";
    expect(text).toContain("고블린 처치");
    expect(text).toContain("1/3");

    const abandonBtn = root.querySelector<HTMLButtonElement>(".quest-abandon")!;
    abandonBtn.click();
    expect(actions).toEqual([{ action: "abandon", questId: "main_001" }]);
  });

  it("hide/show toggles panel visibility", () => {
    const book = createQuestBook();
    const { root, log } = setup(book);
    const panel = root.querySelector<HTMLElement>(".quest-log-panel")!;

    expect(panel.hidden).toBe(true);
    log.show();
    expect(panel.hidden).toBe(false);
    log.hide();
    expect(panel.hidden).toBe(true);
    log.toggle();
    expect(panel.hidden).toBe(false);
  });
});
