import { get, set, del, keys } from "idb-keyval";
import type { GameState, GameStateData } from "../core/gameState";

// NOTE: idb-keyval is banned in src/core by ESLint, so save/load lives here.

export const SAVE_VERSION = 1;

const KEY_PREFIX = "save:";

interface SaveEnvelope {
  saveVersion: number;
  savedAt: number;
  data: GameStateData;
}

export interface SaveSlot {
  id: string;
  savedAt: number;
  data: GameStateData;
}

export function serialize(gs: GameState): GameStateData {
  return structuredClone(gs.getState());
}

export async function saveGame(
  gs: GameState,
  slotId: string,
): Promise<void> {
  const envelope: SaveEnvelope = {
    saveVersion: SAVE_VERSION,
    savedAt: Date.now(),
    data: serialize(gs),
  };
  await set(`${KEY_PREFIX}${slotId}`, envelope);
}

export async function loadGame(
  slotId: string,
): Promise<GameStateData | null> {
  const envelope = (await get(`${KEY_PREFIX}${slotId}`)) as
    | SaveEnvelope
    | undefined;
  if (!envelope || envelope.saveVersion !== SAVE_VERSION) {
    return null;
  }
  return envelope.data;
}

export async function listSaves(): Promise<SaveSlot[]> {
  const allKeys = await keys();
  const slots: SaveSlot[] = [];
  for (const key of allKeys) {
    if (typeof key !== "string" || !key.startsWith(KEY_PREFIX)) continue;
    const envelope = (await get(key)) as SaveEnvelope | undefined;
    if (!envelope) continue;
    slots.push({
      id: key.slice(KEY_PREFIX.length),
      savedAt: envelope.savedAt,
      data: envelope.data,
    });
  }
  return slots;
}

export async function deleteSave(slotId: string): Promise<void> {
  await del(`${KEY_PREFIX}${slotId}`);
}
