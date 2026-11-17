import * as THREE from "three";

const GROUND_SIZE = 200;
const CAMERA_OFFSET = new THREE.Vector3(0, 12, 14);
const CAMERA_LERP = 4;

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

    this.scene.add(this.zoneRoot);
    this.buildZone();
  }

  async setZone(zoneId: string): Promise<void> {
    // Prototype: only "greenfield" has bespoke content; all other zone
    // ids reuse the same ground layout.
    void zoneId;
    this.buildZone();
  }

  private buildZone(): void {
    this.zoneRoot.clear();

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE),
      new THREE.MeshLambertMaterial({ color: 0x4a9e4a }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.zoneRoot.add(ground);

    // Placeholder obstacles.
    const obstacleMat = new THREE.MeshLambertMaterial({ color: 0x8b6f47 });
    const positions: [number, number, number][] = [
      [6, 0.75, -4],
      [-7, 0.75, 3],
      [2, 0.75, 9],
      [-3, 0.75, -10],
    ];
    for (const [x, y, z] of positions) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), obstacleMat);
      box.position.set(x, y, z);
      box.castShadow = true;
      this.zoneRoot.add(box);
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
