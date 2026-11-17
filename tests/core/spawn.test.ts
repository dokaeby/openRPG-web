import { describe, it, expect } from "vitest";
import { ZONES } from "../../src/data/zones";
import {
  createSpawnState,
  tickSpawns,
  markKilled,
} from "../../src/core/spawn";

describe("createSpawnState", () => {
  it("creates one node per spawn point, all alive", () => {
    const nodes = createSpawnState(ZONES.greenfield);
    expect(nodes.length).toBe(ZONES.greenfield.spawnPoints.length);
    expect(nodes.every((n) => n.alive)).toBe(true);
    expect(nodes[0].monsterId).toBe(
      ZONES.greenfield.spawnPoints[0].monsterId,
    );
  });

  it("creates empty state for zones without spawns", () => {
    expect(createSpawnState(ZONES.village).length).toBe(0);
  });
});

describe("tickSpawns", () => {
  it("returns empty before respawn time elapses", () => {
    const nodes = createSpawnState(ZONES.greenfield);
    markKilled(nodes, "goblin", -20, -30, 0);
    expect(tickSpawns(nodes, 10_000)).toEqual([]);
    expect(nodes[0].alive).toBe(false);
  });

  it("respawns nodes whose timer has elapsed", () => {
    const nodes = createSpawnState(ZONES.greenfield);
    const target = nodes.find((n) => n.monsterId === "slime")!;
    markKilled(nodes, "slime", target.x, target.z, 0);
    const respawned = tickSpawns(nodes, target.respawnSec * 1000);
    expect(respawned.length).toBe(1);
    expect(respawned[0]).toBe(target);
    expect(target.alive).toBe(true);
    expect(tickSpawns(nodes, target.respawnSec * 1000 + 1)).toEqual([]);
  });
});

describe("markKilled", () => {
  it("kills the nearest matching alive node and schedules respawn", () => {
    const nodes = createSpawnState(ZONES.greenfield);
    const nearest = nodes.find(
      (n) => n.monsterId === "goblin" && n.x === 5,
    )!;
    const farther = nodes.find(
      (n) => n.monsterId === "goblin" && n.x === -20,
    )!;
    markKilled(nodes, "goblin", 4, 39, 1000);
    expect(nearest.alive).toBe(false);
    expect(farther.alive).toBe(true);
    expect(nearest.respawnAtMs).toBe(1000 + nearest.respawnSec * 1000);
  });

  it("ignores dead nodes and unknown monster ids", () => {
    const nodes = createSpawnState(ZONES.greenfield);
    const node = nodes.find((n) => n.monsterId === "wolf");
    expect(node).toBeUndefined();
    markKilled(nodes, "dragon", 0, 0, 0);
    expect(nodes.every((n) => n.alive)).toBe(true);
  });
});
