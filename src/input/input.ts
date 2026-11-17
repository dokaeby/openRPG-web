export interface InputState {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  run: boolean;
}

const KEY_MAP: Record<string, keyof InputState> = {
  KeyW: "forward",
  ArrowUp: "forward",
  KeyS: "back",
  ArrowDown: "back",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
  ShiftLeft: "run",
  ShiftRight: "run",
};

/**
 * Tracks WASD + Shift key state. Listeners attach to the target's owner
 * document so key events are caught regardless of which element has focus.
 */
export class InputManager {
  readonly state: InputState = {
    forward: false,
    back: false,
    left: false,
    right: false,
    run: false,
  };

  private readonly doc: Document;
  private attached = false;

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    const key = KEY_MAP[e.code];
    if (key) {
      this.state[key] = true;
      e.preventDefault();
    }
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    const key = KEY_MAP[e.code];
    if (key) {
      this.state[key] = false;
    }
  };

  private readonly onBlur = (): void => {
    this.reset();
  };

  constructor(target: HTMLElement) {
    this.doc = target.ownerDocument;
  }

  attach(): void {
    if (this.attached) return;
    this.doc.addEventListener("keydown", this.onKeyDown);
    this.doc.addEventListener("keyup", this.onKeyUp);
    this.doc.defaultView?.addEventListener("blur", this.onBlur);
    this.attached = true;
  }

  detach(): void {
    if (!this.attached) return;
    this.doc.removeEventListener("keydown", this.onKeyDown);
    this.doc.removeEventListener("keyup", this.onKeyUp);
    this.doc.defaultView?.removeEventListener("blur", this.onBlur);
    this.attached = false;
    this.reset();
  }

  reset(): void {
    this.state.forward = false;
    this.state.back = false;
    this.state.left = false;
    this.state.right = false;
    this.state.run = false;
  }
}
