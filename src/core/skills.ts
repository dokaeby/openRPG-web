import { SKILLS } from "../data/skills";
import type { SkillDef } from "../data/skills";
import type { ClassId } from "./types";
import type { PlayerState } from "./gameState";

/** 해당 클래스가 사용 가능한 스킬 목록 (정의 순서 유지). */
export function skillsForClass(classId: ClassId): SkillDef[] {
  return Object.values(SKILLS).filter((s) => s.classId === classId);
}

/**
 * 스킬 시전 가능 여부.
 * - 소유 클래스 일치 + MP 충분 여부를 검사한다.
 */
export function canCast(
  player: PlayerState,
  skill: SkillDef,
): { ok: boolean; reason?: string } {
  if (skill.classId !== player.classId) {
    return { ok: false, reason: "해당 직업의 스킬이 아닙니다" };
  }
  if (player.mp < skill.mpCost) {
    return { ok: false, reason: "MP 부족" };
  }
  return { ok: true };
}

