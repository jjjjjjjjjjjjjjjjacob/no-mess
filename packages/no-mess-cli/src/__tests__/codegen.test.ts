/**
 * @vitest-environment node
 */

import { describe, expect, it } from "vitest";
import { parseSchemaSource } from "@no-mess/client/schema";
import { generateTypesSource } from "../codegen/generate-types";

describe("generateTypesSource", () => {
  it("generates recursive entry and fragment contracts with field metadata", () => {
    const schema = `import {
  defineFragment,
  defineSchema,
  defineTemplate,
  field,
} from "@no-mess/client/schema";

const imageWithAlt = defineFragment("image-with-alt", {
  name: "Image With Alt",
  fields: {
    image: field.image({ required: true }),
    alt: field.text(),
  },
});

const homePage = defineTemplate("home-page", {
  name: "Home Page",
  mode: "singleton",
  route: "/",
  fields: {
    hero: field.object({
      fields: {
        headline: field.text({ required: true }),
        status: field.select({
          choices: [
            { label: "Draft", value: "draft" },
            { label: "Live", value: "live" },
          ],
        }),
        slides: field.array({
          of: field.fragment(imageWithAlt),
        }),
      },
    }),
    featuredProducts: field.array({
      of: field.object({
        fields: {
          product: field.shopifyProduct({ required: true }),
        },
      }),
    }),
  },
});

export default defineSchema({
  contentTypes: [imageWithAlt, homePage],
});`;
    const parsed = parseSchemaSource(schema);

    expect(parsed.errors).toEqual([]);
    expect(generateTypesSource(parsed.contentTypes)).toMatchInlineSnapshot(`
      "import type { NoMessEntry, ShopifyCollectionRef, ShopifyProductRef } from "@no-mess/client";
      
      export interface ImageWithAltValue {
        image: string;
        alt?: string;
      }
      
      export interface HomePageEntry extends NoMessEntry {
        hero?: {
          headline: string;
          status?: "draft" | "live";
          slides?: ImageWithAltValue[];
        };
        featuredProducts?: {
          product: ShopifyProductRef;
        }[];
      }
      
      export const HOME_PAGE_SLUG = "home-page" as const;
      export const HOME_PAGE_ROUTE = "/" as const;
      
      export const IMAGE_WITH_ALT_FIELDS = {
        image: "image",
        alt: "alt",
      } as const;
      export type ImageWithAltFieldPath = (typeof IMAGE_WITH_ALT_FIELDS)[keyof typeof IMAGE_WITH_ALT_FIELDS];
      
      export const HOME_PAGE_FIELDS = {
        hero: "hero",
        heroHeadline: "hero.headline",
        heroStatus: "hero.status",
        heroSlides: "hero.slides",
        heroSlidesItem: "hero.slides[]",
        heroSlidesItemImage: "hero.slides[].image",
        heroSlidesItemAlt: "hero.slides[].alt",
        featuredProducts: "featuredProducts",
        featuredProductsItem: "featuredProducts[]",
        featuredProductsItemProduct: "featuredProducts[].product",
      } as const;
      export type HomePageFieldPath = (typeof HOME_PAGE_FIELDS)[keyof typeof HOME_PAGE_FIELDS];
      "
    `);
  });

  it("throws on normalized field key collisions", () => {
    const schema = `import { defineSchema, defineTemplate, field } from "@no-mess/client/schema";

const homePage = defineTemplate("home-page", {
  name: "Home Page",
  fields: {
    "foo-bar": field.text(),
    fooBar: field.text(),
  },
});

export default defineSchema({
  contentTypes: [homePage],
});`;
    const parsed = parseSchemaSource(schema);

    expect(() => generateTypesSource(parsed.contentTypes)).toThrow(
      'Codegen field path collision in "home-page"',
    );
  });
});
