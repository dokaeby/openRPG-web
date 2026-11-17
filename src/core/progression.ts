import { getClass } from "../data";
import type { BaseStats, ClassDef, RaceId } from "../data";
import type { GameState, PlayerState } from "./gameState";

const LEVEL_CAP = 50;

// Level-up grants 3 stat points + 1 skill point (docs/02 §3.1, §3.3).
const STAT_POINTS_PER_LEVEL = 3;
const SKILL_POINTS_PER_LEVEL = 1;

export const ALLOCATABLE_STATS = ["str", "dex", "int", "vit", "luk"] as const;
export type AllocatableStat = (typeof ALLOCATABLE_STATS)[number];

export function expToNext(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.5));
}

export function computeMaxHp(cls: ClassDef, vit: number): number {
  return Math.max(0, cls.baseStats.hp + vit * 10);
}

export function computeMaxMp(
  race: RaceId,
  cls: ClassDef,
  int: number,
): number {
  return race === "golem" ? 0 : Math.max(0, cls.baseStats.mp + int * 5);
}

export function addExp(
  gs: GameState,
  amount: number,
): { levelsGained: number } {
  const player = gs.getState().player;
  if (!player || amount <= 0) {
    return { levelsGained: 0 };
  }

  const cls = getClass(player.classId);
  player.exp += amount;
  let levelsGained = 0;

  while (
    player.level < LEVEL_CAP &&
    player.exp >= expToNext(player.level)
  ) {
    player.exp -= expToNext(player.level);
    player.level += 1;
    levelsGained += 1;

    for (const [key, value] of Object.entries(cls.growthPerLevel)) {
      const statKey = key as keyof BaseStats;
      player.stats[statKey] = Math.max(
        0,
        player.stats[statKey] + (value ?? 0),
      );
    }

    // Level-up grants manual allocation points (docs/02 §3.1, §3.3).
    player.statPoints += STAT_POINTS_PER_LEVEL;
    player.skillPoints += SKILL_POINTS_PER_LEVEL;

    const oldMaxHp = player.maxHp;
    const oldMaxMp = player.maxMp;
    player.maxHp = computeMaxHp(cls, player.stats.vit);
    player.maxMp = computeMaxMp(player.race, cls, player.stats.int);
    // HP/MP recover by the level-up delta, clamped to the new max.
    player.hp = Math.min(player.maxHp, player.hp + (player.maxHp - oldMaxHp));
    player.mp = Math.min(player.maxMp, player.mp + (player.maxMp - oldMaxMp));

    gs.bus.emit("player:levelup", { level: player.level });
  }

  return { levelsGained };
}

export function allocateStat(
  player: PlayerState,
  stat: AllocatableStat,
  amount: number,
): { ok: boolean; reason?: string } {
  if (!(ALLOCATABLE_STATS as readonly string[]).includes(stat)) {
    return { ok: false, reason: "잘못된 스탯입니다" };
  }
  if (!Number.isInteger(amount) || amount <= 0) {
    return { ok: false, reason: "올바르지 않은 수치입니다" };
  }
  if (player.statPoints < amount) {
    return { ok: false, reason: "스탯 포인트가 부족합니다" };
  }

  player.stats[stat] += amount;
  player.statPoints -= amount;

  const cls = getClass(player.classId);
  player.maxHp = computeMaxHp(cls, player.stats.vit);
  player.maxMp = computeMaxMp(player.race, cls, player.stats.int);
  // Allocation only raises caps; never heals, but clamp if a cap dropped.
  player.hp = Math.min(player.hp, player.maxHp);
  player.mp = Math.min(player.mp, player.maxMp);

  return { ok: true };
}
