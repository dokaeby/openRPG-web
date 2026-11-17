import type { RaceId } from "../core/types";

export type QuestObjectiveType = "kill" | "collect" | "talk" | "reach";
export type QuestType = "main" | "side" | "daily" | "race";

export interface QuestObjectiveDef {
  type: QuestObjectiveType;
  target: string;
  count: number;
  description: string;
}

export interface QuestReward {
  exp?: number;
  gold?: number;
  items?: { itemId: string; count: number }[];
}

export interface QuestDef {
  id: string;
  name: string;
  type: QuestType;
  description: string;
  prerequisites?: string[];
  raceId?: RaceId;
  objectives: QuestObjectiveDef[];
  rewards: QuestReward;
  nextQuest?: string;
}

export const QUESTS: Record<string, QuestDef> = {
  main_001: {
    id: "main_001",
    name: "고블린의 위협",
    type: "main",
    description:
      "촌 주변을 위협하는 고블린 무리를 처치해달라는 마을의 부탁이다.",
    objectives: [
      {
        type: "kill",
        target: "goblin",
        count: 3,
        description: "고블린 처치",
      },
    ],
    rewards: { exp: 60, gold: 40 },
    nextQuest: "main_002",
  },
  main_002: {
    id: "main_002",
    name: "촌장의 부탁",
    type: "main",
    description:
      "촌장 할머니께 고블린 토벌 결과를 보고하고 다음 지시를 받아야 한다.",
    prerequisites: ["main_001"],
    objectives: [
      {
        type: "talk",
        target: "elder",
        count: 1,
        description: "촌장 할머니와 대화",
      },
    ],
    rewards: { exp: 50, gold: 30 },
    nextQuest: "main_003",
  },
  main_003: {
    id: "main_003",
    name: "늑대의 습격",
    type: "main",
    description:
      "숲에서 온 늑대들이 마을 외곽을 습격하고 있다. 늑대 가죽도 필요한 모양이다.",
    prerequisites: ["main_002"],
    objectives: [
      {
        type: "kill",
        target: "wolf",
        count: 2,
        description: "늑대 처치",
      },
      {
        type: "collect",
        target: "wolf_pelt",
        count: 2,
        description: "늑대 가죽 수집",
      },
    ],
    rewards: {
      exp: 120,
      gold: 80,
      items: [{ itemId: "wolf_pelt", count: 1 }],
    },
  },
  side_001: {
    id: "side_001",
    name: "상인의 심부름",
    type: "side",
    description:
      "상인이 가게 앞 광장의 소음을 신고했다. 상인에게 가서 상황을 들어보자.",
    objectives: [
      {
        type: "talk",
        target: "merchant",
        count: 1,
        description: "상인과 대화",
      },
    ],
    rewards: { exp: 30, gold: 50 },
  },
  side_002: {
    id: "side_002",
    name: "슬라임 청소부",
    type: "side",
    description:
      "폐가 주변에 끈적한 슬라임이 들끓고 있다. 모두 청소해달라는 의뢰다.",
    objectives: [
      {
        type: "kill",
        target: "slime",
        count: 5,
        description: "슬라임 처치",
      },
    ],
    rewards: { exp: 80, gold: 20 },
  },
  daily_001: {
    id: "daily_001",
    name: "일일 토벌",
    type: "daily",
    description:
      "매일 반복되는 토벌 임무. 고블린 몇 마리를 처치하고 보상을 받는다.",
    objectives: [
      {
        type: "kill",
        target: "goblin",
        count: 2,
        description: "고블린 처치",
      },
    ],
    rewards: { exp: 40, gold: 30 },
  },
  race_elf_001: {
    id: "race_elf_001",
    name: "성직자의 가르침",
    type: "race",
    raceId: "elf",
    description:
      "엘프 성직자가 월드리 버섯 숲의 오래된 유적에 대한 전설을 들려주려 한다.",
    objectives: [
      {
        type: "talk",
        target: "elf_priest",
        count: 1,
        description: "엘프 성직자와 대화",
      },
    ],
    rewards: { exp: 45, gold: 25 },
  },
};

export function getQuest(id: string): QuestDef {
  const quest = QUESTS[id];
  if (!quest) {
    throw new Error(`Unknown quest id: ${id}`);
  }
  return quest;
}
