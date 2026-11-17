import { describe, it, expect } from "vitest";
import { GameState } from "../../src/core/gameState";
import {
  addItem,
  removeItem,
  countItem,
  useItem,
  equipItem,
  unequipItem,
  equipmentBonuses,
} from "../../src/core/inventory";
import type { PlayerState } from "../../src/core/gameState";

function makePlayer(): PlayerState {
  const gs = new GameState();
  return gs.dispatch({
    type: "createCharacter",
    name: "테스트",
    race: "orc",
    classId: "warrior",
  }) as PlayerState;
}

describe("inventory", () => {
  it("addItem merges stacks", () => {
    const p = makePlayer();
    addItem(p, "hp_potion_small", 3);
    addItem(p, "hp_potion_small", 2);
    expect(countItem(p, "hp_potion_small")).toBe(5);
    expect(p.inventory).toHaveLength(1);
  });

  it("addItem throws on unknown item", () => {
    const p = makePlayer();
    expect(() => addItem(p, "no_such_item")).toThrow();
  });

  it("removeItem returns false when insufficient", () => {
    const p = makePlayer();
    addItem(p, "hp_potion_small", 2);
    expect(removeItem(p, "hp_potion_small", 3)).toBe(false);
    expect(countItem(p, "hp_potion_small")).toBe(2);
    expect(removeItem(p, "hp_potion_small", 2)).toBe(true);
    expect(countItem(p, "hp_potion_small")).toBe(0);
    expect(p.inventory).toHaveLength(0);
  });

  it("useItem heals hp and clamps to max", () => {
    const p = makePlayer();
    addItem(p, "hp_potion_small", 1);
    p.hp = p.maxHp - 10;
    const res = useItem(p, "hp_potion_small");
    expect(res.ok).toBe(true);
    expect(res.healedHp).toBe(10);
    expect(p.hp).toBe(p.maxHp);
    expect(countItem(p, "hp_potion_small")).toBe(0);
  });

  it("useItem heals mp", () => {
    const p = makePlayer();
    addItem(p, "mp_potion", 1);
    p.mp = 0;
    const res = useItem(p, "mp_potion");
    expect(res.ok).toBe(true);
    expect(p.mp).toBe(50);
  });

  it("useItem fails when nothing to restore", () => {
    const p = makePlayer();
    addItem(p, "hp_potion_small", 1);
    p.hp = p.maxHp;
    const res = useItem(p, "hp_potion_small");
    expect(res.ok).toBe(false);
    expect(res.reason).toBeTruthy();
    expect(countItem(p, "hp_potion_small")).toBe(1);
  });

  it("useItem fails on non-consumable", () => {
    const p = makePlayer();
    addItem(p, "rusty_sword", 1);
    const res = useItem(p, "rusty_sword");
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("사용할 수 없는 아이템입니다");
  });

  it("equipItem equips and swaps existing slot item", () => {
    const p = makePlayer();
    addItem(p, "rusty_sword", 1);
    addItem(p, "iron_helmet", 1);
    addItem(p, "leather_helm", 1);
    const r1 = equipItem(p, "rusty_sword");
    expect(r1.ok).toBe(true);
    expect(p.equipment.weapon).toBe("rusty_sword");

    // 같은 슬롯에 다른 장비를 장착하면 기존 아이템이 인벤토리로
    const r2 = equipItem(p, "iron_helmet");
    expect(r2.ok).toBe(true);
    expect(p.equipment.helmet).toBe("iron_helmet");
    expect(countItem(p, "iron_helmet")).toBe(0);

    const r3 = equipItem(p, "leather_helm");
    expect(r3.ok).toBe(true);
    expect(r3.swapped).toBe("iron_helmet");
    expect(p.equipment.helmet).toBe("leather_helm");
    expect(countItem(p, "iron_helmet")).toBe(1);
  });

  it("equipItem rejects items the class cannot use", () => {
    const gs = new GameState();
    const mage = gs.dispatch({
      type: "createCharacter",
      name: "마법사",
      race: "human",
      classId: "mage",
    }) as PlayerState;
    addItem(mage, "rusty_sword", 1);
    const res = equipItem(mage, "rusty_sword");
    expect(res.ok).toBe(false);
    expect(res.reason).toBeTruthy();
    expect(countItem(mage, "rusty_sword")).toBe(1);
  });

  it("equipItem equips offhand without weapon type restriction", () => {
    const p = makePlayer();
    addItem(p, "wooden_shield", 1); // offhand — weaponType 없음
    const r1 = equipItem(p, "wooden_shield");
    expect(r1.ok).toBe(true);
    expect(p.equipment.offhand).toBe("wooden_shield");
  });

  it("equipItem fails for non-equipment", () => {
    const p = makePlayer();
    addItem(p, "hp_potion_small", 1);
    const res = equipItem(p, "hp_potion_small");
    expect(res.ok).toBe(false);
  });

  it("unequipItem returns item to inventory", () => {
    const p = makePlayer();
    addItem(p, "rusty_sword", 1);
    equipItem(p, "rusty_sword");
    expect(p.equipment.weapon).toBe("rusty_sword");
    const res = unequipItem(p, "weapon");
    expect(res.ok).toBe(true);
    expect(p.equipment.weapon).toBeUndefined();
    expect(countItem(p, "rusty_sword")).toBe(1);
  });

  it("unequipItem fails on empty slot", () => {
    const p = makePlayer();
    const res = unequipItem(p, "boots");
    expect(res.ok).toBe(false);
  });

  it("equipmentBonuses sums equipped statBonus", () => {
    const p = makePlayer();
    addItem(p, "rusty_sword", 1);
    addItem(p, "wooden_shield", 1);
    addItem(p, "iron_helmet", 1);
    equipItem(p, "rusty_sword");
    equipItem(p, "wooden_shield");
    equipItem(p, "iron_helmet");
    const bonuses = equipmentBonuses(p);
    // rusty_sword attack 3 + wooden_shield defense 3 vit 1 + iron_helmet defense 8 vit 2 hp 20
    expect(bonuses.attack).toBe(3);
    expect(bonuses.defense).toBe(11);
    expect(bonuses.vit).toBe(3);
    expect(bonuses.hp).toBe(20);
  });
});
