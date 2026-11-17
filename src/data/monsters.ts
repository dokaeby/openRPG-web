import type { BaseStats } from "../core/types";

export interface MonsterDrop {
  itemId: string;
  chance: number; // 0~1
}

export interface MonsterDef {
  id: string;
  name: string;
  stats: BaseStats;
  attack: number;
  defense: number;
  speed: number;
  expReward: number;
  goldReward: [number, number];
  drops?: MonsterDrop[];
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
    drops: [{ itemId: "goblin_ear", chance: 0.4 }],
  },
  slime: {
    id: "slime",
    name: "슬라임",
    stats: { hp: 20, mp: 0, str: 2, dex: 1, int: 0, vit: 1, luk: 2 },
    attack: 5,
    defense: 1,
    speed: 3,
    expReward: 8,
    goldReward: [3, 8],
    drops: [{ itemId: "slime_gel", chance: 0.5 }],
  },
  wolf: {
    id: "wolf",
    name: "숲늑대",
    stats: { hp: 45, mp: 0, str: 5, dex: 6, int: 0, vit: 3, luk: 1 },
    attack: 12,
    defense: 4,
    speed: 8,
    expReward: 22,
    goldReward: [8, 18],
    drops: [{ itemId: "wolf_pelt", chance: 1 }],
  },
  boar: {
    id: "boar",
    name: "멧돼지",
    stats: { hp: 70, mp: 0, str: 6, dex: 2, int: 0, vit: 6, luk: 0 },
    attack: 14,
    defense: 8,
    speed: 4,
    expReward: 30,
    goldReward: [10, 22],
    drops: [{ itemId: "goblin_ear", chance: 0.2 }],
  },
};
