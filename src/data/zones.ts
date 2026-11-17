export interface ZoneSpawnPoint {
  monsterId: string;
  x: number;
  z: number;
  respawnSec: number;
}

export interface ZonePortal {
  to: string;
  x: number;
  z: number;
  label: string;
}

export interface ZoneDef {
  id: string;
  name: string;
  description: string;
  groundColor: number;
  fogColor: number;
  fogNear: number;
  fogFar: number;
  size: number;
  spawnPoints: ZoneSpawnPoint[];
  portals: ZonePortal[];
}

export const ZONES: Record<string, ZoneDef> = {
  village: {
    id: "village",
    name: "하늘마을",
    description:
      "모험가들이 쉬어가는 안전한 마을. 몬스터가 나타나지 않는다.",
    groundColor: 0x7a8f6a,
    fogColor: 0xa8c8e8,
    fogNear: 50,
    fogFar: 200,
    size: 80,
    spawnPoints: [],
    portals: [{ to: "greenfield", x: 0, z: -38, label: "초록들판으로" }],
  },
  greenfield: {
    id: "greenfield",
    name: "초록들판",
    description:
      "바람이 부는 넓은 초원. 고블린과 슬라임이 배회하고 있다.",
    groundColor: 0x4a9e4a,
    fogColor: 0x87ceeb,
    fogNear: 60,
    fogFar: 160,
    size: 200,
    spawnPoints: [
      { monsterId: "goblin", x: -20, z: -30, respawnSec: 20 },
      { monsterId: "goblin", x: 25, z: -15, respawnSec: 25 },
      { monsterId: "goblin", x: 5, z: 40, respawnSec: 20 },
      { monsterId: "slime", x: -35, z: 10, respawnSec: 30 },
      { monsterId: "slime", x: 40, z: 30, respawnSec: 25 },
    ],
    portals: [
      { to: "village", x: 0, z: 90, label: "하늘마을로" },
      { to: "whisperwood", x: -90, z: 0, label: "속삭이는 숲으로" },
    ],
  },
  whisperwood: {
    id: "whisperwood",
    name: "속삭이는 숲",
    description:
      "나무들이 서로 속삭이는 어두운 숲. 늑대와 멧돼지가 서식한다.",
    groundColor: 0x2d5a3d,
    fogColor: 0x2a3d33,
    fogNear: 30,
    fogFar: 120,
    size: 160,
    spawnPoints: [
      { monsterId: "wolf", x: -20, z: -25, respawnSec: 25 },
      { monsterId: "wolf", x: 15, z: -10, respawnSec: 30 },
      { monsterId: "wolf", x: 0, z: 35, respawnSec: 25 },
      { monsterId: "boar", x: -45, z: 15, respawnSec: 30 },
      { monsterId: "boar", x: 45, z: 20, respawnSec: 25 },
    ],
    portals: [{ to: "greenfield", x: 70, z: 0, label: "초록들판으로" }],
  },
};

export function getZone(id: string): ZoneDef {
  const zone = ZONES[id];
  if (!zone) {
    throw new Error(`알 수 없는 지역입니다: ${id}`);
  }
  return zone;
}
