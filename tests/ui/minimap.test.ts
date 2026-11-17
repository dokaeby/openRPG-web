import { describe, it, expect, beforeEach } from "vitest";
import { Minimap } from "../../src/ui/minimap";

const BOUNDS = { minX: -100, maxX: 100, minZ: -100, maxZ: 100 };

function markerCount(root: HTMLElement): number {
  return root.querySelectorAll(".minimap-marker").length;
}

describe("Minimap", () => {
  let root: HTMLElement;
  let minimap: Minimap;

  beforeEach(() => {
    root = document.createElement("div");
    document.body.append(root);
    minimap = new Minimap(root);
  });

  it("update() renders one dot per marker plus the player", () => {
    minimap.update({
      player: { x: 0, z: 0 },
      markers: [
        { x: 10, z: -10 },
        { x: -50, z: 50, color: "#4A3A6B", label: "포털" },
      ],
      bounds: BOUNDS,
    });
    expect(markerCount(root)).toBe(3);
    expect(root.querySelectorAll(".minimap-marker.player").length).toBe(1);
  });

  it("update() replaces previous markers on subsequent calls", () => {
    minimap.update({ player: { x: 0, z: 0 }, markers: [], bounds: BOUNDS });
    minimap.update({
      player: { x: 5, z: 5 },
      markers: [{ x: 1, z: 1 }],
      bounds: BOUNDS,
    });
    expect(markerCount(root)).toBe(2);
  });

  it("setZoneName shows the Korean zone name", () => {
    minimap.setZoneName("초록들판");
    expect(
      root.querySelector(".minimap-zone-name")?.textContent,
    ).toBe("초록들판");
  });

  it("show()/hide() toggle visibility", () => {
    expect(minimap.isVisible()).toBe(true);
    minimap.hide();
    expect(minimap.isVisible()).toBe(false);
    expect(root.querySelector(".minimap")?.classList.contains("hidden")).toBe(
      true,
    );
    minimap.show();
    expect(minimap.isVisible()).toBe(true);
    expect(root.querySelector(".minimap")?.classList.contains("hidden")).toBe(
      false,
    );
  });
});
