import { GameState } from "./core/gameState";
import { SceneManager } from "./engine/scene";
import { PlayerController } from "./engine/playerController";
import { InputManager } from "./input/input";

const MAX_DT = 0.05;

/**
 * Wires the Three.js scene, player controller, input, and game state
 * into a requestAnimationFrame loop. Uses variable dt clamped to 50ms;
 * a fixed-timestep simulation is deferred to a later task.
 */
export function bootstrap(): void {
  const container = document.getElementById("canvas-container");
  if (!container) {
    throw new Error("#canvas-container not found");
  }

  const canvas = document.createElement("canvas");
  container.appendChild(canvas);

  const sceneManager = new SceneManager(canvas);
  const inputManager = new InputManager(document.body);
  const playerController = new PlayerController(sceneManager.camera, canvas);
  const gameState = new GameState();

  sceneManager.followTarget = playerController.group;
  inputManager.attach();
  void sceneManager.setZone("greenfield");

  const onResize = (): void => sceneManager.resize();
  window.addEventListener("resize", onResize);

  let last = performance.now();
  const loop = (now: number): void => {
    const dt = Math.min((now - last) / 1000, MAX_DT);
    last = now;

    playerController.update(dt, inputManager.state);
    const pos = playerController.getPosition();
    gameState.dispatch({ type: "setPosition", ...pos });

    sceneManager.update(dt);
    sceneManager.render();

    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
