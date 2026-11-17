import { expToNext } from "../core/progression";
import { getSkill } from "../data/skills";
import type { CombatState } from "../core/combat";
import type { GameState, GameStateData } from "../core/gameState";
import "./styles.css";

const TOAST_DURATION_MS = 3000;
const ATB_MAX = 100;
const BASE_FONT_SIZE_PX = 16;
const UI_SCALE_MIN = 0.8;
const UI_SCALE_MAX = 1.5;

/**
 * UI 전체 크기 스케일을 루트 font-size로 적용한다.
 * 모든 컴포넌트가 rem 단위이므로 1rem = 16 * scale px가 된다.
 */
export function applyUiScale(scale: number): void {
  const clamped = Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, scale));
  document.documentElement.style.fontSize = `${BASE_FONT_SIZE_PX * clamped}px`;
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

function pct(current: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (current / max) * 100));
}

function skillName(skillId: string): string {
  try {
    return getSkill(skillId).name;
  } catch {
    return skillId;
  }
}

interface HudElements {
  name: HTMLElement;
  level: HTMLElement;
  gold: HTMLElement;
  zone: HTMLElement;
  hpBar: HTMLElement;
  hpFill: HTMLElement;
  hpLabel: HTMLElement;
  mpBar: HTMLElement;
  mpFill: HTMLElement;
  mpLabel: HTMLElement;
  expBar: HTMLElement;
  expFill: HTMLElement;
  expLabel: HTMLElement;
  skills: HTMLElement;
  quests: HTMLElement;
  combat: HTMLElement;
  combatEnemies: HTMLElement;
  combatPlayerName: HTMLElement;
  combatPlayerHp: HTMLElement;
  combatPlayerAtb: HTMLElement;
  toasts: HTMLElement;
}

export class Hud {
  private readonly root: HTMLElement;
  private readonly e: HudElements;
  // undefined = follow game state; null = force hidden; CombatState = force shown.
  private combatOverride: CombatState | null | undefined;

  constructor(root: HTMLElement) {
    this.root = root;
    applyUiScale(1);
    this.e = this.build();
  }

  /** UI 스케일을 변경한다 (0.8 ~ 1.5로 클램프). */
  setUiScale(scale: number): void {
    applyUiScale(scale);
  }

  private build(): HudElements {
    const hud = el("div", "hud");

    // 상단 플레이어 정보 패널
    const top = el("div", "hud-panel hud-top");
    const nameLine = el("div", "hud-name");
    const name = el("span");
    const level = el("span", "hud-level");
    nameLine.append(name, level);
    const statsLine = el("div", "hud-stats-line");
    const gold = el("span", "hud-gold");
    const expLabel = el("span");
    statsLine.append(gold, expLabel);
    const zone = el("div", "hud-zone");
    top.append(nameLine, statsLine, zone);

    const bars = el("div", "hud-bars");
    const hpBar = el("div", "bar bar-hp");
    const hpFill = el("div", "bar-fill");
    const hpLabel = el("div", "bar-label");
    hpBar.append(hpFill, hpLabel);
    const mpBar = el("div", "bar bar-mp");
    const mpFill = el("div", "bar-fill");
    const mpLabel = el("div", "bar-label");
    mpBar.append(mpFill, mpLabel);
    const expBar = el("div", "bar bar-exp");
    const expFill = el("div", "bar-fill");
    expBar.append(expFill);
    bars.append(hpBar, mpBar, expBar);
    top.append(bars);

    // 스킬 슬롯
    const skills = el("div", "hud-skills");

    // 퀘스트 추적기
    const quests = el("div", "hud-panel hud-quests");
    quests.append(el("h3", undefined, "퀘스트"));
    const questsList = el("div", "quests-list");
    quests.append(questsList);

    // 전투 패널
    const combat = el("div", "hud-combat");
    combat.hidden = true;
    combat.append(el("div", "combat-title", "전투"));
    const combatEnemies = el("div", "combat-enemies");
    const combatPlayerRow = el("div", "combat-player-row");
    const combatPlayerName = el("span");
    const combatPlayerAtb = el("span", "player-atb-hint");
    const combatPlayerHp = el("span");
    combatPlayerRow.append(combatPlayerName, combatPlayerAtb, combatPlayerHp);
    combat.append(combatEnemies, combatPlayerRow);

    // 토스트 컨테이너
    const toasts = el("div", "hud-toasts");

    // 퀘스트 패널 토글 (모바일에서만 CSS로 표시됨)
    const questsToggle = el("button", "hud-quests-toggle", "퀘스트");
    questsToggle.type = "button";
    questsToggle.setAttribute("aria-label", "퀘스트 목록 열기/닫기");
    questsToggle.addEventListener("click", () => {
      hud.classList.toggle("hud-quests-open");
    });

    hud.append(top, skills, quests, combat, questsToggle, toasts);
    this.root.append(hud);

    return {
      name,
      level,
      gold,
      zone,
      hpBar,
      hpFill,
      hpLabel,
      mpBar,
      mpFill,
      mpLabel,
      expBar,
      expFill,
      expLabel,
      skills,
      quests: questsList,
      combat,
      combatEnemies,
      combatPlayerName,
      combatPlayerHp,
      combatPlayerAtb,
      toasts,
    };
  }

  update(gs: GameState): void {
    const state = gs.getState();
    this.renderPlayer(state);
    this.renderQuests(state);

    const combat =
      this.combatOverride !== undefined ? this.combatOverride : state.combat;
    if (combat && combat.phase === "active") {
      this.renderCombat(combat);
      this.e.combat.hidden = false;
    } else {
      this.e.combat.hidden = true;
    }
  }

  showCombat(combat: CombatState): void {
    this.combatOverride = combat;
    if (combat.phase === "active") {
      this.renderCombat(combat);
      this.e.combat.hidden = false;
    } else {
      this.e.combat.hidden = true;
    }
  }

  hideCombat(): void {
    this.combatOverride = null;
    this.e.combat.hidden = true;
  }

  toast(message: string): void {
    const toast = el("div", "toast", message);
    this.e.toasts.append(toast);
    window.setTimeout(() => {
      toast.remove();
    }, TOAST_DURATION_MS);
  }

  private renderPlayer(state: GameStateData): void {
    const p = state.player;
    if (!p) {
      this.e.name.textContent = "캐릭터 없음";
      this.e.level.textContent = "";
      this.e.gold.textContent = "";
      this.e.expLabel.textContent = "";
      this.e.zone.textContent = "";
      this.setBar(this.e.hpFill, this.e.hpLabel, 0, 1, "HP");
      this.setBar(this.e.mpFill, this.e.mpLabel, 0, 1, "MP");
      this.e.expFill.style.width = "0%";
      this.e.skills.replaceChildren();
      return;
    }

    this.e.name.textContent = p.name;
    this.e.level.textContent = `Lv.${p.level}`;
    this.e.gold.textContent = `골드 ${p.gold}`;
    this.e.zone.textContent = `지역: ${p.position.zone}`;

    this.setBar(this.e.hpFill, this.e.hpLabel, p.hp, p.maxHp, "HP");
    this.setBar(this.e.mpFill, this.e.mpLabel, p.mp, p.maxMp, "MP");

    const next = expToNext(p.level);
    this.e.expFill.style.width = `${pct(p.exp, next)}%`;
    this.e.expLabel.textContent = `EXP ${p.exp} / ${next}`;

    this.renderSkills(p.skills);
  }

  private setBar(
    fill: HTMLElement,
    label: HTMLElement,
    current: number,
    max: number,
    tag: string,
  ): void {
    fill.style.width = `${pct(current, max)}%`;
    label.textContent = `${tag} ${Math.floor(current)} / ${Math.floor(max)}`;
  }

  private renderSkills(skills: string[]): void {
    this.e.skills.replaceChildren();
    for (const skill of skills) {
      const slot = el("div", "skill-slot");
      slot.textContent = skillName(skill);
      slot.title = skill;
      this.e.skills.append(slot);
    }
  }

  private renderQuests(state: GameStateData): void {
    const list = this.e.quests;
    list.replaceChildren();
    const entries = Object.entries(state.questStates);
    if (entries.length === 0) {
      list.append(el("div", "quest-empty", "진행 중인 퀘스트가 없습니다."));
      return;
    }
    for (const [questId, questState] of entries) {
      const item = el("div", "quest-item");
      item.append(el("span", undefined, questId));
      item.append(el("span", "quest-state", questState));
      list.append(item);
    }
  }

  private renderCombat(combat: CombatState): void {
    this.e.combatEnemies.replaceChildren();
    for (const enemy of combat.enemies) {
      const row = el("div", "combat-enemy");
      const name = el("span", "enemy-name", enemy.name);

      const hpWrap = el("div");
      const hpBar = el("div", "bar bar-hp");
      hpBar.style.height = "10px";
      const hpFill = el("div", "bar-fill");
      hpFill.style.width = `${pct(enemy.hp, enemy.maxHp)}%`;
      const hpLabel = el("div", "bar-label enemy-hp");
      hpLabel.textContent = `${Math.floor(enemy.hp)} / ${Math.floor(enemy.maxHp)}`;
      hpBar.append(hpFill, hpLabel);
      hpWrap.append(hpBar);

      const atbWrap = el("div");
      const atbBar = el("div", "enemy-atb");
      const atbFill = el("div", "enemy-atb-fill");
      atbFill.style.width = `${pct(enemy.atb, ATB_MAX)}%`;
      atbBar.append(atbFill);
      atbWrap.append(atbBar);

      row.append(name, hpWrap, atbWrap);
      this.e.combatEnemies.append(row);
    }

    const p = combat.player;
    this.e.combatPlayerName.textContent = p.name;
    this.e.combatPlayerHp.textContent = `HP ${Math.floor(p.hp)} / ${Math.floor(p.maxHp)}`;
    if (p.atb >= ATB_MAX) {
      this.e.combatPlayerAtb.textContent = "공격 준비";
      this.e.combatPlayerAtb.classList.add("atb-ready");
    } else {
      this.e.combatPlayerAtb.textContent = `ATB ${Math.floor(p.atb)}%`;
      this.e.combatPlayerAtb.classList.remove("atb-ready");
    }
  }
}

export function createHud(root: HTMLElement): Hud {
  return new Hud(root);
}
