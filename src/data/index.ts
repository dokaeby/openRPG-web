import type { ClassDef, RaceDef } from "../core/types";
import { RACES } from "./races";
import { CLASSES } from "./classes";

export { RACES } from "./races";
export { CLASSES } from "./classes";
export type {
  BaseStats,
  ClassDef,
  ClassId,
  RaceDef,
  RaceId,
} from "../core/types";

export function getRace(id: string): RaceDef {
  const race = (RACES as Record<string, RaceDef>)[id];
  if (!race) {
    throw new Error(`Unknown race id: ${id}`);
  }
  return race;
}

export function getClass(id: string): ClassDef {
  const cls = (CLASSES as Record<string, ClassDef>)[id];
  if (!cls) {
    throw new Error(`Unknown class id: ${id}`);
  }
  return cls;
}
