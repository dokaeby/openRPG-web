import { describe, it, expect } from "vitest";
import { GameState } from "../../src/core/gameState";
import type { PlayerState } from "../../src/core/gameState";
import { addItem, equipItem } from "../../src/core/inventory";
import { BagUI } from "../../src/ui/bag";
import type { BagAction } from "../../src/ui/bag";

function makePlayer(): PlayerState {
  const gs = new GameState();
  return gs.dispatch({
    type: "createCharacter",
    name: "테스트",
    race: "orc",
    classId: "warrior",
  }) as PlayerState;
}

function setup(player: PlayerState) {
  const root = document.createElement("div");
  document.body.append(root);
  const actions: BagAction[] = [];
  const bag = new BagUI(root, {
    getPlayer: () => player,
    onAction: (a) => actions.push(a),
  });
  return { root, bag, actions };
}

describe("BagUI", () => {
  it("renders inventory items with Korean names when shown", () => {
    const p = makePlayer();
    addItem(p, "hp_potion_small", 3);
    addItem(p, "rusty_sword", 1);
    const { root, bag } = setup(p);

    bag.show();

    const panel = root.querySelector<HTMLElement>(".bag-panel")!;
    expect(panel.hidden).toBe(false);
    const text = root.textContent ?? "";
    expect(text).toContain("가방");
    expect(text).toContain("소형 체력 포션");
    expect(text).toContain("녹슨 검");
    expect(text).toContain("×3");
    expect(root.querySelector(".rarity-common")).not.toBeNull();
  });

  it("shows equipment section with equipped item and 해제 button", () => {
    const p = makePlayer();
    addItem(p, "rusty_sword", 1);
    equipItem(p, "rusty_sword");
    const { root, bag } = setup(p);

    bag.show();

    const text = root.textContent ?? "";
    expect(text).toContain("장착 중");
    expect(text).toContain("녹슨 검");
    expect(text).toContain("해제");
  });

  it("사용 button fires use action", () => {
    const p = makePlayer();
    addItem(p, "hp_potion_small", 1);
    const { root, bag, actions } = setup(p);

    bag.show();
    const useBtn = root.querySelector<HTMLButtonElement>(".bag-action-use")!;
    useBtn.click();

    expect(actions).toEqual([{ type: "use", itemId: "hp_potion_small" }]);
  });

  it("장착 button fires equip action", () => {
    const p = makePlayer();
    addItem(p, "rusty_sword", 1);
    const { root, bag, actions } = setup(p);

    bag.show();
    const equipBtn = root.querySelector<HTMLButtonElement>(".bag-action-equip")!;
    equipBtn.click();

    expect(actions).toEqual([{ type: "equip", itemId: "rusty_sword" }]);
  });

  it("해제 button fires unequip action with slot", () => {
    const p = makePlayer();
    addItem(p, "rusty_sword", 1);
    equipItem(p, "rusty_sword");
    const { root, bag, actions } = setup(p);

    bag.show();
    const unequipBtn = root.querySelector<HTMLButtonElement>(
      ".bag-equip-slot button",
    )!;
    unequipBtn.click();

    expect(actions).toEqual([{ type: "unequip", slot: "weapon" }]);
  });

  it("toggle shows and hides the panel", () => {
    const p = makePlayer();
    const { root, bag } = setup(p);
    const panel = root.querySelector<HTMLElement>(".bag-panel")!;

    expect(panel.hidden).toBe(true);
    bag.toggle();
    expect(panel.hidden).toBe(false);
    bag.toggle();
    expect(panel.hidden).toBe(true);
    bag.show();
    expect(panel.hidden).toBe(false);
    bag.hide();
    expect(panel.hidden).toBe(true);
  });
});
