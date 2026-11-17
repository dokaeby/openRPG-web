import { getClass } from "../data";
import type { EquipSlot, StatKey } from "../data/items";
import { getItem } from "../data/items";
import type { PlayerState } from "./gameState";

export interface UseItemResult {
  ok: boolean;
  reason?: string;
  healedHp?: number;
  healedMp?: number;
}

export interface EquipItemResult {
  ok: boolean;
  reason?: string;
  swapped?: string;
}

export interface UnequipItemResult {
  ok: boolean;
  reason?: string;
  swapped?: string;
}

export function addItem(
  player: PlayerState,
  itemId: string,
  count = 1,
): void {
  getItem(itemId); // 존재 검증 (없으면 throw)
  if (count <= 0) return;
  const existing = player.inventory.find((s) => s.itemId === itemId);
  if (existing) {
    existing.count += count;
  } else {
    player.inventory.push({ itemId, count });
  }
}

export function removeItem(
  player: PlayerState,
  itemId: string,
  count = 1,
): boolean {
  if (count <= 0) return false;
  const idx = player.inventory.findIndex((s) => s.itemId === itemId);
  if (idx === -1) return false;
  const stack = player.inventory[idx];
  if (stack.count < count) return false;
  stack.count -= count;
  if (stack.count === 0) {
    player.inventory.splice(idx, 1);
  }
  return true;
}

export function countItem(player: PlayerState, itemId: string): number {
  return player.inventory
    .filter((s) => s.itemId === itemId)
    .reduce((sum, s) => sum + s.count, 0);
}

export function useItem(player: PlayerState, itemId: string): UseItemResult {
  const def = getItem(itemId);
  if (def.type !== "consumable") {
    return { ok: false, reason: "사용할 수 없는 아이템입니다" };
  }
  const healHp = Math.max(0, Math.min(def.healHp ?? 0, player.maxHp - player.hp));
  const healMp = Math.max(0, Math.min(def.healMp ?? 0, player.maxMp - player.mp));
  if (healHp === 0 && healMp === 0) {
    return { ok: false, reason: "이미 체력과 마나가 가득 찼습니다" };
  }
  if (!removeItem(player, itemId, 1)) {
    return { ok: false, reason: "아이템이 부족합니다" };
  }
  player.hp += healHp;
  player.mp += healMp;
  return { ok: true, healedHp: healHp, healedMp: healMp };
}

export function equipItem(
  player: PlayerState,
  itemId: string,
): EquipItemResult {
  const def = getItem(itemId);
  if (def.type !== "equipment" || !def.slot) {
    return { ok: false, reason: "장착할 수 없는 아이템입니다" };
  }
  const slot: EquipSlot = def.slot;

  if (def.weaponType) {
    const cls = getClass(player.classId);
    if (!cls.weaponTypes.includes(def.weaponType)) {
      return {
        ok: false,
        reason: `이 직업은 ${def.weaponType}(으)로 장착할 수 없습니다`,
      };
    }
  }

  if (!removeItem(player, itemId, 1)) {
    return { ok: false, reason: "아이템이 없습니다" };
  }

  const prev = player.equipment[slot];
  player.equipment[slot] = itemId;
  if (prev) {
    addItem(player, prev, 1);
  }
  return { ok: true, swapped: prev };
}

export function unequipItem(
  player: PlayerState,
  slot: EquipSlot,
): UnequipItemResult {
  const itemId = player.equipment[slot];
  if (!itemId) {
    return { ok: false, reason: "장착된 아이템이 없습니다" };
  }
  delete player.equipment[slot];
  addItem(player, itemId, 1);
  return { ok: true, swapped: itemId };
}

export function equipmentBonuses(player: PlayerState): Record<string, number> {
  const bonuses: Partial<Record<StatKey, number>> = {};
  for (const itemId of Object.values(player.equipment)) {
    if (!itemId) continue;
    const def = getItem(itemId);
    if (!def.statBonus) continue;
    for (const [key, value] of Object.entries(def.statBonus)) {
      const statKey = key as StatKey;
      bonuses[statKey] = (bonuses[statKey] ?? 0) + (value ?? 0);
    }
  }
  return bonuses as Record<string, number>;
}
