import { describe, expect, it } from "vitest";
import { FIELD_TYPES, type Field, type FieldType } from "../lib/validators";

describe("FIELD_TYPES", () => {
  it("contains exactly 10 field types", () => {
    expect(FIELD_TYPES).toHaveLength(10);
  });

  it("includes text", () => {
    expect(FIELD_TYPES).toContain("text");
  });

  it("includes textarea", () => {
    expect(FIELD_TYPES).toContain("textarea");
  });

  it("includes number", () => {
    expect(FIELD_TYPES).toContain("number");
  });

  it("includes boolean", () => {
    expect(FIELD_TYPES).toContain("boolean");
  });

  it("includes datetime", () => {
    expect(FIELD_TYPES).toContain("datetime");
  });

  it("includes url", () => {
    expect(FIELD_TYPES).toContain("url");
  });

  it("includes image", () => {
    expect(FIELD_TYPES).toContain("image");
  });

  it("includes select", () => {
    expect(FIELD_TYPES).toContain("select");
  });

  it("includes shopifyProduct", () => {
    expect(FIELD_TYPES).toContain("shopifyProduct");
  });

  it("includes shopifyCollection", () => {
    expect(FIELD_TYPES).toContain("shopifyCollection");
  });
});

describe("FieldType", () => {
  it("accepts valid field type values", () => {
    const types: FieldType[] = [
      "text",
      "textarea",
      "number",
      "boolean",
      "datetime",
      "url",
      "image",
      "select",
      "shopifyProduct",
      "shopifyCollection",
    ];
    expect(types).toHaveLength(10);
  });
});

describe("Field type shape", () => {
  it("accepts a minimal valid field", () => {
    const field: Field = {
      name: "title",
      type: "text",
      required: true,
    };
    expect(field.name).toBe("title");
    expect(field.type).toBe("text");
    expect(field.required).toBe(true);
  });

  it("accepts a field with description", () => {
    const field: Field = {
      name: "body",
      type: "textarea",
      required: false,
      description: "Main content",
    };
    expect(field.description).toBe("Main content");
  });

  it("accepts a select field with choices", () => {
    const field: Field = {
      name: "category",
      type: "select",
      required: true,
      options: {
        choices: [
          { label: "News", value: "news" },
          { label: "Blog", value: "blog" },
        ],
      },
    };
    expect(field.options?.choices).toHaveLength(2);
    expect(field.options?.choices?.[0]).toEqual({
      label: "News",
      value: "news",
    });
  });
});
