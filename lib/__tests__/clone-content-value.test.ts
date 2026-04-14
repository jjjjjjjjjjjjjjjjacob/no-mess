import { describe, expect, it } from "vitest";
import { cloneContentValue } from "../clone-content-value";

describe("cloneContentValue", () => {
  it("deeply clones nested arrays and objects", () => {
    const value = {
      hero: {
        slides: [
          {
            image: "asset-1",
            meta: {
              alt: "Intro",
              tags: ["featured"],
            },
          },
        ],
      },
    };

    const clone = cloneContentValue(value);

    expect(clone).toEqual(value);
    expect(clone).not.toBe(value);
    expect(clone.hero).not.toBe(value.hero);
    expect(clone.hero.slides).not.toBe(value.hero.slides);
    expect(clone.hero.slides[0]).not.toBe(value.hero.slides[0]);
    expect(clone.hero.slides[0].meta).not.toBe(value.hero.slides[0].meta);
  });

  it("does not mutate the source when the clone changes", () => {
    const value = {
      hero: {
        slides: [
          {
            image: "asset-1",
            meta: {
              alt: "Intro",
              tags: ["featured"],
            },
          },
        ],
      },
    };

    const clone = cloneContentValue(value);
    clone.hero.slides[0].meta.alt = "Updated";
    clone.hero.slides[0].meta.tags.push("homepage");

    expect(value.hero.slides[0].meta.alt).toBe("Intro");
    expect(value.hero.slides[0].meta.tags).toEqual(["featured"]);
  });
});
