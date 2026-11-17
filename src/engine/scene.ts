import * as THREE from "three";
import { getZone } from "../data/zones";
import type { ZoneDef } from "../data/zones";

const CAMERA_OFFSET = new THREE.Vector3(0, 12, 14);
const CAMERA_LERP = 4;

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Deterministic pseudo-random point inside the zone square using an LCG
 * seeded by the zone id, so a given zone always renders the same layout.
 */
function seededPoint(
  zoneId: string,
  index: number,
  size: number,
): [number, number] {
  let state = hashString(zoneId) ^ Math.imul(index + 1, 0x9e3779b1);
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
  const margin = size * 0.15;
  const span = size - margin * 2;
  const x = margin + next() * span;
  const z = margin + next() * span;
  return [x - size / 2, z - size / 2];
}

/**
 * Owns the Three.js renderer, scene, camera, lights, and zone content.
 * The camera follows `followTarget` (set by the app to the player group)
 * from a fixed elevated offset.
 */
export class SceneManager {
  readonly camera: THREE.PerspectiveCamera;

  followTarget: THREE.Object3D | null = null;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly zoneRoot = new THREE.Group();
  private readonly camGoal = new THREE.Vector3();

  private zone: ZoneDef;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.shadowMap.enabled = true;

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      500,
    );
    this.camera.position.copy(CAMERA_OFFSET);

    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 60, 160);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x446644, 0.9);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(20, 40, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    this.scene.add(sun);

    this.zone = getZone("greenfield");
    this.scene.add(this.zoneRoot);
    this.buildZone();
  }

  async setZone(zoneId: string): Promise<void> {
    try {
      this.zone = getZone(zoneId);
    } catch {
      this.zone = getZone("greenfield");
    }
    this.buildZone();
  }

  addToZone(obj: THREE.Object3D): void {
    this.zoneRoot.add(obj);
  }

  removeFromZone(obj: THREE.Object3D): void {
    this.zoneRoot.remove(obj);
  }

  private buildZone(): void {
    const zone = this.zone;
    this.zoneRoot.clear();

    this.scene.background = new THREE.Color(zone.fogColor);
    this.scene.fog = new THREE.Fog(zone.fogColor, zone.fogNear, zone.fogFar);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(zone.size, zone.size),
      new THREE.MeshLambertMaterial({ color: zone.groundColor }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.zoneRoot.add(ground);

    // Placeholder obstacles, deterministically laid out per zone.
    const obstacleMat = new THREE.MeshLambertMaterial({ color: 0x8b6f47 });
    for (let i = 0; i < 8; i++) {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 1.5, 1.5),
        obstacleMat,
      );
      const [x, z] = seededPoint(zone.id, i, zone.size);
      box.position.set(x, 0.75, z);
      box.castShadow = true;
      this.zoneRoot.add(box);
    }

    // Portals.
    const portalMat = new THREE.MeshBasicMaterial({ color: 0x4a3a6b });
    for (const portal of zone.portals) {
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(1, 1, 0.2, 16),
        portalMat,
      );
      mesh.position.set(portal.x, 0.1, portal.z);
      mesh.userData.portal = portal;
      this.zoneRoot.add(mesh);
    }
  }

  update(dt: number): void {
    if (!this.followTarget) return;
    this.camGoal
      .copy(this.followTarget.position)
      .add(CAMERA_OFFSET);
    const t = 1 - Math.exp(-CAMERA_LERP * dt);
    this.camera.position.lerp(this.camGoal, t);
    this.camera.lookAt(this.followTarget.position);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  dispose(): void {
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
