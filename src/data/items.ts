export type ItemType = "consumable" | "material" | "equipment";

export type Rarity =
  | "common"
  | "uncommon"
  | "rare"
  | "heroic"
  | "legendary"
  | "mythic";

export type EquipSlot =
  | "weapon"
  | "offhand"
  | "helmet"
  | "armor"
  | "gloves"
  | "boots"
  | "ring"
  | "necklace";

export type StatKey =
  | "hp"
  | "mp"
  | "str"
  | "dex"
  | "int"
  | "vit"
  | "luk"
  | "attack"
  | "defense";

export interface ItemDef {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  rarity: Rarity;
  price: number; // 판매가 기준
  healHp?: number;
  healMp?: number;
  slot?: EquipSlot;
  weaponType?: string;
  statBonus?: Partial<Record<StatKey, number>>;
}

const item = (def: ItemDef): ItemDef => def;

export const ITEMS: Record<string, ItemDef> = {
  hp_potion_small: item({
    id: "hp_potion_small",
    name: "소형 체력 포션",
    description: "HP를 50 회복하는 붉은 물약.",
    type: "consumable",
    rarity: "common",
    price: 20,
    healHp: 50,
  }),
  hp_potion_medium: item({
    id: "hp_potion_medium",
    name: "중형 체력 포션",
    description: "HP를 150 회복하는 붉은 물약.",
    type: "consumable",
    rarity: "common",
    price: 60,
    healHp: 150,
  }),
  mp_potion: item({
    id: "mp_potion",
    name: "마나 포션",
    description: "MP를 50 회복하는 푸른 물약.",
    type: "consumable",
    rarity: "common",
    price: 30,
    healMp: 50,
  }),
  goblin_ear: item({
    id: "goblin_ear",
    name: "고블린 귀",
    description: "고블린에게서 얻은 재료. 잡화상에게 팔 수 있다.",
    type: "material",
    rarity: "common",
    price: 5,
  }),
  slime_gel: item({
    id: "slime_gel",
    name: "슬라임 젤",
    description: "끈적한 슬라임 조직. 포션 제조에 쓰인다.",
    type: "material",
    rarity: "common",
    price: 8,
  }),
  wolf_pelt: item({
    id: "wolf_pelt",
    name: "늑대 가죽",
    description: "가죽 갑옷 제작에 쓰이는 내구성 있는 가죽.",
    type: "material",
    rarity: "uncommon",
    price: 25,
  }),
  rusty_sword: item({
    id: "rusty_sword",
    name: "녹슨 검",
    description: "오래되어 녹이 슬었지만 아직 벨 수 있는 검.",
    type: "equipment",
    rarity: "common",
    price: 50,
    slot: "weapon",
    weaponType: "sword",
    statBonus: { attack: 3 },
  }),
  wooden_shield: item({
    id: "wooden_shield",
    name: "나무 방패",
    description: "두 손을 보호해 주는 단단한 나무 방패.",
    type: "equipment",
    rarity: "common",
    price: 30,
    slot: "offhand",
    statBonus: { defense: 3, vit: 1 },
  }),
  cloth_armor: item({
    id: "cloth_armor",
    name: "천 갑옷",
    description: "가볍고 편안한 천으로 만든 옷.",
    type: "equipment",
    rarity: "common",
    price: 40,
    slot: "armor",
    statBonus: { defense: 2, dex: 1 },
  }),
  leather_helm: item({
    id: "leather_helm",
    name: "가죽 모자",
    description: "머리를 보호하는 단단한 가죽 모자.",
    type: "equipment",
    rarity: "common",
    price: 25,
    slot: "helmet",
    statBonus: { vit: 1, defense: 1 },
  }),
  wool_gloves: item({
    id: "wool_gloves",
    name: "양모 장갑",
    description: "추운 날에도 손을 따뜻하게 해주는 장갑.",
    type: "equipment",
    rarity: "common",
    price: 20,
    slot: "gloves",
    statBonus: { vit: 1 },
  }),
  travel_boots: item({
    id: "travel_boots",
    name: "여행용 부츠",
    description: "긴 여행에 적합한 편안한 부츠.",
    type: "equipment",
    rarity: "common",
    price: 35,
    slot: "boots",
    statBonus: { dex: 1 },
  }),
  copper_ring: item({
    id: "copper_ring",
    name: "구리 반지",
    description: "은은하게 빛나는 구리로 만든 반지.",
    type: "equipment",
    rarity: "common",
    price: 60,
    slot: "ring",
    statBonus: { luk: 2, hp: 10 },
  }),
  pendant: item({
    id: "pendant",
    name: "목걸이 펜던트",
    description: "숲의 수호를 상징하는 펜던트.",
    type: "equipment",
    rarity: "uncommon",
    price: 120,
    slot: "necklace",
    statBonus: { int: 2, mp: 15 },
  }),
  iron_helmet: item({
    id: "iron_helmet",
    name: "철 투구",
    description: "두꺼운 철로 만들어진 견고한 투구.",
    type: "equipment",
    rarity: "rare",
    price: 300,
    slot: "helmet",
    statBonus: { defense: 8, vit: 2, hp: 20 },
  }),
};

export function getItem(id: string): ItemDef {
  const def = ITEMS[id];
  if (!def) {
    throw new Error(`Unknown item id: ${id}`);
  }
  return def;
}
