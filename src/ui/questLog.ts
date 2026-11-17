import type { QuestDef, QuestType } from "../data/quests";
import type { QuestEntry } from "../core/quest";
import "./questLog.css";

export interface QuestListItem {
  def: QuestDef;
  entry: QuestEntry | null;
  available: boolean;
}

export interface QuestLogDeps {
  getQuests: () => QuestListItem[];
  onAction: (action: "accept" | "abandon", questId: string) => void;
}

const TYPE_LABELS: Record<QuestType, string> = {
  main: "메인",
  side: "사이드",
  daily: "일일",
  race: "종족",
};

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

export class QuestLogUI {
  private readonly root: HTMLElement;
  private readonly deps: QuestLogDeps;
  private panel: HTMLElement | null = null;
  private availableList: HTMLElement | null = null;
  private activeList: HTMLElement | null = null;
  private completedList: HTMLElement | null = null;

  constructor(root: HTMLElement, deps: QuestLogDeps) {
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
    if (!this.availableList || !this.activeList || !this.completedList) {
      return;
    }
    this.availableList.replaceChildren();
    this.activeList.replaceChildren();
    this.completedList.replaceChildren();

    const quests = this.deps.getQuests();
    for (const item of quests) {
      const { def, entry, available } = item;
      if (entry?.state === "completed") {
        this.completedList.append(this.buildCompletedRow(def));
      } else if (entry?.state === "active") {
        this.activeList.append(this.buildActiveRow(def, entry));
      } else if (available) {
        this.availableList.append(this.buildAvailableRow(def));
      }
    }

    this.setEmpty(this.availableList, "수락 가능한 퀘스트가 없습니다.");
    this.setEmpty(this.activeList, "진행 중인 퀘스트가 없습니다.");
    this.setEmpty(this.completedList, "완료한 퀘스트가 없습니다.");
  }

  private setEmpty(list: HTMLElement, text: string): void {
    if (list.children.length === 0) {
      list.append(el("li", "quest-empty", text));
    }
  }

  private build(): void {
    const panel = el("div", "quest-log-panel");
    panel.hidden = true;

    const header = el("div", "quest-log-header");
    header.append(el("h2", undefined, "퀘스트"));
    const closeBtn = el("button", "quest-log-close", "닫기");
    closeBtn.addEventListener("click", () => this.hide());
    header.append(closeBtn);
    panel.append(header);

    panel.append(this.buildSection("quest-available", "수락 가능", (list) => {
      this.availableList = list;
    }));
    panel.append(this.buildSection("quest-active", "진행 중", (list) => {
      this.activeList = list;
    }));
    panel.append(this.buildSection("quest-completed", "완료", (list) => {
      this.completedList = list;
    }));

    this.root.append(panel);
    this.panel = panel;
  }

  private buildSection(
    className: string,
    title: string,
    assign: (list: HTMLElement) => void,
  ): HTMLElement {
    const section = el("div", className);
    section.append(el("div", "quest-section-title", title));
    const list = el("ul", "quest-list");
    assign(list);
    section.append(list);
    return section;
  }

  private buildBadge(def: QuestDef): HTMLElement {
    return el("span", `quest-type quest-type-${def.type}`, TYPE_LABELS[def.type]);
  }

  private buildAvailableRow(def: QuestDef): HTMLLIElement {
    const row = el("li", "quest-item");
    const head = el("div", "quest-item-head");
    head.append(el("span", "quest-name", def.name), this.buildBadge(def));
    row.append(head);
    row.append(el("div", "quest-desc", def.description));
    const acceptBtn = el("button", "quest-accept", "수락하기");
    acceptBtn.addEventListener("click", () => {
      this.deps.onAction("accept", def.id);
    });
    row.append(acceptBtn);
    return row;
  }

  private buildActiveRow(def: QuestDef, entry: QuestEntry): HTMLLIElement {
    const row = el("li", "quest-item");
    const head = el("div", "quest-item-head");
    head.append(el("span", "quest-name", def.name), this.buildBadge(def));
    row.append(head);
    row.append(el("div", "quest-desc", def.description));

    const objectives = el("ul", "quest-objectives");
    def.objectives.forEach((obj, i) => {
      const done = i < entry.objectiveIndex;
      const current = i === entry.objectiveIndex;
      const count = current ? entry.counts[i] ?? 0 : done ? obj.count : 0;
      const state = done ? "완료" : current ? `${count}/${obj.count}` : `0/${obj.count}`;
      const li = el(
        "li",
        `quest-objective${done ? " done" : ""}${current ? " current" : ""}`,
      );
      li.textContent = `${obj.description} — ${state}`;
      objectives.append(li);
    });
    row.append(objectives);

    const abandonBtn = el("button", "quest-abandon", "포기");
    abandonBtn.addEventListener("click", () => {
      this.deps.onAction("abandon", def.id);
    });
    row.append(abandonBtn);
    return row;
  }

  private buildCompletedRow(def: QuestDef): HTMLLIElement {
    const row = el("li", "quest-item quest-item-completed");
    const head = el("div", "quest-item-head");
    head.append(el("span", "quest-name", def.name), this.buildBadge(def));
    row.append(head);
    return row;
  }
}

export function createQuestLogUI(
  root: HTMLElement,
  deps: QuestLogDeps,
): QuestLogUI {
  return new QuestLogUI(root, deps);
}
