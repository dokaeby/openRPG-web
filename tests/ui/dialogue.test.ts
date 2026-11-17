import { describe, expect, it, vi } from "vitest";
import type { DialogueAction } from "../../src/data/npcs";
import { DialogueUI } from "../../src/ui/dialogue";

function setup() {
  const root = document.createElement("div");
  document.body.append(root);
  const actions: DialogueAction[] = [];
  const ui = new DialogueUI(root, (a) => actions.push(a));
  return { root, ui, actions };
}

describe("DialogueUI", () => {
  it("is closed initially", () => {
    const { ui } = setup();
    expect(ui.isOpen()).toBe(false);
  });

  it("open renders name plate, text and choice buttons", () => {
    const { root, ui } = setup();
    ui.open("촌장 마을로", "어서 오게.", [
      { label: "무슨 일이시죠?" },
      { label: "또 오겠습니다" },
    ]);

    expect(ui.isOpen()).toBe(true);
    const box = root.querySelector<HTMLElement>(".dialogue-box")!;
    expect(box.hidden).toBe(false);
    expect(root.querySelector(".dialogue-name-plate")?.textContent).toBe(
      "촌장 마을로",
    );
    expect(root.querySelector(".dialogue-text")?.textContent).toBe(
      "어서 오게.",
    );
    const buttons = root.querySelectorAll<HTMLButtonElement>(
      ".dialogue-choice",
    );
    expect(buttons).toHaveLength(2);
    expect(buttons[0].textContent).toBe("무슨 일이시죠?");
    expect(buttons[1].textContent).toBe("또 오겠습니다");
  });

  it("clicking a choice button calls the select handler with its index", () => {
    const { root, ui } = setup();
    const onSelect = vi.fn();
    ui.open("상인", "물건 보실래요?", [{ label: "구경한다" }, { label: "닫기" }], onSelect);

    const buttons = root.querySelectorAll<HTMLButtonElement>(".dialogue-choice");
    buttons[1].click();
    expect(onSelect).toHaveBeenCalledWith(1);

    buttons[0].click();
    expect(onSelect).toHaveBeenCalledWith(0);
  });

  it("selectChoice invokes the handler registered via open", () => {
    const { ui } = setup();
    const onSelect = vi.fn();
    ui.open("NPC", "텍스트", [{ label: "하나" }, { label: "둘" }], onSelect);
    ui.selectChoice(0);
    expect(onSelect).toHaveBeenCalledWith(0);
  });

  it("update replaces text and choices", () => {
    const { root, ui } = setup();
    ui.open("NPC", "처음", [{ label: "A" }, { label: "B" }]);
    ui.update("다음", [{ label: "C" }]);

    expect(root.querySelector(".dialogue-text")?.textContent).toBe("다음");
    const buttons = root.querySelectorAll<HTMLButtonElement>(".dialogue-choice");
    expect(buttons).toHaveLength(1);
    expect(buttons[0].textContent).toBe("C");
  });

  it("renders a 닫기 button when choices are empty and fires close action", () => {
    const { root, ui, actions } = setup();
    ui.open("NPC", "끝", []);

    const buttons = root.querySelectorAll<HTMLButtonElement>(".dialogue-choice");
    expect(buttons).toHaveLength(1);
    expect(buttons[0].textContent).toBe("닫기");

    buttons[0].click();
    expect(actions).toEqual([{ type: "close" }]);
    expect(ui.isOpen()).toBe(false);
  });

  it("close hides the box and isOpen toggles", () => {
    const { ui } = setup();
    ui.open("NPC", "텍스트", [{ label: "계속" }]);
    expect(ui.isOpen()).toBe(true);
    ui.close();
    expect(ui.isOpen()).toBe(false);
  });

  it("uses textContent only (no HTML injection)", () => {
    const { root, ui } = setup();
    ui.open("<b>name</b>", "<img src=x onerror=alert(1)>", [
      { label: "<script>alert(1)</script>" },
    ]);
    expect(root.querySelector(".dialogue-name-plate")?.innerHTML).toBe(
      "&lt;b&gt;name&lt;/b&gt;",
    );
    expect(root.querySelectorAll("img, script")).toHaveLength(0);
  });
});
