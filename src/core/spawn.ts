import type { ZoneDef } from "../data/zones";

export interface SpawnNode {
  monsterId: string;
  x: number;
  z: number;
  respawnSec: number;
  alive: boolean;
  respawnAtMs: number;
}

/**
 * Creates one spawn node per zone spawn point, all alive at t=0.
 */
export function createSpawnState(zone: ZoneDef): SpawnNode[] {
  return zone.spawnPoints.map((sp) => ({
    monsterId: sp.monsterId,
    x: sp.x,
    z: sp.z,
    respawnSec: sp.respawnSec,
    alive: true,
    respawnAtMs: 0,
  }));
}

/**
 * Marks dead nodes whose respawn timer has elapsed as alive again.
 * Returns only the nodes that respawned during this tick.
 */
export function tickSpawns(
  nodes: SpawnNode[],
  nowMs: number,
): SpawnNode[] {
  const respawned: SpawnNode[] = [];
  for (const node of nodes) {
    if (!node.alive && nowMs >= node.respawnAtMs) {
      node.alive = true;
      node.respawnAtMs = 0;
      respawned.push(node);
    }
  }
  return respawned;
}

/**
 * Kills the alive node closest to (x, z) among nodes matching
 * monsterId, and schedules its respawn.
 */
export function markKilled(
  nodes: SpawnNode[],
  monsterId: string,
  x: number,
  z: number,
  nowMs: number,
): void {
  let nearest: SpawnNode | null = null;
  let nearestDistSq = Infinity;
  for (const node of nodes) {
    if (!node.alive || node.monsterId !== monsterId) continue;
    const dx = node.x - x;
    const dz = node.z - z;
    const distSq = dx * dx + dz * dz;
    if (distSq < nearestDistSq) {
      nearestDistSq = distSq;
      nearest = node;
    }
  }
  if (nearest) {
    nearest.alive = false;
    nearest.respawnAtMs = nowMs + nearest.respawnSec * 1000;
  }
}
