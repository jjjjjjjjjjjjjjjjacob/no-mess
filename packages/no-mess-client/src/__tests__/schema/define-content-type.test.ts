import { describe, expect, it } from "vitest";
import { defineContentType } from "../../schema/define-content-type";
import { field } from "../../schema/field-builders";

describe("defineContentType", () => {
  it("converts builder results to FieldDefinition[]", () => {
    const ct = defineContentType("blog-post", {
      name: "Blog Post",
      fields: {
        title: field.text({ required: true }),
        body: field.textarea(),
      },
    });

    expect(ct.slug).toBe("blog-post");
    expect(ct.name).toBe("Blog Post");
    expect(ct.fields).toHaveLength(2);
    expect(ct.fields[0]).toEqual({
      name: "title",
      type: "text",
      required: true,
    });
    expect(ct.fields[1]).toEqual({
      name: "body",
      type: "textarea",
      required: false,
    });
  });

  it("preserves field order", () => {
    const ct = defineContentType("test", {
      name: "Test",
      fields: {
        alpha: field.text(),
        beta: field.number(),
        gamma: field.boolean(),
        delta: field.url(),
      },
    });

    const names = ct.fields.map((f) => f.name);
    expect(names).toEqual(["alpha", "beta", "gamma", "delta"]);
  });

  it("includes optional description", () => {
    const ct = defineContentType("faq", {
      name: "FAQ",
      description: "Frequently asked questions",
      fields: {
        question: field.text(),
      },
    });

    expect(ct.description).toBe("Frequently asked questions");
  });

  it("omits description when not provided", () => {
    const ct = defineContentType("page", {
      name: "Page",
      fields: {
        title: field.text(),
      },
    });

    expect(ct.description).toBeUndefined();
  });

  it("forwards field builder options", () => {
    const ct = defineContentType("test", {
      name: "Test",
      fields: {
        title: field.text({ required: true, description: "Page title" }),
        status: field.select({
          required: true,
          choices: [
            { label: "Draft", value: "draft" },
            { label: "Live", value: "live" },
          ],
        }),
      },
    });

    expect(ct.fields[0].required).toBe(true);
    expect(ct.fields[0].description).toBe("Page title");
    expect(ct.fields[1].required).toBe(true);
    expect(ct.fields[1].options?.choices).toEqual([
      { label: "Draft", value: "draft" },
      { label: "Live", value: "live" },
    ]);
  });
});
