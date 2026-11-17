import { CLASSES, RACES } from "../data";
import type { ClassId, RaceId } from "../data";
import "./styles.css";

export type CharacterCreateCallback = (
  name: string,
  race: RaceId,
  classId: ClassId,
) => void;

export class CharacterCreateUI {
  private readonly root: HTMLElement;
  private readonly onComplete: CharacterCreateCallback;
  private panel: HTMLElement | null = null;
  private nameInput: HTMLInputElement | null = null;
  private createBtn: HTMLButtonElement | null = null;
  private selectedRace: RaceId | null = null;
  private selectedClass: ClassId | null = null;

  constructor(root: HTMLElement, onComplete: CharacterCreateCallback) {
    this.root = root;
    this.onComplete = onComplete;
  }

  show(): void {
    if (!this.panel) {
      this.panel = this.build();
    }
    this.panel.hidden = false;
  }

  hide(): void {
    if (this.panel) {
      this.panel.hidden = true;
    }
  }

  private build(): HTMLElement {
    const overlay = document.createElement("div");
    overlay.className = "character-create";

    const panel = document.createElement("div");
    panel.className = "cc-panel";
    overlay.append(panel);

    const title = document.createElement("h1");
    title.className = "cc-title";
    title.textContent = "캐릭터 생성";
    const subtitle = document.createElement("p");
    subtitle.className = "cc-subtitle";
    subtitle.textContent = "이름, 종족, 직업을 선택하세요";
    panel.append(title, subtitle);

    // 이름 입력
    const nameSection = document.createElement("div");
    const nameLabel = document.createElement("div");
    nameLabel.className = "cc-section-title";
    nameLabel.textContent = "이름";
    nameSection.append(nameLabel);
    const nameRow = document.createElement("div");
    nameRow.className = "cc-name-row";
    this.nameInput = document.createElement("input");
    this.nameInput.className = "cc-name-input";
    this.nameInput.type = "text";
    this.nameInput.maxLength = 12;
    this.nameInput.placeholder = "캐릭터 이름";
    this.nameInput.addEventListener("input", () => this.refreshButton());
    nameRow.append(this.nameInput);
    nameSection.append(nameRow);
    panel.append(nameSection);

    // 종족 선택
    const raceSection = document.createElement("div");
    const raceTitle = document.createElement("div");
    raceTitle.className = "cc-section-title";
    raceTitle.textContent = "종족";
    raceSection.append(raceTitle);
    const raceCards = document.createElement("div");
    raceCards.className = "cc-cards";
    for (const race of Object.values(RACES)) {
      const card = this.buildRaceCard(race);
      raceCards.append(card);
    }
    raceSection.append(raceCards);
    panel.append(raceSection);

    // 직업 선택
    const classSection = document.createElement("div");
    const classTitle = document.createElement("div");
    classTitle.className = "cc-section-title";
    classTitle.textContent = "직업";
    classSection.append(classTitle);
    const classCards = document.createElement("div");
    classCards.className = "cc-cards";
    for (const cls of Object.values(CLASSES)) {
      const card = this.buildClassCard(cls);
      classCards.append(card);
    }
    classSection.append(classCards);
    panel.append(classSection);

    // 시작 버튼
    const actions = document.createElement("div");
    actions.className = "cc-actions";
    this.createBtn = document.createElement("button");
    this.createBtn.className = "cc-create-btn";
    this.createBtn.type = "button";
    this.createBtn.textContent = "시작하기";
    this.createBtn.disabled = true;
    this.createBtn.addEventListener("click", () => this.handleCreate());
    actions.append(this.createBtn);
    panel.append(actions);

    this.root.append(overlay);
    return overlay;
  }

  private buildRaceCard(race: (typeof RACES)[RaceId]): HTMLElement {
    const card = document.createElement("div");
    card.className = "cc-card";
    card.dataset.race = race.id;
    card.append(this.cardName(race.name));
    card.append(this.cardDesc(race.description));
    const passive = document.createElement("div");
    passive.className = "card-passive";
    const pName = document.createElement("span");
    pName.className = "passive-name";
    pName.textContent = `패시브: ${race.passive.name}`;
    passive.append(pName, document.createTextNode(` — ${race.passive.description}`));
    card.append(passive);
    card.addEventListener("click", () => this.selectRace(race.id, card));
    return card;
  }

  private buildClassCard(cls: (typeof CLASSES)[ClassId]): HTMLElement {
    const card = document.createElement("div");
    card.className = "cc-card";
    card.dataset.class = cls.id;
    card.append(this.cardName(cls.name));
    card.append(this.cardDesc(cls.description));
    card.addEventListener("click", () => this.selectClass(cls.id, card));
    return card;
  }

  private cardName(text: string): HTMLElement {
    const node = document.createElement("div");
    node.className = "card-name";
    node.textContent = text;
    return node;
  }

  private cardDesc(text: string): HTMLElement {
    const node = document.createElement("div");
    node.className = "card-desc";
    node.textContent = text;
    return node;
  }

  private selectRace(race: RaceId, card: HTMLElement): void {
    this.selectedRace = race;
    this.clearSelection("[data-race]");
    card.classList.add("selected");
    this.refreshButton();
  }

  private selectClass(classId: ClassId, card: HTMLElement): void {
    this.selectedClass = classId;
    this.clearSelection("[data-class]");
    card.classList.add("selected");
    this.refreshButton();
  }

  private clearSelection(selector: string): void {
    if (!this.panel) return;
    for (const node of this.panel.querySelectorAll(selector)) {
      node.classList.remove("selected");
    }
  }

  private refreshButton(): void {
    if (!this.createBtn || !this.nameInput) return;
    this.createBtn.disabled = !(
      this.nameInput.value.trim() &&
      this.selectedRace &&
      this.selectedClass
    );
  }

  private handleCreate(): void {
    if (!this.nameInput || !this.selectedRace || !this.selectedClass) {
      return;
    }
    const name = this.nameInput.value.trim();
    if (!name) return;
    this.onComplete(name, this.selectedRace, this.selectedClass);
    this.hide();
  }
}
