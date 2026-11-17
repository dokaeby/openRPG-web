import type { DialogueAction } from "../data/npcs";
import "./dialogue.css";

export interface DialogueChoiceView {
  label: string;
}

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

export class DialogueUI {
  private readonly root: HTMLElement;
  private readonly onAction: (action: DialogueAction) => void;
  private box: HTMLElement | null = null;
  private namePlate: HTMLElement | null = null;
  private textEl: HTMLElement | null = null;
  private choicesEl: HTMLElement | null = null;
  private npcName = "";
  private currentChoices: DialogueChoiceView[] = [];
  private onSelect: ((index: number) => void) | null = null;

  constructor(root: HTMLElement, onAction: (action: DialogueAction) => void) {
    this.root = root;
    this.onAction = onAction;
    this.build();
  }

  open(
    npcName: string,
    text: string,
    choices: DialogueChoiceView[],
    onSelect?: (index: number) => void,
  ): void {
    this.npcName = npcName;
    this.onSelect = onSelect ?? null;
    this.render(text, choices);
    if (this.box) this.box.hidden = false;
  }

  update(
    text: string,
    choices: DialogueChoiceView[],
    onSelect?: (index: number) => void,
  ): void {
    if (onSelect !== undefined) this.onSelect = onSelect;
    this.render(text, choices);
  }

  close(): void {
    if (this.box) this.box.hidden = true;
    this.currentChoices = [];
  }

  isOpen(): boolean {
    return this.box !== null && !this.box.hidden;
  }

  selectChoice(index: number): void {
    if (index < 0 || index >= this.currentChoices.length) return;
    this.onSelect?.(index);
  }

  private render(text: string, choices: DialogueChoiceView[]): void {
    this.currentChoices = choices;
    if (this.namePlate) this.namePlate.textContent = this.npcName;
    if (this.textEl) this.textEl.textContent = text;
    const list = this.choicesEl;
    if (!list) return;
    list.replaceChildren();
    if (choices.length === 0) {
      const btn = el("button", "dialogue-choice", "닫기");
      btn.addEventListener("click", () => {
        this.onAction({ type: "close" });
        this.close();
      });
      list.append(btn);
      return;
    }
    choices.forEach((choice, i) => {
      const btn = el("button", "dialogue-choice", choice.label);
      btn.addEventListener("click", () => this.selectChoice(i));
      list.append(btn);
    });
  }

  private build(): void {
    const box = el("div", "dialogue-box");
    box.hidden = true;

    const namePlate = el("div", "dialogue-name-plate");
    this.namePlate = namePlate;
    const textEl = el("p", "dialogue-text");
    this.textEl = textEl;
    const choicesEl = el("div", "dialogue-choices");
    this.choicesEl = choicesEl;

    box.append(namePlate, textEl, choicesEl);
    this.root.append(box);
    this.box = box;
  }
}
