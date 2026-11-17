import { getClass } from "../data";
import type { BaseStats, ClassDef, RaceId } from "../data";
import type { GameState } from "./gameState";

const LEVEL_CAP = 50;

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
