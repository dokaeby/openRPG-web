import { MONSTERS } from "../data/monsters";
import type { MonsterDef } from "../data/monsters";
import { addExp } from "./progression";
import type { GameState } from "./gameState";

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

export function tickAtb(gs: GameState, dtMs: number): void {
  const combat = gs.data.combat;
  if (!combat || combat.phase !== "active") return;
  for (const c of [combat.player, ...combat.enemies]) {
    if (!c.alive) continue;
    c.atb = Math.min(ATB_MAX, c.atb + c.speed * dtMs * ATB_RATE);
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

  const player = gs.getState().player!;
  const damage = calcDamage(
    combat.player.attack,
    target.defense,
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

export function enemyTurn(gs: GameState): { damage: number } {
  const combat = gs.data.combat;
  if (!combat || combat.phase !== "active") {
    throw new Error("No active combat");
  }
  // Simplest prototype rule: the living enemy with the lowest HP attacks.
  const attacker = combat.enemies
    .filter((e) => e.alive && e.hp > 0)
    .sort((a, b) => a.hp - b.hp)[0];
  if (!attacker) {
    checkEnd(gs);
    return { damage: 0 };
  }

  const player = gs.getState().player!;
  const damage = calcDamage(attacker.attack, combat.player.defense, 0);
  player.hp = Math.max(0, player.hp - damage);
  attacker.atb = 0;
  combat.turn += 1;
  checkEnd(gs);
  return { damage };
}
