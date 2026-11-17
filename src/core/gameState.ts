import { getClass, getRace } from "../data";
import type { BaseStats, ClassId, RaceId } from "../data";
import { EventBus } from "./eventBus";
import { addExp, computeMaxHp, computeMaxMp } from "./progression";

export interface ItemStack {
  itemId: string;
  count: number;
}

export type QuestState = "locked" | "available" | "active" | "completed";

export interface PlayerState {
  id: string;
  name: string;
  race: RaceId;
  classId: ClassId;
  level: number;
  exp: number;
  gold: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  stats: BaseStats;
  position: { zone: string; x: number; y: number; z: number };
  skills: string[];
  inventory: ItemStack[];
}

export interface GameStateData {
  player: PlayerState | null;
  questStates: Record<string, QuestState>;
  settings: { muted: boolean; uiScale: number };
}

export type GameAction =
  | { type: "createCharacter"; name: string; race: RaceId; classId: ClassId }
  | { type: "setPosition"; x: number; y: number; z: number }
  | { type: "setQuestState"; questId: string; state: QuestState }
  | {
      type: "setSetting";
      key: keyof GameStateData["settings"];
      value: number | boolean;
    }
  | { type: "addExp"; amount: number };

const STAT_KEYS: (keyof BaseStats)[] = [
  "hp",
  "mp",
  "str",
  "dex",
  "int",
  "vit",
  "luk",
];

export class GameState {
  readonly bus = new EventBus();

  private _data: GameStateData = {
    player: null,
    questStates: {},
    settings: { muted: false, uiScale: 1 },
  };

  get data(): GameStateData {
    return this._data;
  }

  getState(): GameStateData {
    return this._data;
  }

  dispatch(action: GameAction): unknown {
    switch (action.type) {
      case "createCharacter":
        return this.createCharacter(action);
      case "setPosition":
        if (this._data.player) {
          this._data.player.position = {
            zone: this._data.player.position.zone,
            x: action.x,
            y: action.y,
            z: action.z,
          };
        }
        return undefined;
      case "setQuestState":
        this._data.questStates[action.questId] = action.state;
        return undefined;
      case "setSetting":
        (this._data.settings as Record<string, number | boolean>)[action.key] =
          action.value;
        return undefined;
      case "addExp":
        return addExp(this, action.amount);
    }
  }

  private createCharacter(action: {
    name: string;
    race: RaceId;
    classId: ClassId;
  }): PlayerState {
    const race = getRace(action.race);
    const cls = getClass(action.classId);

    const stats = {} as BaseStats;
    for (const key of STAT_KEYS) {
      stats[key] = Math.max(0, cls.baseStats[key] + (race.statMods[key] ?? 0));
    }

    const vit = Math.max(0, cls.baseStats.vit + (race.statMods.vit ?? 0));
    const int = Math.max(0, cls.baseStats.int + (race.statMods.int ?? 0));
    const maxHp = computeMaxHp(cls, vit);
    const maxMp = computeMaxMp(race.id, cls, int);

    const player: PlayerState = {
      id: crypto.randomUUID(),
      name: action.name,
      race: race.id,
      classId: cls.id,
      level: 1,
      exp: 0,
      gold: 0,
      hp: maxHp,
      maxHp,
      mp: maxMp,
      maxMp,
      stats,
      position: { zone: "greenfield", x: 0, y: 0, z: 0 },
      skills: [`${cls.id}_skill`],
      inventory: [],
    };
    this._data.player = player;
    return player;
  }
}
