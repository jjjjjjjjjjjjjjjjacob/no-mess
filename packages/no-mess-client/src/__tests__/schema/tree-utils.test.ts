import { describe, expect, it } from "vitest";
import {
  appendValueAtPath,
  moveArrayValueAtPath,
  removeValueAtPath,
  setValueAtPath,
} from "../../schema/tree-utils";

describe("tree-utils", () => {
  it("writes nested object and array values by path", () => {
    const next = setValueAtPath(
      {
        hero: {
          slides: [{ label: "Slide 1" }],
        },
      },
      "hero.slides[0].label",
      "Updated slide",
    );

    expect(next).toEqual({
      hero: {
        slides: [{ label: "Updated slide" }],
      },
    });
  });

  it("appends, removes, and reorders nested array items by path", () => {
    const initial = {
      hero: {
        slides: [{ label: "One" }, { label: "Two" }],
      },
    };

    const appended = appendValueAtPath(initial, "hero.slides", { label: "Three" });
    expect(appended.hero.slides).toEqual([
      { label: "One" },
      { label: "Two" },
      { label: "Three" },
    ]);

    const moved = moveArrayValueAtPath(appended, "hero.slides", 2, 0);
    expect(moved.hero.slides).toEqual([
      { label: "Three" },
      { label: "One" },
      { label: "Two" },
    ]);

    const removed = removeValueAtPath(moved, "hero.slides", 1);
    expect(removed.hero.slides).toEqual([{ label: "Three" }, { label: "Two" }]);
  });
});
