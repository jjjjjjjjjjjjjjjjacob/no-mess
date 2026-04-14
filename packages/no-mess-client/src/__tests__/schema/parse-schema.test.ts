import { describe, expect, it } from "vitest";
import { parseSchemaSource } from "../../schema/parse-schema";

describe("parseSchemaSource", () => {
  describe("basic parsing", () => {
    it("parses a single content type", () => {
      const source = `
        defineContentType("blog-post", {
          name: "Blog Post",
          fields: {
            title: field.text(),
          },
        });
      `;
      const result = parseSchemaSource(source);
      expect(result.success).toBe(true);
      expect(result.contentTypes).toHaveLength(1);
      expect(result.contentTypes[0].slug).toBe("blog-post");
      expect(result.contentTypes[0].name).toBe("Blog Post");
      expect(result.contentTypes[0].fields).toHaveLength(1);
      expect(result.contentTypes[0].fields[0].name).toBe("title");
      expect(result.contentTypes[0].fields[0].type).toBe("text");
    });

    it("parses multiple content types", () => {
      const source = `
        defineContentType("blog-post", {
          name: "Blog Post",
          fields: {
            title: field.text(),
          },
        });
        defineContentType("page", {
          name: "Page",
          fields: {
            heading: field.text(),
            body: field.textarea(),
          },
        });
      `;
      const result = parseSchemaSource(source);
      expect(result.success).toBe(true);
      expect(result.contentTypes).toHaveLength(2);
      expect(result.contentTypes[0].slug).toBe("blog-post");
      expect(result.contentTypes[1].slug).toBe("page");
      expect(result.contentTypes[1].fields).toHaveLength(2);
    });

    it("parses content type with description", () => {
      const source = `
        defineContentType("faq", {
          name: "FAQ",
          description: "Frequently asked questions",
          fields: {
            question: field.text(),
          },
        });
      `;
      const result = parseSchemaSource(source);
      expect(result.success).toBe(true);
      expect(result.contentTypes[0].description).toBe(
        "Frequently asked questions",
      );
    });
  });

  describe("all field types", () => {
    it("parses all 11 field types", () => {
      const source = `
        defineContentType("all-fields", {
          name: "All Fields",
          fields: {
            a: field.text(),
            b: field.textarea(),
            c: field.number(),
            d: field.boolean(),
            e: field.datetime(),
            f: field.url(),
            g: field.image(),
            h: field.gallery(),
            i: field.select({ choices: [{ label: "A", value: "a" }] }),
            j: field.shopifyProduct(),
            k: field.shopifyCollection(),
          },
        });
      `;
      const result = parseSchemaSource(source);
      expect(result.success).toBe(true);
      const types = result.contentTypes[0].fields.map((f) => f.type);
      expect(types).toEqual([
        "text",
        "textarea",
        "number",
        "boolean",
        "datetime",
        "url",
        "image",
        "gallery",
        "select",
        "shopifyProduct",
        "shopifyCollection",
      ]);
    });
  });

  describe("field options", () => {
    it("parses required option", () => {
      const source = `
        defineContentType("test", {
          name: "Test",
          fields: {
            title: field.text({ required: true }),
            body: field.textarea(),
          },
        });
      `;
      const result = parseSchemaSource(source);
      expect(result.success).toBe(true);
      expect(result.contentTypes[0].fields[0].required).toBe(true);
      expect(result.contentTypes[0].fields[1].required).toBe(false);
    });

    it("parses description option", () => {
      const source = `
        defineContentType("test", {
          name: "Test",
          fields: {
            title: field.text({ description: "The post title" }),
          },
        });
      `;
      const result = parseSchemaSource(source);
      expect(result.success).toBe(true);
      expect(result.contentTypes[0].fields[0].description).toBe(
        "The post title",
      );
    });

    it("parses select with choices", () => {
      const source = `
        defineContentType("test", {
          name: "Test",
          fields: {
            status: field.select({
              choices: [
                { label: "Draft", value: "draft" },
                { label: "Published", value: "published" },
                { label: "Archived", value: "archived" },
              ],
            }),
          },
        });
      `;
      const result = parseSchemaSource(source);
      expect(result.success).toBe(true);
      const field = result.contentTypes[0].fields[0];
      expect(field.type).toBe("select");
      if (field.type !== "select") {
        throw new Error("Expected select field");
      }
      expect(field.options?.choices).toEqual([
        { label: "Draft", value: "draft" },
        { label: "Published", value: "published" },
        { label: "Archived", value: "archived" },
      ]);
    });
  });

  describe("fragment references", () => {
    it("resolves typed fragment definition bindings to fragment slugs", () => {
      const source = `
        import type { FragmentDefinition } from "@no-mess/client/schema";

        export const imageWithAlt: FragmentDefinition = defineFragment("image-with-alt", {
          name: "Image With Alt",
          fields: {
            image: field.image(),
            alt: field.text(),
          },
        });

        defineTemplate("page", {
          name: "Page",
          fields: {
            sections: field.array({
              of: field.object({
                fields: {
                  images: field.array({ of: field.fragment(imageWithAlt) }),
                },
              }),
            }),
          },
        });
      `;

      const result = parseSchemaSource(source);

      expect(result.success).toBe(true);
      const template = result.contentTypes.find((ct) => ct.slug === "page");
      expect(template?.fields[0]).toEqual({
        name: "sections",
        type: "array",
        required: false,
        of: {
          type: "object",
          required: false,
          fields: [
            {
              name: "images",
              type: "array",
              required: false,
              of: {
                type: "fragment",
                required: false,
                fragment: "image-with-alt",
              },
            },
          ],
        },
      });
    });

    it("errors when a fragment field uses an unresolved identifier", () => {
      const source = `
        const imageWithAlt = defineFragment("image-with-alt", {
          name: "Image With Alt",
          fields: {
            image: field.image(),
          },
        });

        const fragmentSlug = imageWithAlt.slug;

        defineTemplate("page", {
          name: "Page",
          fields: {
            image: field.fragment(fragmentSlug),
          },
        });
      `;

      const result = parseSchemaSource(source);

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          message:
            'Fragment field "image" must use a string slug or a known fragment definition reference',
        }),
      );
    });
  });

  describe("comments", () => {
    it("strips line comments", () => {
      const source = `
        // This is a blog post type
        defineContentType("blog-post", {
          name: "Blog Post", // display name
          fields: {
            // Title field
            title: field.text(),
          },
        });
      `;
      const result = parseSchemaSource(source);
      expect(result.success).toBe(true);
      expect(result.contentTypes[0].slug).toBe("blog-post");
      expect(result.contentTypes[0].name).toBe("Blog Post");
    });

    it("strips block comments", () => {
      const source = `
        /* Multi-line
           comment */
        defineContentType("page", {
          name: "Page",
          fields: {
            title: field.text(),
          },
        });
      `;
      const result = parseSchemaSource(source);
      expect(result.success).toBe(true);
      expect(result.contentTypes[0].slug).toBe("page");
    });
  });

  describe("string escapes", () => {
    it("handles escaped quotes in strings", () => {
      const source = `
        defineContentType("test", {
          name: "Test \\"Quoted\\"",
          fields: {
            title: field.text(),
          },
        });
      `;
      const result = parseSchemaSource(source);
      expect(result.success).toBe(true);
      expect(result.contentTypes[0].name).toBe('Test "Quoted"');
    });

    it("handles newline escapes", () => {
      const source = `
        defineContentType("test", {
          name: "Line1\\nLine2",
          fields: {
            title: field.text(),
          },
        });
      `;
      const result = parseSchemaSource(source);
      expect(result.success).toBe(true);
      expect(result.contentTypes[0].name).toBe("Line1\nLine2");
    });
  });

  describe("error handling", () => {
    it("warns on missing name and falls back to slug", () => {
      const source = `
        defineContentType("blog-post", {
          fields: {
            title: field.text(),
          },
        });
      `;
      const result = parseSchemaSource(source);
      expect(result.success).toBe(true);
      expect(result.contentTypes[0].name).toBe("blog-post");
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].message).toContain("Missing");
    });

    it("errors on unknown field type", () => {
      const source = `
        defineContentType("test", {
          name: "Test",
          fields: {
            title: field.richtext(),
          },
        });
      `;
      const result = parseSchemaSource(source);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain("Unknown field type");
    });

    it("returns empty for empty source", () => {
      const result = parseSchemaSource("");
      expect(result.success).toBe(false);
      expect(result.contentTypes).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it("returns partial results when one type is valid and one is malformed", () => {
      const source = `
        defineContentType("good", {
          name: "Good",
          fields: {
            title: field.text(),
          },
        });
        defineContentType(123, {
          name: "Bad",
          fields: {},
        });
      `;
      const result = parseSchemaSource(source);
      expect(result.contentTypes).toHaveLength(1);
      expect(result.contentTypes[0].slug).toBe("good");
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("standalone defineContentType", () => {
    it("parses defineContentType without defineSchema wrapper", () => {
      const source = `
        import { defineContentType, field } from "@no-mess/client/schema";

        export const blogPost = defineContentType("blog-post", {
          name: "Blog Post",
          fields: {
            title: field.text({ required: true }),
            body: field.textarea(),
          },
        });
      `;
      const result = parseSchemaSource(source);
      expect(result.success).toBe(true);
      expect(result.contentTypes).toHaveLength(1);
      expect(result.contentTypes[0].slug).toBe("blog-post");
      expect(result.contentTypes[0].fields).toHaveLength(2);
    });
  });
});
