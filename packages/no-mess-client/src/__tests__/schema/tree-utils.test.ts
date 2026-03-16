import { describe, expect, it } from "vitest";
import {
  appendValueAtPath,
  createEmptyValueForField,
  insertValueAtPath,
  moveArrayValueAtPath,
  removeValueAtPath,
  resolveFragmentFields,
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

  it("replaces primitive path segments with containers for nested writes", () => {
    const next = setValueAtPath(
      {
        hero: {
          slides: [""],
        },
      },
      "hero.slides[0].image",
      "asset-1",
    );

    expect(next).toEqual({
      hero: {
        slides: [{ image: "asset-1" }],
      },
    });
  });

  it("appends, removes, and reorders nested array items by path", () => {
    const initial = {
      hero: {
        slides: [{ label: "One" }, { label: "Two" }],
      },
    };

    const appended = appendValueAtPath(initial, "hero.slides", {
      label: "Three",
    });
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

  it("inserts nested array items at a specific position by path", () => {
    const initial = {
      hero: {
        slides: [{ label: "One" }, { label: "Two" }],
      },
    };

    const inserted = insertValueAtPath(initial, "hero.slides", 1, {
      label: "One Point Five",
    });

    expect(inserted.hero.slides).toEqual([
      { label: "One" },
      { label: "One Point Five" },
      { label: "Two" },
    ]);
  });

  it("resolves fragment aliases to canonical fragment definitions", () => {
    const fragments = new Map([
      [
        "image-with-alt",
        {
          kind: "fragment" as const,
          slug: "image-with-alt",
          name: "Image With Alt",
          fields: [
            { name: "image", type: "image" as const, required: false },
            { name: "alt", type: "text" as const, required: false },
          ],
        },
      ],
    ]);

    expect(
      resolveFragmentFields(
        { type: "fragment", required: false, fragment: "imageWithAlt" },
        fragments,
      ),
    ).toEqual([
      { name: "image", type: "image", required: false },
      { name: "alt", type: "text", required: false },
    ]);
  });

  it("initializes fragment-backed values from alias references", () => {
    const fragments = new Map([
      [
        "image-with-alt",
        {
          kind: "fragment" as const,
          slug: "image-with-alt",
          name: "Image With Alt",
          fields: [
            { name: "image", type: "image" as const, required: false },
            { name: "alt", type: "text" as const, required: false },
          ],
        },
      ],
    ]);

    expect(
      createEmptyValueForField(
        { type: "fragment", required: false, fragment: "imageWithAlt" },
        fragments,
      ),
    ).toEqual({ image: "", alt: "" });
  });
});
