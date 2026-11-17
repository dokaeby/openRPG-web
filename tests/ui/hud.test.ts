import { describe, it, expect, vi, afterEach } from "vitest";
import { GameState } from "../../src/core/gameState";
import { Hud } from "../../src/ui/hud";
import { CharacterCreateUI } from "../../src/ui/characterCreate";

function makePlayer(gs: GameState): void {
  gs.dispatch({
    type: "createCharacter",
    name: "테스트",
    race: "orc",
    classId: "warrior",
  });
}

afterEach(() => {
  vi.useRealTimers();
});

describe("Hud", () => {
  it("hud displays player hp/mp", () => {
    const root = document.createElement("div");
    const hud = new Hud(root);
    const gs = new GameState();
    makePlayer(gs);

    hud.update(gs);

    const text = root.textContent ?? "";
    expect(text).toContain("HP");
    expect(text).toContain("MP");
    const p = gs.getState().player!;
    expect(text).toContain(String(Math.floor(p.hp)));
    expect(text).toContain(String(Math.floor(p.maxHp)));
  });

  it("hud shows combat enemies", () => {
    const root = document.createElement("div");
    const hud = new Hud(root);
    const gs = new GameState();
    makePlayer(gs);
    gs.dispatch({ type: "startCombat", monsterIds: ["goblin"] });

    hud.update(gs);

    expect(root.textContent).toContain("고블린");
    expect(root.textContent).toContain("공격 준비");
  });

  it("toast adds and removes message", () => {
    vi.useFakeTimers();
    const root = document.createElement("div");
    const hud = new Hud(root);

    hud.toast("안녕");
    expect(root.textContent).toContain("안녕");

    vi.advanceTimersByTime(3100);
    expect(root.textContent).not.toContain("안녕");
  });
});

describe("CharacterCreateUI", () => {
  it("character create calls onComplete", () => {
    const root = document.createElement("div");
    const cb = vi.fn();
    const ui = new CharacterCreateUI(root, cb);
    ui.show();

    const input = root.querySelector<HTMLInputElement>(".cc-name-input")!;
    input.value = "  용사  ";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    root
      .querySelector<HTMLElement>('[data-race="orc"]')!
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    root
      .querySelector<HTMLElement>('[data-class="warrior"]')!
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));

    const btn = root.querySelector<HTMLButtonElement>(".cc-create-btn")!;
    expect(btn.disabled).toBe(false);
    btn.click();

    expect(cb).toHaveBeenCalledWith("용사", "orc", "warrior");
  });
});
