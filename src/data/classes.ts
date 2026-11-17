import type { BaseStats, ClassDef, ClassId } from "../core/types";

/**
 * ClassDef + 보유 스킬 ID 목록.
 * ClassDef 본체는 core/types.ts에 있으며, 스킬 목록은 클래스별 데이터이므로
 * 여기서 확장한다 (코어 타입 수정 없이 data 계층에서 관리).
 */
export interface ClassDefWithSkills extends ClassDef {
  skills: string[];
}

const baseStats = (partial: Partial<BaseStats>): BaseStats => ({
  hp: 100,
  mp: 50,
  str: 5,
  dex: 5,
  int: 5,
  vit: 5,
  luk: 5,
  ...partial,
});

export const CLASSES: Record<ClassId, ClassDefWithSkills> = {
  warrior: {
    id: "warrior",
    name: "전사",
    description: "근접 전투에 특화된 최전선 전사",
    baseStats: baseStats({ hp: 150, mp: 30, str: 10, vit: 8 }),
    growthPerLevel: { hp: 12, mp: 2, str: 2, vit: 1 },
    weaponTypes: ["sword", "axe", "shield"],
    skills: ["power_slash", "guard_stance"],
  },
  mage: {
    id: "mage",
    name: "마법사",
    description: "강력한 마법을 사용하는 원거리 공격수",
    baseStats: baseStats({ hp: 80, mp: 100, int: 10, vit: 4 }),
    growthPerLevel: { hp: 6, mp: 10, int: 2 },
    weaponTypes: ["staff", "wand"],
    skills: ["fireball", "ice_lance"],
  },
  archer: {
    id: "archer",
    name: "궁수",
    description: "활을 다루는 민첩한 원거리 딜러",
    baseStats: baseStats({ hp: 100, mp: 50, dex: 10, str: 6 }),
    growthPerLevel: { hp: 8, mp: 4, dex: 2, luk: 1 },
    weaponTypes: ["bow"],
    skills: ["double_shot", "aimed_shot"],
  },
  rogue: {
    id: "rogue",
    name: "도적",
    description: "은신과 암습으로 적을 제압하는 암살자",
    baseStats: baseStats({ hp: 90, mp: 60, dex: 10, luk: 8 }),
    growthPerLevel: { hp: 7, mp: 5, dex: 2, luk: 1 },
    weaponTypes: ["dagger", "bow"],
    skills: ["backstab", "poison_blade"],
  },
};
