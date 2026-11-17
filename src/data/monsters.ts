import type { BaseStats } from "../core/types";

export interface MonsterDef {
  id: string;
  name: string;
  stats: BaseStats;
  attack: number;
  defense: number;
  speed: number;
  expReward: number;
  goldReward: [number, number];
}

export const MONSTERS: Record<string, MonsterDef> = {
  goblin: {
    id: "goblin",
    name: "고블린",
    stats: { hp: 30, mp: 0, str: 4, dex: 3, int: 0, vit: 2, luk: 0 },
    attack: 8,
    defense: 3,
    speed: 5,
    expReward: 15,
    goldReward: [5, 15],
  },
};
