import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { PlayerController } from "../../src/engine/playerController";
import type { InputState } from "../../src/input/input";

function makeInput(overrides: Partial<InputState> = {}): InputState {
  return {
    forward: false,
    back: false,
    left: false,
    right: false,
    run: false,
    ...overrides,
  };
}

describe("PlayerController", () => {
  it("moves forward when input.forward is true", () => {
    const cam = new THREE.PerspectiveCamera();
    const el = document.createElement("div");
    const pc = new PlayerController(cam, el);
    pc.update(0.1, makeInput({ forward: true }));
    const pos = pc.getPosition();
    // Default camera looks down -Z, so forward moves the player on -Z.
    expect(pos.z).toBeLessThan(0);
  });

  it("moves backward when input.back is true", () => {
    const cam = new THREE.PerspectiveCamera();
    const el = document.createElement("div");
    const pc = new PlayerController(cam, el);
    pc.update(0.1, makeInput({ back: true }));
    const pos = pc.getPosition();
    expect(pos.z).toBeGreaterThan(0);
  });

  it("moves right when input.right is true", () => {
    const cam = new THREE.PerspectiveCamera();
    const el = document.createElement("div");
    const pc = new PlayerController(cam, el);
    pc.update(0.1, makeInput({ right: true }));
    const pos = pc.getPosition();
    expect(pos.x).toBeGreaterThan(0);
  });

  it("does not move when no input is pressed", () => {
    const cam = new THREE.PerspectiveCamera();
    const el = document.createElement("div");
    const pc = new PlayerController(cam, el);
    pc.update(0.1, makeInput());
    const pos = pc.getPosition();
    expect(pos.x).toBe(0);
    expect(pos.y).toBe(0);
    expect(pos.z).toBe(0);
  });

  it("walks at speed 5 and runs at speed 8", () => {
    const cam = new THREE.PerspectiveCamera();
    const el = document.createElement("div");

    const walker = new PlayerController(cam, el);
    walker.update(1, makeInput({ forward: true }));
    expect(walker.getPosition().z).toBeCloseTo(-5, 5);

    const runner = new PlayerController(cam, el);
    runner.update(1, makeInput({ forward: true, run: true }));
    expect(runner.getPosition().z).toBeCloseTo(-8, 5);
  });

  it("moves camera-relative", () => {
    const cam = new THREE.PerspectiveCamera();
    // Point the camera so its forward is world -X instead of -Z.
    cam.lookAt(-1, 0, 0);
    cam.updateMatrixWorld();
    const el = document.createElement("div");
    const pc = new PlayerController(cam, el);
    pc.update(0.1, makeInput({ forward: true }));
    const pos = pc.getPosition();
    expect(pos.x).toBeLessThan(0);
    expect(pos.z).toBeCloseTo(0, 10);
  });
});
