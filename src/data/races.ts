import type { RaceDef, RaceId } from "../core/types";

export const RACES: Record<RaceId, RaceDef> = {
  human: {
    id: "human",
    name: "인간",
    description: "적응력 우수, 균형 잡힌 스탯, 모든 직업 선택 가능",
    statMods: {
      str: 1,
      dex: 1,
      int: 1,
      vit: 1,
      luk: 1,
    },
    passive: {
      id: "human_charm",
      name: "대화의 재주",
      description: "상점 가격 5% 할인, 특정 NPC 추가 대화 해금",
    },
  },
  elf: {
    id: "elf",
    name: "엘프",
    description: "장수, 마법 친화, 야간 시야 우수",
    statMods: {
      dex: 3,
      int: 3,
      str: -1,
    },
    passive: {
      id: "elf_forest_eye",
      name: "숲의 눈",
      description: "숲 지역 몬스터 탐지 범위 +30%, 독 저항",
    },
  },
  dwarf: {
    id: "dwarf",
    name: "드워프",
    description: "장인, 지하 탐험 특화, 단단한 체력",
    statMods: {
      str: 2,
      vit: 3,
      dex: -2,
    },
    passive: {
      id: "dwarf_craft",
      name: "장인의 손",
      description: "제작 성공률 +10%, 채굴 시 추가 자원 획득",
    },
  },
  orc: {
    id: "orc",
    name: "오크",
    description: "전사 문화, 높은 물리 공격력, 원시적 성향",
    statMods: {
      str: 5,
      vit: 5,
      mp: -5,
      int: -1,
    },
    passive: {
      id: "orc_berserk",
      name: "전투 광기",
      description: "HP 30% 이하 시 공격력 +15%",
    },
  },
  golem: {
    id: "golem",
    name: "골렘",
    description: "마나 없음, 오직 물리/기계 구조, 극도의 내구성",
    statMods: {
      vit: 6,
      str: 2,
      mp: -10,
      int: -3,
    },
    passive: {
      id: "golem_engine",
      name: "무한의 엔진",
      description: "마나 소모 없이 지속 스킬 사용, 단 냉각 시스템 필요",
    },
  },
  half: {
    id: "half",
    name: "반혈/기타",
    description: "두 종족 특성 혼합, 세계관상 특수한 존재",
    statMods: {
      str: 1,
      dex: 1,
      int: 1,
      vit: 1,
      luk: 2,
    },
    passive: {
      id: "half_adapt",
      name: "혼혈의 적응",
      description: "두 세계의 특성을 부분적으로 공유, 추가 스탯 포인트 획득",
    },
  },
};
