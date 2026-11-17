import { describe, it, expect, afterEach } from "vitest";
// @ts-expect-error -- 프로젝트에 @types/node가 없지만 vitest 런타임에서는 정상 동작한다
import { readFileSync } from "node:fs";
// @ts-expect-error -- 프로젝트에 @types/node가 없지만 vitest 런타임에서는 정상 동작한다
import { resolve } from "node:path";
import { Hud, applyUiScale } from "../../src/ui/hud";

// 프로젝트에 @types/node가 없으므로 필요한 최소 타입만 선언한다.
declare const process: { cwd(): string };

const css = readFileSync(
  resolve(process.cwd(), "src/ui/styles.css"),
  "utf-8",
);

afterEach(() => {
  document.documentElement.style.fontSize = "";
});

describe("styles.css responsive/cross-browser invariants", () => {
  it("contains media queries for responsive breakpoints", () => {
    expect(css).toContain("@media");
    expect(css).toContain("max-width");
    expect(css).toContain("pointer: coarse");
  });

  it("contains prefers-reduced-motion support", () => {
    expect(css).toContain("prefers-reduced-motion");
  });

  it("does not use bleeding-edge or non-standard color functions", () => {
    expect(css).not.toContain("color-mix(");
    expect(css).not.toContain("oklch(");
    expect(css).not.toContain("lab(");
    expect(css).not.toContain(":has(");
  });

  it("has vh fallback before dvh for dynamic viewport units", () => {
    expect(css).toContain("100vh");
    expect(css).toContain("100dvh");
    // 모든 dvh 사용처는 같은 선언 블록에서 먼저 vh가 와야 한다
    const vhIndex = css.indexOf("100vh");
    const dvhIndex = css.indexOf("100dvh");
    expect(vhIndex).toBeGreaterThanOrEqual(0);
    expect(dvhIndex).toBeGreaterThan(vhIndex);
  });

  it("includes touch-friendly properties", () => {
    expect(
      css.includes("-webkit-tap-highlight-color") ||
        css.includes("touch-action"),
    ).toBe(true);
  });

  it("uses rem-based sizing with box-sizing reset", () => {
    expect(css).toContain("box-sizing: border-box");
    expect(css).toMatch(/\d+(\.\d+)?rem/);
  });

  it("defines collapsed/hud-collapsed quest toggle styles", () => {
    expect(css).toContain("hud-collapsed");
    expect(css).toContain("hud-quests-open");
  });
});

describe("Hud.setUiScale", () => {
  it("exists and scales root font-size", () => {
    const root = document.createElement("div");
    const hud = new Hud(root);
    expect(typeof hud.setUiScale).toBe("function");

    hud.setUiScale(1.25);
    expect(document.documentElement.style.fontSize).toBe("20px");
  });

  it("clamps scale to 0.8-1.5", () => {
    const root = document.createElement("div");
    const hud = new Hud(root);

    hud.setUiScale(0.1);
    expect(document.documentElement.style.fontSize).toBe("12.8px");

    hud.setUiScale(99);
    expect(document.documentElement.style.fontSize).toBe("24px");
  });

  it("applyUiScale helper works standalone", () => {
    applyUiScale(1);
    expect(document.documentElement.style.fontSize).toBe("16px");
  });

  it("renders quests toggle button", () => {
    const root = document.createElement("div");
    new Hud(root);
    const toggle = root.querySelector(".hud-quests-toggle");
    expect(toggle).not.toBeNull();
    toggle!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(root.querySelector(".hud")!.classList.contains("hud-quests-open"))
      .toBe(true);
  });
});
