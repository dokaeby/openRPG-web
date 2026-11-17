import { MONSTERS } from "../data/monsters";
import type { MonsterDef } from "../data/monsters";
import { getSkill } from "../data/skills";
import type { SkillDef } from "../data/skills";
import { addExp } from "./progression";
import type { GameState } from "./gameState";

/**
 * 전투 중인 콤바탄트의 상태이상.
 * 각 수치 필드는 "남은 턴 수"이며 0 이하가 되면 제거된다.
 * - defenseUp: 방어력 2배 (받는 피해 절반) — guard_stance
 * - attackUp: 공격력 2배
 * - speedUp: ATB 충전 속도 2배
 * - defenseDown: 방어력 절반
 * - speedDown: ATB 충전 속도 절반 — ice_lance
 * - poisoned: 매 액션 시작 시 고정 피해를 받고 turns 감소
 *
 * 상태이상 규칙: 모든 상태의 턴 수는 "액션 1회(combat.turn +1)마다 1씩 감소"하며,
 * 감소는 해당 액션 처리 시작 시점에 모든 콤바탄트에 일괄 적용된다.
 * 즉 플레이어 행동(playerAttack/playerCastSkill)과 적 행동(enemyTurn)이
 * 각각 turn을 1 증가시킬 때마다 상태가 1틱 진행된다.
 */
export interface CombatantStatuses {
  defenseUp?: number;
  attackUp?: number;
  speedUp?: number;
  defenseDown?: number;
  speedDown?: number;
  poisoned?: { damage: number; turns: number };
}

export interface Combatant {
  id: string;
  name: string;
  side: "player" | "enemy";
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  speed: number;
  atb: number;
  alive: boolean;
  monsterId?: string;
  statuses?: CombatantStatuses;
}

export interface CombatState {
  player: Combatant;
  enemies: Combatant[];
  turn: number;
  phase: "active" | "won" | "lost";
}

const ATB_MAX = 100;
// atb += speed * dtMs * ATB_RATE. speed 10 fills the gauge in ~2s.
const ATB_RATE = 0.005;

function playerCombatant(gs: GameState): Combatant {
  const p = gs.getState().player;
  if (!p) throw new Error("No player");
  return {
    id: p.id,
    name: p.name,
    side: "player",
    hp: p.hp,
    maxHp: p.maxHp,
    mp: p.mp,
    maxMp: p.maxMp,
    attack: p.stats.str * 2,
    defense: p.stats.vit,
    speed: p.stats.dex,
    // Player starts ready so the first attack works before any tick.
    atb: ATB_MAX,
    alive: p.hp > 0,
  };
}

function enemyCombatant(def: MonsterDef, index: number): Combatant {
  return {
    id: `${def.id}_${index}_${crypto.randomUUID()}`,
    name: def.name,
    side: "enemy",
    hp: def.stats.hp,
    maxHp: def.stats.hp,
    mp: def.stats.mp,
    maxMp: def.stats.mp,
    attack: def.attack,
    defense: def.defense,
    speed: def.speed,
    atb: 0,
    alive: def.stats.hp > 0,
    monsterId: def.id,
  };
}

export function startCombat(
  gs: GameState,
  monsterIds: string[],
): CombatState {
  if (!gs.getState().player) throw new Error("No player");

  const combat: CombatState = {
    player: playerCombatant(gs),
    enemies: monsterIds.map((id, i) => {
      const def = MONSTERS[id];
      if (!def) throw new Error(`Unknown monster id: ${id}`);
      return enemyCombatant(def, i);
    }),
    turn: 0,
    phase: "active",
  };
  gs.data.combat = combat;
  return combat;
}

// --- 상태이상 헬퍼 ---

const TURN_STATUS_KEYS = [
  "defenseUp",
  "attackUp",
  "speedUp",
  "defenseDown",
  "speedDown",
] as const;

/**
 * 모든 콤바탄트의 상태를 1틱 진행한다.
 * - poisoned: 고정 피해(최소 1)를 받고 turns 감소, 0이면 중독 해제
 * - 나머지 버프/디버프: turns 감소, 0이면 해제
 * 플레이어 측 피해는 PlayerState.hp에, 적 피해는 Combatant.hp에 반영한다.
 */
function tickStatuses(gs: GameState): void {
  const combat = gs.data.combat;
  if (!combat) return;
  const player = gs.getState().player;

  for (const c of [combat.player, ...combat.enemies]) {
    const s = c.statuses;
    if (!s) continue;

    if (s.poisoned) {
      const dot = Math.max(1, Math.round(s.poisoned.damage));
      if (c.side === "player") {
        if (player) player.hp = Math.max(0, player.hp - dot);
      } else {
        c.hp = Math.max(0, c.hp - dot);
        if (c.hp <= 0) c.alive = false;
      }
      s.poisoned.turns -= 1;
      if (s.poisoned.turns <= 0) delete s.poisoned;
    }

    for (const key of TURN_STATUS_KEYS) {
      const v = s[key];
      if (typeof v === "number") {
        if (v <= 1) {
          delete s[key];
        } else {
          s[key] = v - 1;
        }
      }
    }
  }
}

function effectiveAttack(c: Combatant): number {
  return c.statuses?.attackUp ? c.attack * 2 : c.attack;
}

function effectiveDefense(c: Combatant): number {
  const s = c.statuses;
  if (!s) return c.defense;
  let d = c.defense;
  if (s.defenseUp) d *= 2;
  if (s.defenseDown) d *= 0.5;
  return d;
}

function effectiveSpeed(c: Combatant): number {
  const s = c.statuses;
  if (!s) return c.speed;
  let sp = c.speed;
  if (s.speedUp) sp *= 2;
  if (s.speedDown) sp *= 0.5;
  return sp;
}

/** buff/debuff의 stat을 statuses 필드로 매핑한다 (프로토타입은 2배/절반 고정). */
function applyTimedStatus(
  c: Combatant,
  stat: "defense" | "attack" | "speed",
  turns: number,
): void {
  const key =
    stat === "defense"
      ? "defenseUp"
      : stat === "attack"
        ? "attackUp"
        : "speedUp";
  c.statuses ??= {};
  c.statuses[key] = turns;
}

function applyTargetDebuff(
  c: Combatant,
  stat: "defense" | "speed",
  turns: number,
): void {
  const key = stat === "defense" ? "defenseDown" : "speedDown";
  c.statuses ??= {};
  c.statuses[key] = turns;
}

export function tickAtb(gs: GameState, dtMs: number): void {
  const combat = gs.data.combat;
  if (!combat || combat.phase !== "active") return;
  for (const c of [combat.player, ...combat.enemies]) {
    if (!c.alive) continue;
    c.atb = Math.min(
      ATB_MAX,
      c.atb + effectiveSpeed(c) * dtMs * ATB_RATE,
    );
  }
}

function calcDamage(
  attack: number,
  defense: number,
  luk: number,
): number {
  const critChance = 0.05 + luk * 0.01;
  const isCrit = Math.random() < critChance;
  const base = attack - defense * 0.5 + (Math.random() * 4 - 2);
  const dmg = Math.max(1, Math.round(base));
  return isCrit ? dmg * 2 : dmg;
}

function checkEnd(gs: GameState): void {
  const combat = gs.data.combat;
  if (!combat || combat.phase !== "active") return;

  const player = gs.getState().player!;
  combat.player.hp = player.hp;
  combat.player.alive = player.hp > 0;

  if (player.hp <= 0) {
    combat.phase = "lost";
    gs.bus.emit("player:died");
    return;
  }
  if (combat.enemies.every((e) => !e.alive || e.hp <= 0)) {
    combat.phase = "won";
    let exp = 0;
    let gold = 0;
    for (const e of combat.enemies) {
      const def = e.monsterId ? MONSTERS[e.monsterId] : undefined;
      if (!def) continue;
      exp += def.expReward;
      gold +=
        def.goldReward[0] +
        Math.floor(
          Math.random() * (def.goldReward[1] - def.goldReward[0] + 1),
        );
    }
    addExp(gs, exp);
    player.gold += gold;
    gs.bus.emit("combat:ended", { result: "won", exp, gold });
  }
}

function lowestHpEnemy(combat: CombatState): Combatant | undefined {
  return combat.enemies
    .filter((e) => e.alive && e.hp > 0)
    .sort((a, b) => a.hp - b.hp)[0];
}

export function playerAttack(
  gs: GameState,
  targetId: string,
): { damage: number; killed: boolean } {
  const combat = gs.data.combat;
  if (!combat || combat.phase !== "active") {
    throw new Error("No active combat");
  }
  if (combat.player.atb < ATB_MAX) {
    throw new Error("Player ATB not ready");
  }
  const target = combat.enemies.find((e) => e.id === targetId);
  if (!target || !target.alive || target.hp <= 0) {
    throw new Error(`Invalid target: ${targetId}`);
  }

  // 상태이상 1틱: 중독 피해 등으로 전투가 끝날 수 있으므로 선처리한다.
  tickStatuses(gs);
  checkEnd(gs);
  if (gs.data.combat!.phase !== "active") {
    return { damage: 0, killed: false };
  }
  if (!target.alive || target.hp <= 0) {
    return { damage: 0, killed: true };
  }

  const player = gs.getState().player!;
  const damage = calcDamage(
    effectiveAttack(combat.player),
    effectiveDefense(target),
    player.stats.luk,
  );
  target.hp = Math.max(0, target.hp - damage);
  if (target.hp <= 0) target.alive = false;
  combat.player.atb = 0;
  combat.turn += 1;
  const killed = !target.alive;
  checkEnd(gs);
  return { damage, killed };
}

export interface SkillCastResult {
  damage?: number;
  healed?: number;
  killed?: boolean;
}

/**
 * 플레이어 스킬 시전.
 * - playerAttack과 동일하게 ATB 100 게이트를 사용한다.
 * - 스킬은 소유 클래스(classId)와 MP가 충분해야 한다 (MP 부족 시 Error).
 * - MP는 PlayerState.mp와 Combatant.mp 양쪽에서 소모한다.
 * - damageMultiplier 스킬은 targetId(생략 시 HP 최저 적)에게 피해,
 *   healPercent는 자신을 회복, buff/debuff/dot은 statuses에 턴 수와 함께 적용된다.
 */
export function playerCastSkill(
  gs: GameState,
  skillId: string,
  targetId?: string,
): SkillCastResult {
  const combat = gs.data.combat;
  if (!combat || combat.phase !== "active") {
    throw new Error("No active combat");
  }
  if (combat.player.atb < ATB_MAX) {
    throw new Error("Player ATB not ready");
  }

  const player = gs.getState().player!;
  const skill: SkillDef = getSkill(skillId);
  if (skill.classId !== player.classId) {
    throw new Error(`Skill not usable by class: ${skillId}`);
  }
  if (player.mp < skill.mpCost) {
    throw new Error("MP 부족");
  }

  // 피해/디버프/중독이 필요한 스킬은 대상을 미리 결정한다.
  let target: Combatant | undefined;
  const needsTarget =
    skill.damageMultiplier !== undefined ||
    skill.debuff !== undefined ||
    skill.dot !== undefined;
  if (needsTarget) {
    if (targetId !== undefined) {
      target = combat.enemies.find((e) => e.id === targetId);
      if (!target || !target.alive || target.hp <= 0) {
        throw new Error(`Invalid target: ${targetId}`);
      }
    } else {
      target = lowestHpEnemy(combat);
      if (!target) throw new Error("No valid target");
    }
  }

  // 상태이상 1틱 (이전 턴에 걸린 중독/버프 경과 처리).
  tickStatuses(gs);
  checkEnd(gs);
  if (gs.data.combat!.phase !== "active") {
    return {};
  }
  if (target && (!target.alive || target.hp <= 0)) {
    return { killed: true };
  }

  // 비용/게이지 소비 후 효과 적용.
  player.mp = Math.max(0, player.mp - skill.mpCost);
  combat.player.mp = Math.max(0, combat.player.mp - skill.mpCost);
  combat.player.atb = 0;
  combat.turn += 1;

  const result: SkillCastResult = {};

  if (skill.damageMultiplier !== undefined && target) {
    const damage = calcDamage(
      combat.player.attack * skill.damageMultiplier,
      effectiveDefense(target),
      player.stats.luk,
    );
    target.hp = Math.max(0, target.hp - damage);
    if (target.hp <= 0) target.alive = false;
    result.damage = damage;
    result.killed = !target.alive;
  }

  if (skill.healPercent !== undefined) {
    const heal = Math.min(
      player.maxHp - player.hp,
      Math.max(0, Math.round((player.maxHp * skill.healPercent) / 100)),
    );
    player.hp += heal;
    combat.player.hp = player.hp;
    result.healed = heal;
  }

  if (skill.buff) {
    applyTimedStatus(combat.player, skill.buff.stat, skill.buff.turns);
  }

  if (target) {
    if (skill.debuff) {
      applyTargetDebuff(target, skill.debuff.stat, skill.debuff.turns);
    }
    if (skill.dot) {
      target.statuses ??= {};
      target.statuses.poisoned = {
        damage: skill.dot.damage,
        turns: skill.dot.turns,
      };
    }
  }

  checkEnd(gs);
  return result;
}

export function enemyTurn(gs: GameState): { damage: number } {
  const combat = gs.data.combat;
  if (!combat || combat.phase !== "active") {
    throw new Error("No active combat");
  }

  // 상태이상 1틱: 중독으로 적이 죽거나 전투가 끝날 수 있으므로 선처리한다.
  tickStatuses(gs);
  checkEnd(gs);
  if (gs.data.combat!.phase !== "active") {
    return { damage: 0 };
  }

  // Simplest prototype rule: the living enemy with the lowest HP attacks.
  const attacker = lowestHpEnemy(combat);
  if (!attacker) {
    checkEnd(gs);
    return { damage: 0 };
  }

  const damage = calcDamage(
    effectiveAttack(attacker),
    effectiveDefense(combat.player),
    0,
  );
  const player = gs.getState().player!;
  player.hp = Math.max(0, player.hp - damage);
  attacker.atb = 0;
  combat.turn += 1;
  checkEnd(gs);
  return { damage };
}
