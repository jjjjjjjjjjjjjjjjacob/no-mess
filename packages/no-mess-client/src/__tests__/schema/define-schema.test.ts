import { describe, expect, it } from "vitest";
import { defineContentType } from "../../schema/define-content-type";
import { defineSchema } from "../../schema/define-schema";
import { field } from "../../schema/field-builders";

describe("defineSchema", () => {
  it("wraps content types into SchemaDefinition", () => {
    const blogPost = defineContentType("blog-post", {
      name: "Blog Post",
      fields: {
        title: field.text({ required: true }),
      },
    });

    const page = defineContentType("page", {
      name: "Page",
      fields: {
        heading: field.text(),
      },
    });

    const schema = defineSchema({ contentTypes: [blogPost, page] });

    expect(schema.contentTypes).toHaveLength(2);
    expect(schema.contentTypes[0].slug).toBe("blog-post");
    expect(schema.contentTypes[1].slug).toBe("page");
  });

  it("handles empty array", () => {
    const schema = defineSchema({ contentTypes: [] });
    expect(schema.contentTypes).toHaveLength(0);
  });

  it("preserves content type data", () => {
    const ct = defineContentType("faq", {
      name: "FAQ",
      description: "Questions and answers",
      fields: {
        question: field.text({ required: true }),
        answer: field.textarea(),
      },
    });

    const schema = defineSchema({ contentTypes: [ct] });

    expect(schema.contentTypes[0]).toBe(ct);
    expect(schema.contentTypes[0].description).toBe("Questions and answers");
    expect(schema.contentTypes[0].fields).toHaveLength(2);
  });
});
