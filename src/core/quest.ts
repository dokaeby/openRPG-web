import type { QuestDef } from "../data/quests";
import { QUESTS, getQuest } from "../data/quests";

export interface QuestEntry {
  state: "active" | "completed";
  objectiveIndex: number;
  counts: number[];
}

export interface QuestBook {
  entries: Record<string, QuestEntry>;
}

export interface QuestEvent {
  type: string;
  target: string;
  count?: number;
}

export function createQuestBook(): QuestBook {
  return { entries: {} };
}

export function isQuestAvailable(
  book: QuestBook,
  quest: QuestDef,
  race?: string,
): boolean {
  if (book.entries[quest.id]) return false;
  if (quest.raceId && quest.raceId !== race) return false;
  const prereqs = quest.prerequisites ?? [];
  return prereqs.every((pid) => book.entries[pid]?.state === "completed");
}

export function availableQuests(
  book: QuestBook,
  race?: string,
): QuestDef[] {
  return Object.values(QUESTS).filter((quest) =>
    isQuestAvailable(book, quest, race),
  );
}

export function acceptQuest(
  book: QuestBook,
  questId: string,
  race?: string,
): QuestEntry {
  const quest = getQuest(questId);
  if (!isQuestAvailable(book, quest, race)) {
    throw new Error(`Quest is not available: ${questId}`);
  }
  const entry: QuestEntry = {
    state: "active",
    objectiveIndex: 0,
    counts: quest.objectives.map(() => 0),
  };
  book.entries[questId] = entry;
  return entry;
}

export function abandonQuest(book: QuestBook, questId: string): void {
  const entry = book.entries[questId];
  if (entry && entry.state === "active") {
    delete book.entries[questId];
  }
}

export function recordQuestEvent(
  book: QuestBook,
  event: QuestEvent,
): QuestDef[] {
  const completed: QuestDef[] = [];
  for (const [questId, entry] of Object.entries(book.entries)) {
    if (entry.state !== "active") continue;
    const quest = QUESTS[questId];
    if (!quest) continue;
    const obj = quest.objectives[entry.objectiveIndex];
    if (!obj) continue;
    if (obj.type !== event.type || obj.target !== event.target) continue;
    entry.counts[entry.objectiveIndex] += event.count ?? 1;
    while (
      entry.objectiveIndex < quest.objectives.length &&
      entry.counts[entry.objectiveIndex] >=
        quest.objectives[entry.objectiveIndex].count
    ) {
      entry.objectiveIndex += 1;
    }
    if (entry.objectiveIndex >= quest.objectives.length) {
      entry.state = "completed";
      entry.objectiveIndex = quest.objectives.length;
      completed.push(quest);
    }
  }
  return completed;
}

export function questProgress(
  book: QuestBook,
  questId: string,
): { done: number; total: number } | null {
  const entry = book.entries[questId];
  if (!entry) return null;
  const quest = QUESTS[questId];
  if (!quest) return null;
  return {
    done: Math.min(entry.objectiveIndex, quest.objectives.length),
    total: quest.objectives.length,
  };
}

export function entryState(
  book: QuestBook,
  questId: string,
  race?: string,
): "available" | "active" | "completed" | null {
  const entry = book.entries[questId];
  if (entry) return entry.state;
  const quest = QUESTS[questId];
  if (quest && isQuestAvailable(book, quest, race)) return "available";
  return null;
}
