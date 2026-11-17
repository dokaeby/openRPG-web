import { getClass, getRace } from "../data";
import { QUESTS } from "../data/quests";
import type { BaseStats, ClassId, RaceId } from "../data";
import {
  enemyTurn,
  playerAttack,
  playerCastSkill,
  startCombat,
} from "./combat";
import type { CombatState } from "./combat";
import { EventBus } from "./eventBus";
import {
  addItem,
  countItem,
  equipItem,
  unequipItem,
  useItem,
} from "./inventory";
import {
  addExp,
  allocateStat,
  computeMaxHp,
  computeMaxMp,
} from "./progression";
import type { AllocatableStat } from "./progression";
import type { EquipSlot } from "../data/items";
import {
  abandonQuest,
  acceptQuest,
  createQuestBook,
  entryState,
  recordQuestEvent,
} from "./quest";
import type { QuestBook, QuestEvent } from "./quest";
import type { QuestDef } from "../data/quests";

export interface ItemStack {
  itemId: string;
  count: number;
}

export type QuestState = "locked" | "available" | "active" | "completed";

export type Difficulty = "easy" | "normal" | "hard";

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
  equipment: Record<string, string>;
  statPoints: number;
  skillPoints: number;
}

export interface GameStateData {
  player: PlayerState | null;
  questStates: Record<string, QuestState>;
  questBook: QuestBook;
  settings: { muted: boolean; uiScale: number; difficulty: Difficulty };
  combat: CombatState | null;
}

export type GameAction =
  | { type: "createCharacter"; name: string; race: RaceId; classId: ClassId }
  | { type: "setPosition"; x: number; y: number; z: number }
  | { type: "setQuestState"; questId: string; state: QuestState }
  | {
      type: "setSetting";
      key: keyof GameStateData["settings"];
      value: number | boolean | Difficulty;
    }
  | { type: "addExp"; amount: number }
  | { type: "startCombat"; monsterIds: string[] }
  | { type: "combatPlayerAttack"; targetId: string }
  | { type: "combatCastSkill"; skillId: string; targetId?: string }
  | { type: "combatEnemyTurn" }
  | { type: "useItem"; itemId: string }
  | { type: "equipItem"; itemId: string }
  | { type: "unequipItem"; slot: EquipSlot }
  | { type: "allocateStat"; stat: AllocatableStat; amount: number }
  | { type: "questAccept"; questId: string }
  | { type: "questAbandon"; questId: string }
  | { type: "questEvent"; event: QuestEvent }
  | { type: "addItem"; itemId: string; count?: number }
  | { type: "setZone"; zone: string }
  | { type: "loadState"; data: GameStateData };

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
    questBook: createQuestBook(),
    settings: { muted: false, uiScale: 1, difficulty: "normal" },
    combat: null,
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
        (this._data.settings as Record<string, unknown>)[action.key] =
          action.value;
        return undefined;
      case "addExp":
        return addExp(this, action.amount);
      case "startCombat":
        return startCombat(this, action.monsterIds);
      case "combatPlayerAttack":
        return playerAttack(this, action.targetId);
      case "combatCastSkill":
        return playerCastSkill(this, action.skillId, action.targetId);
      case "combatEnemyTurn":
        return enemyTurn(this);
      case "useItem": {
        const p = this._data.player;
        if (!p) return { ok: false, reason: "캐릭터가 없습니다" };
        const result = useItem(p, action.itemId);
        if (result.ok) this.bus.emit("player:itemUsed", { itemId: action.itemId });
        return result;
      }
      case "equipItem": {
        const p = this._data.player;
        if (!p) return { ok: false, reason: "캐릭터가 없습니다" };
        const result = equipItem(p, action.itemId);
        if (result.ok) this.bus.emit("player:itemEquipped", { itemId: action.itemId });
        return result;
      }
      case "unequipItem": {
        const p = this._data.player;
        if (!p) return { ok: false, reason: "캐릭터가 없습니다" };
        const result = unequipItem(p, action.slot);
        if (result.ok) this.bus.emit("player:itemUnequipped", { slot: action.slot });
        return result;
      }
      case "allocateStat": {
        const p = this._data.player;
        if (!p) return { ok: false, reason: "캐릭터가 없습니다" };
        return allocateStat(p, action.stat, action.amount);
      }
      case "questAccept": {
        const p = this._data.player;
        try {
          acceptQuest(this._data.questBook, action.questId, p?.race);
        } catch (err) {
          return {
            ok: false,
            reason: err instanceof Error ? err.message : "퀘스트 수락 실패",
          };
        }
        this.syncQuestStates();
        this.bus.emit("quest:accepted", { questId: action.questId });
        return { ok: true };
      }
      case "questAbandon":
        abandonQuest(this._data.questBook, action.questId);
        this.syncQuestStates();
        return { ok: true };
      case "questEvent":
        return this.handleQuestEvent(action.event);
      case "addItem": {
        const p = this._data.player;
        if (!p) return { ok: false, reason: "캐릭터가 없습니다" };
        addItem(p, action.itemId, action.count ?? 1);
        this.bus.emit("player:itemGained", {
          itemId: action.itemId,
          count: action.count ?? 1,
        });
        return { ok: true };
      }
      case "setZone":
        if (this._data.player) {
          this._data.player.position.zone = action.zone;
        }
        return undefined;
      case "loadState":
        this.loadState(action.data);
        return undefined;
    }
  }

  private loadState(data: GameStateData): void {
    const p = data.player;
    if (p) {
      p.equipment ??= {};
      p.statPoints ??= 0;
      p.skillPoints ??= 0;
    }
    this._data = {
      player: p ?? null,
      questStates: { ...(data.questStates ?? {}) },
      questBook: data.questBook ?? createQuestBook(),
      settings: (() => {
        const merged = { ...this._data.settings, ...(data.settings ?? {}) };
        merged.difficulty ??= "normal";
        return merged;
      })(),
      combat: data.combat ?? null,
    };
    this.syncQuestStates();
  }

  /**
   * 퀘스트 이벤트 기록 + collect 목표를 인벤토리 실측값과 동기화한다.
   * collect 목표는 이벤트 누적이 아니라 "현재 보유 수"가 진실이므로
   * 아이템 획득 시점과 무관하게 정확히 판정된다.
   */
  private handleQuestEvent(event: QuestEvent): {
    completed: string[];
  } {
    const book = this._data.questBook;
    const player = this._data.player;
    const completedDefs = recordQuestEvent(book, event);
    const extraCompleted: QuestDef[] = [];

    for (const [questId, entry] of Object.entries(book.entries)) {
      if (entry.state !== "active") continue;
      const quest = QUESTS[questId];
      if (!quest || !player) continue;
      // 연속된 목표를 현재 counts로 평가해 진행/완료 처리
      while (entry.objectiveIndex < quest.objectives.length) {
        const obj = quest.objectives[entry.objectiveIndex];
        if (obj.type === "collect") {
          entry.counts[entry.objectiveIndex] = Math.min(
            countItem(player, obj.target),
            obj.count,
          );
        }
        if (
          entry.counts[entry.objectiveIndex] >=
          quest.objectives[entry.objectiveIndex].count
        ) {
          entry.objectiveIndex += 1;
          continue;
        }
        break;
      }
      if (
        entry.objectiveIndex >= quest.objectives.length &&
        entry.state === "active"
      ) {
        entry.state = "completed";
        if (!completedDefs.includes(quest)) extraCompleted.push(quest);
      }
    }

    for (const quest of [...completedDefs, ...extraCompleted]) {
      this.applyQuestRewards(quest);
      this.bus.emit("quest:completed", {
        questId: quest.id,
        name: quest.name,
      });
    }
    this.syncQuestStates();
    return {
      completed: [...completedDefs, ...extraCompleted].map((q) => q.id),
    };
  }

  private applyQuestRewards(quest: QuestDef): void {
    const player = this._data.player;
    if (!player) return;
    const { exp, gold, items } = quest.rewards;
    if (exp) addExp(this, exp);
    if (gold) player.gold += gold;
    for (const item of items ?? []) {
      addItem(player, item.itemId, item.count);
    }
  }

  /** questBook 상태를 기존 questStates 맵에 반영 (HUD/대화 조건용). */
  private syncQuestStates(): void {
    const race = this._data.player?.race;
    const map: Record<string, QuestState> = {};
    for (const id of Object.keys(QUESTS)) {
      map[id] = entryState(this._data.questBook, id, race) ?? "locked";
    }
    this._data.questStates = map;
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
      position: { zone: "village", x: 0, y: 0, z: 0 },
      skills: [...cls.skills],
      inventory: [],
      equipment: {},
      statPoints: 0,
      skillPoints: 0,
    };
    this._data.player = player;
    this.syncQuestStates();
    return player;
  }
}
