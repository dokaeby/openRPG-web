import { describe, it, expect, vi, afterEach } from "vitest";
import { GameState } from "../../src/core/gameState";
import { playerCastSkill, tickAtb } from "../../src/core/combat";
import { skillsForClass, canCast } from "../../src/core/skills";
import { getSkill, SKILLS } from "../../src/data/skills";
import type { ClassId } from "../../src/core/types";

function createPlayer(gs: GameState, classId: ClassId = "warrior") {
  gs.dispatch({
    type: "createCharacter",
    name: "테스트",
    race: "human",
    classId,
  });
}

function setupCombat(classId: ClassId = "warrior") {
  const gs = new GameState();
  createPlayer(gs, classId);
  gs.dispatch({ type: "startCombat", monsterIds: ["goblin"] });
  return gs;
}

function targetOf(gs: GameState) {
  return gs.getState().combat!.enemies[0];
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("skills data", () => {
  it("각 직업마다 스킬 2개씩 정의되어 있다", () => {
    for (const classId of ["warrior", "mage", "archer", "rogue"] as const) {
      const skills = skillsForClass(classId);
      expect(skills).toHaveLength(2);
      for (const s of skills) expect(s.classId).toBe(classId);
    }
    expect(Object.keys(SKILLS)).toHaveLength(8);
  });

  it("getSkill은 정의된 스킬을 반환하고 없는 ID는 throw한다", () => {
    expect(getSkill("fireball").name).toBe("파이어볼");
    expect(() => getSkill("nope")).toThrow();
  });

  it("canCast는 MP 부족/타 직업 스킬을 거부한다", () => {
    const gs = setupCombat("warrior");
    const player = gs.getState().player!;
    expect(canCast(player, getSkill("power_slash")).ok).toBe(true);
    expect(canCast(player, getSkill("fireball")).ok).toBe(false);
    player.mp = 0;
    const r = canCast(player, getSkill("power_slash"));
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("MP 부족");
  });
});

describe("playerCastSkill", () => {
  it("MP를 소모하고 ATB를 리셋하며 턴을 증가시킨다", () => {
    const gs = setupCombat("warrior");
    const combat = gs.getState().combat!;
    const player = gs.getState().player!;
    const mpBefore = player.mp;
    const turnBefore = combat.turn;

    const r = playerCastSkill(gs, "power_slash", targetOf(gs).id);

    expect(r.damage).toBeGreaterThan(0);
    expect(player.mp).toBe(mpBefore - 8);
    expect(combat.player.mp).toBe(mpBefore - 8);
    expect(combat.player.atb).toBe(0);
    expect(combat.turn).toBe(turnBefore + 1);
  });

  it("MP가 부족하면 'MP 부족' 에러를 던진다", () => {
    const gs = setupCombat("warrior");
    gs.getState().player!.mp = 0;
    gs.getState().combat!.player.mp = 0;
    expect(() =>
      playerCastSkill(gs, "power_slash", targetOf(gs).id),
    ).toThrow("MP 부족");
  });

  it("타 직업 스킬은 시전할 수 없다", () => {
    const gs = setupCombat("warrior");
    expect(() =>
      playerCastSkill(gs, "fireball", targetOf(gs).id),
    ).toThrow();
  });

  it("파이어볼이 파워 슬래시보다 더 큰 피해를 준다 (결정적 난수)", () => {
    // 크리 확률(5%+luk)과 ±2 변동을 제거하기 위해 난수를 고정한다.
    vi.spyOn(Math, "random").mockReturnValue(0.9);

    const mage = setupCombat("mage");
    const warrior = setupCombat("warrior");
    const goblin = targetOf(mage);
    // 공격력을 동일하게 맞춰 배율 차이만 비교한다.
    const atk = 50;
    mage.getState().combat!.player.attack = atk;
    warrior.getState().combat!.player.attack = atk;

    const fire = playerCastSkill(mage, "fireball", goblin.id);
    const slash = playerCastSkill(
      warrior,
      "power_slash",
      targetOf(warrior).id,
    );

    expect(fire.damage).toBeGreaterThan(0);
    expect(slash.damage).toBeGreaterThan(0);
    expect(fire.damage!).toBeGreaterThan(slash.damage!);
    expect(getSkill("fireball").damageMultiplier!).toBeGreaterThan(
      getSkill("power_slash").damageMultiplier!,
    );
  });

  it("guard_stance는 이후 enemyTurn 피해를 줄인다", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5); // 크리 없음, 변동 0

    const buffed = setupCombat("warrior");
    playerCastSkill(buffed, "guard_stance");
    const dmgBuffed = buffed.dispatch({ type: "combatEnemyTurn" }) as {
      damage: number;
    };

    const normal = setupCombat("warrior");
    const dmgNormal = normal.dispatch({ type: "combatEnemyTurn" }) as {
      damage: number;
    };

    expect(dmgBuffed.damage).toBeGreaterThan(0);
    expect(dmgNormal.damage).toBeGreaterThan(0);
    expect(dmgBuffed.damage).toBeLessThan(dmgNormal.damage);
  });

  it("poison_blade는 중독을 걸고 이후 행동에서 지속 피해가 발생한다", () => {
    const gs = setupCombat("rogue");
    const combat = gs.getState().combat!;
    const enemy = targetOf(gs);

    playerCastSkill(gs, "poison_blade", enemy.id);
    expect(enemy.statuses?.poisoned).toBeDefined();
    expect(enemy.statuses!.poisoned!.turns).toBe(3);

    const hpAfterCast = enemy.hp;
    const dotDamage = enemy.statuses!.poisoned!.damage;

    // 다음 플레이어 행동 시작 시 중독 1틱이 적용된다.
    combat.player.atb = 100;
    playerCastSkill(gs, "backstab", enemy.id);

    // 피해(공격) + 중독 피해가 모두 빠졌고, 중독 턴은 1 감소했다.
    expect(enemy.hp).toBeLessThan(hpAfterCast - dotDamage);
    expect(enemy.statuses?.poisoned?.turns).toBe(2);
  });

  it("ice_lance는 적의 ATB 충전을 절반으로 줄인다", () => {
    // 크리로 고블린이 즉사해 전투가 끝나는 것을 방지하기 위해 난수 고정.
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    const gs = setupCombat("mage");
    const enemy = targetOf(gs);

    playerCastSkill(gs, "ice_lance", enemy.id);
    expect(enemy.statuses?.speedDown).toBeGreaterThan(0);

    const before = enemy.atb;
    tickAtb(gs, 1000);
    // goblin speed 5, 감속 0.5배 → 5 * 0.5 * 1000 * 0.005 = 12.5
    expect(enemy.atb - before).toBeCloseTo(12.5);
  });

  it("targetId를 생략하면 HP가 가장 낮은 적을 공격한다", () => {
    const gs = new GameState();
    createPlayer(gs, "archer");
    gs.dispatch({ type: "startCombat", monsterIds: ["goblin", "goblin"] });
    const combat = gs.getState().combat!;
    combat.enemies[1].hp = 1; // 두 번째가 더 약함

    const r = playerCastSkill(gs, "aimed_shot");
    expect(r.damage).toBeGreaterThan(0);
    expect(combat.enemies[1].alive).toBe(false);
    expect(combat.enemies[0].alive).toBe(true);
  });
});
