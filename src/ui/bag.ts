import type { PlayerState } from "../core/gameState";
import type { EquipSlot, ItemDef } from "../data/items";
import { getItem } from "../data/items";
import "./bag.css";

export interface BagAction {
  type: "use" | "equip" | "unequip";
  itemId?: string;
  slot?: EquipSlot;
}

export interface BagDeps {
  getPlayer: () => PlayerState | null;
  onAction: (action: BagAction) => void;
}

const SLOT_LABELS: Record<EquipSlot, string> = {
  weapon: "무기",
  offhand: "보조손",
  helmet: "투구",
  armor: "갑옷",
  gloves: "장갑",
  boots: "장화",
  ring: "반지",
  necklace: "목걸이",
};

const EQUIP_SLOTS = Object.keys(SLOT_LABELS) as EquipSlot[];

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export class BagUI {
  private readonly root: HTMLElement;
  private readonly deps: BagDeps;
  private panel: HTMLElement | null = null;
  private itemsList: HTMLElement | null = null;
  private equipList: HTMLElement | null = null;
  private goldLabel: HTMLElement | null = null;

  constructor(root: HTMLElement, deps: BagDeps) {
    this.root = root;
    this.deps = deps;
    this.build();
  }

  show(): void {
    if (!this.panel) return;
    this.refresh();
    this.panel.hidden = false;
  }

  hide(): void {
    if (this.panel) this.panel.hidden = true;
  }

  toggle(): void {
    if (this.panel?.hidden) {
      this.show();
    } else {
      this.hide();
    }
  }

  refresh(): void {
    if (!this.panel) return;
    const player = this.deps.getPlayer();
    if (!player) {
      this.panel.hidden = true;
      return;
    }
    if (this.goldLabel) {
      this.goldLabel.textContent = `골드 ${player.gold}`;
    }
    this.renderEquipment(player);
    this.renderItems(player);
  }

  private build(): void {
    const panel = el("div", "bag-panel");
    panel.hidden = true;

    const header = el("div", "bag-header");
    header.append(el("h2", undefined, "가방"));
    const goldLabel = el("span", "bag-gold");
    const closeBtn = el("button", "bag-close", "닫기");
    closeBtn.addEventListener("click", () => this.hide());
    header.append(goldLabel, closeBtn);
    this.goldLabel = goldLabel;
    panel.append(header);

    const equipSection = el("div");
    equipSection.append(el("div", "bag-section-title", "장착 중"));
    const equipList = el("div", "bag-equipment");
    this.equipList = equipList;
    equipSection.append(equipList);
    panel.append(equipSection);

    const itemSection = el("div");
    itemSection.append(el("div", "bag-section-title", "아이템"));
    const itemsList = el("ul", "bag-items");
    this.itemsList = itemsList;
    itemSection.append(itemsList);
    panel.append(itemSection);

    this.root.append(panel);
    this.panel = panel;
  }

  private renderEquipment(player: PlayerState): void {
    const list = this.equipList;
    if (!list) return;
    list.replaceChildren();
    for (const slot of EQUIP_SLOTS) {
      const itemId = player.equipment[slot];
      const row = el("div", "bag-equip-slot");
      row.append(el("span", "slot-label", SLOT_LABELS[slot]));
      let name: string;
      if (itemId) {
        name = getItem(itemId).name;
      } else {
        name = "비어 있음";
      }
      const nameEl = el("span", `slot-name${itemId ? "" : " empty"}`, name);
      row.append(nameEl);
      if (itemId) {
        const unequipBtn = el("button", undefined, "해제");
        unequipBtn.addEventListener("click", () => {
          this.deps.onAction({ type: "unequip", slot });
          this.refresh();
        });
        row.append(unequipBtn);
      }
      list.append(row);
    }
  }

  private renderItems(player: PlayerState): void {
    const list = this.itemsList;
    if (!list) return;
    list.replaceChildren();
    if (player.inventory.length === 0) {
      list.append(
        el("li", "bag-empty", "가방이 비어 있습니다."),
      );
      return;
    }
    for (const stack of player.inventory) {
      const def = getItem(stack.itemId);
      list.append(this.buildItemRow(def, stack.count));
    }
  }

  private buildItemRow(def: ItemDef, count: number): HTMLLIElement {
    const row = el("li", `bag-item rarity-${def.rarity}`);
    const info = el("div", "item-info");
    info.append(el("div", "item-name", def.name));
    const metaParts = [def.type, `${def.price}골드`];
    info.append(el("div", "item-meta", metaParts.join(" · ")));
    row.append(info);

    if (count > 1) {
      row.append(el("span", "item-count", `×${count}`));
    }

    if (def.type === "consumable") {
      const useBtn = el("button", "bag-action-use", "사용");
      useBtn.addEventListener("click", () => {
        this.deps.onAction({ type: "use", itemId: def.id });
        this.refresh();
      });
      row.append(useBtn);
    } else if (def.type === "equipment") {
      const equipBtn = el("button", "bag-action-equip", "장착");
      equipBtn.addEventListener("click", () => {
        this.deps.onAction({ type: "equip", itemId: def.id });
        this.refresh();
      });
      row.append(equipBtn);
    }
    return row;
  }
}

export function createBagUI(root: HTMLElement, deps: BagDeps): BagUI {
  return new BagUI(root, deps);
}
