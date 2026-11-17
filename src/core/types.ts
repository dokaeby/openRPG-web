export type RaceId = "human" | "elf" | "dwarf" | "orc" | "golem" | "half";

export type ClassId = "warrior" | "mage" | "archer" | "rogue";

export interface BaseStats {
  hp: number;
  mp: number;
  str: number;
  dex: number;
  int: number;
  vit: number;
  luk: number;
}

export interface RaceDef {
  id: RaceId;
  name: string;
  description: string;
  statMods: Partial<BaseStats>;
  passive: {
    id: string;
    name: string;
    description: string;
  };
}

export interface ClassDef {
  id: ClassId;
  name: string;
  description: string;
  baseStats: BaseStats;
  growthPerLevel: Partial<BaseStats>;
  weaponTypes: string[];
}
