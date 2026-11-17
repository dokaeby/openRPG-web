import "./minimap.css";

export interface MinimapMarker {
  x: number;
  z: number;
  color?: string;
  label?: string;
}

export interface MinimapState {
  player: { x: number; z: number };
  markers: MinimapMarker[];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
}

export class Minimap {
  private readonly root: HTMLElement;
  private readonly field: HTMLElement;
  private readonly zoneName: HTMLElement;
  private visible = true;

  constructor(root: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "minimap";

    this.field = document.createElement("div");
    this.field.className = "minimap-field";
    this.root.append(this.field);

    this.zoneName = document.createElement("div");
    this.zoneName.className = "minimap-zone-name";
    this.root.append(this.zoneName);

    root.append(this.root);
  }

  update(state: MinimapState): void {
    const { player, markers, bounds } = state;
    this.field.replaceChildren();

    for (const marker of markers) {
      const dot = document.createElement("div");
      dot.className = "minimap-marker";
      if (marker.color) dot.style.background = marker.color;
      if (marker.label) dot.title = marker.label;
      this.positionDot(dot, marker.x, marker.z, bounds);
      this.field.append(dot);
    }

    const playerDot = document.createElement("div");
    playerDot.className = "minimap-marker player";
    this.positionDot(playerDot, player.x, player.z, bounds);
    this.field.append(playerDot);
  }

  setZoneName(name: string): void {
    this.zoneName.textContent = name;
  }

  show(): void {
    this.visible = true;
    this.root.classList.remove("hidden");
  }

  hide(): void {
    this.visible = false;
    this.root.classList.add("hidden");
  }

  isVisible(): boolean {
    return this.visible;
  }

  private positionDot(
    dot: HTMLElement,
    x: number,
    z: number,
    bounds: MinimapState["bounds"],
  ): void {
    const spanX = bounds.maxX - bounds.minX || 1;
    const spanZ = bounds.maxZ - bounds.minZ || 1;
    const left = ((x - bounds.minX) / spanX) * 100;
    const top = ((z - bounds.minZ) / spanZ) * 100;
    dot.style.left = `${Math.min(100, Math.max(0, left))}%`;
    dot.style.top = `${Math.min(100, Math.max(0, top))}%`;
  }
}

export function createMinimap(root: HTMLElement): Minimap {
  return new Minimap(root);
}
