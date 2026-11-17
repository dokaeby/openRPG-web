import type { ClassId } from "../core/types";

/**
 * 스킬 정의 (docs/02 §2.2, §3.3).
 * - mpCost: 시전 시 소모하는 MP
 * - damageMultiplier: 일반 공격 대비 피해 배율
 * - healPercent: 최대 HP 대비 회복 비율(%)
 * - buff: 자신에게 적용되는 버프 (prototype은 고정 배율 효과로 처리)
 * - debuff: 대상에게 적용되는 디버프
 * - dot: 대상에게 적용되는 지속 피해(중독)
 * - element: 속성 (표시/향후 상성용)
 */
export interface SkillDef {
  id: string;
  name: string;
  description: string;
  classId: ClassId;
  mpCost: number;
  damageMultiplier?: number;
  healPercent?: number;
  buff?: {
    stat: "defense" | "attack" | "speed";
    multiplier: number;
    turns: number;
  };
  debuff?: {
    stat: "defense" | "speed";
    multiplier: number;
    turns: number;
  };
  dot?: { damage: number; turns: number };
  element?: "physical" | "fire" | "ice";
}

export const SKILLS: Record<string, SkillDef> = {
  // 전사
  power_slash: {
    id: "power_slash",
    name: "파워 슬래시",
    description: "강력한 일격을 가한다. 공격력의 180% 피해.",
    classId: "warrior",
    mpCost: 8,
    damageMultiplier: 1.8,
    element: "physical",
  },
  guard_stance: {
    id: "guard_stance",
    name: "방어 태세",
    description: "3턴간 받는 피해를 절반으로 줄이는 방어 태세.",
    classId: "warrior",
    mpCost: 10,
    buff: { stat: "defense", multiplier: 0.5, turns: 3 },
    element: "physical",
  },
  // 마법사
  fireball: {
    id: "fireball",
    name: "파이어볼",
    description: "화염구를 발사한다. 공격력의 220% 화염 피해.",
    classId: "mage",
    mpCost: 15,
    damageMultiplier: 2.2,
    element: "fire",
  },
  ice_lance: {
    id: "ice_lance",
    name: "아이스 랜스",
    description: "얼음 창을 발사한다. 150% 피해 + 3턴간 대상 이동속도 감소.",
    classId: "mage",
    mpCost: 12,
    damageMultiplier: 1.5,
    debuff: { stat: "speed", multiplier: 0.5, turns: 3 },
    element: "ice",
  },
  // 궁수
  double_shot: {
    id: "double_shot",
    name: "연사",
    description: "재빨리 두 발을 연속으로 쏜다. 120% 피해 (쿨다운 없음).",
    classId: "archer",
    mpCost: 6,
    damageMultiplier: 1.2,
    element: "physical",
  },
  aimed_shot: {
    id: "aimed_shot",
    name: "치명 조준",
    description: "정조준 후 강한 한 발을 쏜다. 공격력의 250% 피해.",
    classId: "archer",
    mpCost: 14,
    damageMultiplier: 2.5,
    element: "physical",
  },
  // 도적
  backstab: {
    id: "backstab",
    name: "암습",
    description: "빈틈을 노려 급습한다. 공격력의 200% 피해.",
    classId: "rogue",
    mpCost: 10,
    damageMultiplier: 2.0,
    element: "physical",
  },
  poison_blade: {
    id: "poison_blade",
    name: "독 칼날",
    description: "독을 발라 벤다. 100% 피해 + 3턴간 중독.",
    classId: "rogue",
    mpCost: 12,
    damageMultiplier: 1.0,
    dot: { damage: 4, turns: 3 },
    element: "physical",
  },
};

export function getSkill(id: string): SkillDef {
  const skill = SKILLS[id];
  if (!skill) {
    throw new Error(`Unknown skill id: ${id}`);
  }
  return skill;
}
