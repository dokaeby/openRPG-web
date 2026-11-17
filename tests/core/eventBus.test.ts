import { describe, it, expect } from "vitest";
import { EventBus } from "../../src/core/eventBus";

describe("EventBus", () => {
  it("emits and receives events", () => {
    const bus = new EventBus();
    const seen: unknown[] = [];
    bus.on("player:damaged", (p) => seen.push(p));
    bus.emit("player:damaged", { amount: 5 });
    expect(seen).toEqual([{ amount: 5 }]);
  });

  it("unsubscribe stops delivery", () => {
    const bus = new EventBus();
    let count = 0;
    const off = bus.on("x", () => count++);
    off();
    bus.emit("x");
    expect(count).toBe(0);
  });
});
