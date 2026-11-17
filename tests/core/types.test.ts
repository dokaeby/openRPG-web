import { describe, it, expect } from "vitest";
import { getRace, getClass, RACES, CLASSES } from "../../src/data";

describe("data lookup", () => {
  it("returns race def for valid id", () => {
    expect(getRace("human").name).toBe("인간");
    expect(getRace("golem").statMods.vit).toBeGreaterThan(0);
  });
  it("throws on unknown race", () => {
    expect(() => getRace("dragon")).toThrow();
  });
  it("returns class def for valid id", () => {
    expect(getClass("warrior").weaponTypes).toContain("sword");
  });
  it("throws on unknown class", () => {
    expect(() => getClass("bard")).toThrow();
  });
  it("has all 6 races and 4 classes", () => {
    expect(Object.keys(RACES)).toHaveLength(6);
    expect(Object.keys(CLASSES)).toHaveLength(4);
  });
});
