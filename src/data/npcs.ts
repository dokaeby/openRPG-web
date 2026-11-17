import type { RaceId } from "../core/types";

export type QuestStateName = "locked" | "available" | "active" | "completed";

export interface DialogueCondition {
  questState?: { questId: string; state: QuestStateName };
  level?: { min?: number; max?: number };
  race?: RaceId;
}

export interface DialogueAction {
  type: "quest.accept" | "quest.complete" | "quest.abandon" | "giveItem" | "close";
  questId?: string;
  itemId?: string;
  count?: number;
}

export interface DialogueChoice {
  label: string;
  next?: string;
  action?: DialogueAction;
  condition?: DialogueCondition;
}

export interface DialogueNode {
  id: string;
  text: string;
  condition?: DialogueCondition;
  choices: DialogueChoice[];
  next?: string;
}

export interface NpcDef {
  id: string;
  name: string;
  role: string;
  zone: string;
  x: number;
  y: number;
  z: number;
  nodes: DialogueNode[];
}

const CLOSE: DialogueAction = { type: "close" };

export const NPCS: Record<string, NpcDef> = {
  elder: {
    id: "elder",
    name: "촌장 마을로",
    role: "촌장",
    zone: "village",
    x: 0,
    y: 0,
    z: 2,
    nodes: [
      {
        id: "start",
        text: "흠, 오크 녀석이로군. 이 마을에 오면 할 말이 많을 텐데, 자네는 어떤 자로 보이는가?",
        condition: { race: "orc" },
        choices: [
          { label: "촌장님, 무슨 일이시죠?", next: "hub" },
        ],
      },
      {
        id: "greet_dwarf",
        text: "드워프여? 이 마을에서 드워프를 볼 줄이야. 돌과 쇠를 다루는 자라면 자네 이야기를 들어줄 만하지.",
        condition: { race: "dwarf" },
        choices: [
          { label: "촌장님, 무슨 일이시죠?", next: "hub" },
        ],
      },
      {
        id: "greet",
        text: "어서 오게, 여행자여. 이 마을은 평화롭지만, 요즘 고블린이 근처 숲을 어지럽히고 있네.",
        choices: [
          { label: "촌장님, 무슨 일이시죠?", next: "hub" },
        ],
      },
      {
        id: "hub",
        text: "자네 덕분에 마음이 놓이는구려. 마을 사정을 더 알고 싶다면 내게 물어보게.",
        choices: [
          {
            label: "촌장님, 고블린들은 어떤가요?",
            next: "progress",
            condition: { questState: { questId: "main_001", state: "active" } },
          },
          {
            label: "촌장님께 감사 인사를 한다",
            next: "thanks",
            condition: { questState: { questId: "main_001", state: "completed" } },
          },
          {
            label: "고블린 토벌을 도와주겠다",
            next: "accepted",
            action: { type: "quest.accept", questId: "main_001" },
            condition: { questState: { questId: "main_001", state: "locked" } },
          },
          {
            label: "고블린 토벌을 도와주겠다",
            next: "accepted",
            action: { type: "quest.accept", questId: "main_001" },
            condition: { questState: { questId: "main_001", state: "available" } },
          },
        ],
      },
      {
        id: "progress",
        text: "고블린들이 아직 숲 깊은 곳에 도사리고 있네. 서쪽 숲길로 가면 자취가 보일 걸세. 조심하게나.",
        choices: [{ label: "촌장님, 수고하세요", next: "hub" }],
      },
      {
        id: "thanks",
        text: "자네 덕분에 마을이 평화를 되찾았네. 다음엔 북쪽 폐허에 도는 '잊힌 왕의 검' 이야기도 도와주게.",
        choices: [{ label: "촌장님, 수고하세요", next: "hub" }],
      },
      {
        id: "accepted",
        text: "고맙네! 숲 서쪽에서 고블린 무리를 발견하면 처리해주게. 마을 사람들이 자네를 기다리고 있을 걸세.",
        choices: [{ label: "다녀오겠습니다", action: CLOSE }],
      },
    ],
  },

  merchant: {
    id: "merchant",
    name: "잡화 상인 보리",
    role: "잡화 상인",
    zone: "village",
    x: -4,
    y: 0,
    z: 4,
    nodes: [
      {
        id: "start",
        text: "어서 오세요~ 포션부터 잡화까지 다 있습니다! 오늘은 뭘 찾으시나요?",
        choices: [
          { label: "물건을 구경한다", next: "shop" },
          {
            label: "전달 퀘스트",
            next: "delivered",
            action: { type: "quest.complete", questId: "side_001" },
            condition: { questState: { questId: "side_001", state: "active" } },
          },
          { label: "또 오겠습니다", action: CLOSE },
        ],
      },
      {
        id: "shop",
        text: "소형 체력 포션에 몬스터 가죽, 낡은 장비까지… 다들 여행자들이 찾아서 금방 동이 난답니다. 볼만한 건 직접 보세요!",
        choices: [{ label: "고맙습니다, 또 오겠습니다", action: CLOSE }],
      },
      {
        id: "delivered",
        text: "오, 물건 잘 받았습니다! 약속한 대로 사례비 드릴게요. 덕분에 장사가 잘되겠군요!",
        choices: [{ label: "천만에요", action: CLOSE }],
      },
    ],
  },

  elf_priest: {
    id: "elf_priest",
    name: "대사제 실바",
    role: "엘프 대사제",
    zone: "greenfield",
    x: 6,
    y: 0,
    z: -6,
    nodes: [
      {
        id: "start",
        text: "숲의 자손이여, 네 안에서 오래된 기운이 느껴지는구나. 이 숲의 축복을 받을 자격이 있어 보이는군.",
        condition: { race: "elf" },
        choices: [
          {
            label: "숲의 축복을 받겠다",
            next: "blessing",
            action: { type: "quest.accept", questId: "race_elf_001" },
          },
          { label: "그냥 지나간다", action: CLOSE },
        ],
      },
      {
        id: "start_mortal",
        text: "이곳은 엘프의 성역이오. 인간이 찾아온 것은 처음이군… 물러나 주시오.",
        choices: [{ label: "물러난다", action: CLOSE }],
      },
      {
        id: "blessing",
        text: "이제 이 의식을 받아라. 숲은 너의 발걸음을 기억할 것이며, 깊은 곳에서 기다리는 것들이 너를 시험하리라.",
        choices: [{ label: "감사합니다", action: CLOSE }],
      },
    ],
  },

  dwarf_smith: {
    id: "dwarf_smith",
    name: "대장장이 브로크",
    role: "은둔한 대장장이",
    zone: "village",
    x: -8,
    y: 0,
    z: -3,
    nodes: [
      {
        id: "start",
        text: "쉿… 대장간에서 조용히 하라고. 뭘 원하러 왔나? 장비나 재료가 필요하면 말하게.",
        choices: [
          { label: "대장일 이야기를 듣는다", next: "craft" },
          {
            label: "의뢰를 취소한다",
            next: "abandoned",
            action: { type: "quest.abandon", questId: "smith_001" },
            condition: { questState: { questId: "smith_001", state: "active" } },
          },
          { label: "다음에 오겠다", action: CLOSE },
        ],
      },
      {
        id: "craft",
        text: "좋은 철은 땅속 깊은 곳에 있지. 늑대 가죽은 갑옷 재료로 최고고, 슬라임 점액은 도금에 쓴다네. 그만 물러가게나.",
        choices: [
          {
            label: "늑대 가죽을 넘겨준다",
            action: { type: "giveItem", itemId: "wolf_pelt", count: 3 },
          },
          { label: "다음에 오겠다", action: CLOSE },
        ],
      },
      {
        id: "abandoned",
        text: "의뢰를 그만두겠다고? 하찮은 일인데… 알았네. 다른 일이 생기면 그때나 오게.",
        choices: [{ label: "다음에 오겠다", action: CLOSE }],
      },
    ],
  },
};

export function getNpc(id: string): NpcDef {
  const npc = NPCS[id];
  if (!npc) {
    throw new Error(`Unknown npc id: ${id}`);
  }
  return npc;
}
