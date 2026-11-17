import * as THREE from "three";
import { tickAtb } from "../core/combat";
import type { GameState } from "../core/gameState";
import type { SceneManager } from "./scene";

const ENEMY_SPACING = 2;
const ATB_READY = 100;

/**
 * Glue between GameState combat actions and the Three.js scene.
 * Owns enemy placeholder meshes and drives ATB ticks / enemy turns.
 */
export class CombatBridge {
  readonly enemyMeshes = new Map<string, THREE.Object3D>();

  private readonly gs: GameState;
  private readonly scene: SceneManager;
  private inCombat = false;

  constructor(gs: GameState, scene: SceneManager) {
    this.gs = gs;
    this.scene = scene;
  }

  startEncounter(monsterIds: string[]): void {
    this.gs.dispatch({ type: "startCombat", monsterIds });
    const combat = this.gs.getState().combat;
    if (!combat) return;

    const pz = this.gs.getState().player?.position.z ?? 0;
    combat.enemies.forEach((enemy, i) => {
      const mesh = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.4, 0.8, 4, 12),
        new THREE.MeshLambertMaterial({ color: 0xff4444 }),
      );
      mesh.position.set(
        (i - (combat.enemies.length - 1) / 2) * ENEMY_SPACING,
        0.8,
        pz + 3,
      );
      mesh.castShadow = true;
      this.scene.addToZone(mesh);
      this.enemyMeshes.set(enemy.id, mesh);
    });
    this.inCombat = true;
    this.gs.bus.emit("combat:started");
  }

  update(dtMs: number): void {
    const combat = this.gs.getState().combat;
    if (!combat || combat.phase !== "active") {
      if (this.inCombat) {
        this.end();
        this.gs.bus.emit("combat:bridge:ended");
      }
      return;
    }
    this.inCombat = true;

    tickAtb(this.gs, dtMs);

    // Prototype rule: any enemy with a full ATB gets a turn.
    if (combat.enemies.some((e) => e.alive && e.atb >= ATB_READY)) {
      this.onEnemyPhase();
    }
  }

  canPlayerAct(): boolean {
    const combat = this.gs.getState().combat;
    return combat?.phase === "active" && combat.player.atb >= ATB_READY;
  }

  onPlayerAttack(targetId?: string): void {
    const combat = this.gs.getState().combat;
    if (!combat || combat.phase !== "active") return;
    if (combat.player.atb < ATB_READY) return;

    const target =
      targetId ?? combat.enemies.find((e) => e.alive && e.hp > 0)?.id;
    if (!target) return;

    try {
      this.gs.dispatch({ type: "combatPlayerAttack", targetId: target });
    } catch {
      // ATB/target errors are ignored; UI polls canPlayerAct().
    }
  }

  onEnemyPhase(): void {
    const combat = this.gs.getState().combat;
    if (!combat || combat.phase !== "active") return;
    if (!combat.enemies.some((e) => e.alive && e.atb >= ATB_READY)) return;
    this.gs.dispatch({ type: "combatEnemyTurn" });
  }

  end(): void {
    for (const mesh of this.enemyMeshes.values()) {
      this.scene.removeFromZone(mesh);
    }
    this.enemyMeshes.clear();
    this.inCombat = false;
  }
}
