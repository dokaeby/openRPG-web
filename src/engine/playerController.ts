import * as THREE from "three";
import type { InputState } from "../input/input";

const WALK_SPEED = 5;
const RUN_SPEED = 8;

const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _move = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

/**
 * Third-person-style player mover. WASD input is interpreted relative to
 * the camera's ground-plane orientation; Shift runs.
 */
export class PlayerController {
  readonly group = new THREE.Group();
  readonly velocity = new THREE.Vector3();
  readonly domElement: HTMLElement;

  private readonly camera: THREE.Camera;

  constructor(camera: THREE.Camera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.4, 0.8, 4, 12),
      new THREE.MeshLambertMaterial({ color: 0x4488ff }),
    );
    body.position.y = 0.8;
    body.castShadow = true;
    this.group.add(body);
  }

  update(dt: number, input: InputState): void {
    const ix = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const iz = (input.forward ? 1 : 0) - (input.back ? 1 : 0);

    if (ix === 0 && iz === 0) {
      this.velocity.set(0, 0, 0);
      return;
    }

    // Camera forward projected onto the ground plane.
    this.camera.getWorldDirection(_forward);
    _forward.y = 0;
    if (_forward.lengthSq() < 1e-8) {
      _forward.set(0, 0, -1);
    } else {
      _forward.normalize();
    }
    // Camera right = forward x up.
    _right.crossVectors(_forward, _up);

    _move
      .set(0, 0, 0)
      .addScaledVector(_forward, iz)
      .addScaledVector(_right, ix);
    if (_move.lengthSq() > 1) {
      _move.normalize();
    }

    const speed = input.run ? RUN_SPEED : WALK_SPEED;
    this.velocity.copy(_move).multiplyScalar(speed);
    this.group.position.addScaledVector(this.velocity, dt);
    this.group.position.y = 0;

    // Face the movement direction.
    const targetYaw = Math.atan2(_move.x, _move.z);
    this.group.rotation.y = targetYaw;
  }

  getPosition(): { x: number; y: number; z: number } {
    const p = this.group.position;
    return { x: p.x, y: p.y, z: p.z };
  }
}
