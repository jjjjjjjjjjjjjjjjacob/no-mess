import { describe, expect, it } from "vitest";
import {
  getTemplateMigration,
  mershyHomepageHeroSlidesMigration,
  migrateNumberedFieldsToSlides,
} from "../template-migrations";

describe("migrateNumberedFieldsToSlides", () => {
  it("moves numbered flat fields into a nested slides array and preserves unrelated data", () => {
    const migrated = migrateNumberedFieldsToSlides(
      {
        headline: "Welcome",
        image1: "asset-1",
        image1Alt: "First slide",
        image1Label: "One",
        image2: "asset-2",
        image2Alt: "Second slide",
      },
      {
        count: 3,
        destinationPath: ["hero", "slides"],
        imageField: (index) => `image${index}`,
        altField: (index) => `image${index}Alt`,
        labelField: (index) => `image${index}Label`,
      },
    );

    expect(migrated).toEqual({
      headline: "Welcome",
      hero: {
        slides: [
          { image: "asset-1", alt: "First slide", label: "One" },
          { image: "asset-2", alt: "Second slide" },
        ],
      },
    });
  });
});

describe("mershyHomepageHeroSlidesMigration", () => {
  it("is discoverable by name", () => {
    expect(getTemplateMigration("mershy-homepage-hero-slides")).toBe(
      mershyHomepageHeroSlidesMigration,
    );
  });

  it("provides the explicit hero.slides[] schema", () => {
    expect(mershyHomepageHeroSlidesMigration.nextFields).toEqual([
      expect.objectContaining({
        name: "hero",
        type: "object",
      }),
    ]);
  });
});
