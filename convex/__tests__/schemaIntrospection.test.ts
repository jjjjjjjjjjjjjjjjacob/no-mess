import { describe, expect, it } from "vitest";
import {
  generateFieldTypeMap,
  generateTypeScriptInterface,
} from "../lib/schemaIntrospection";
import type { Field } from "../lib/validators";

const textField: Field = { name: "title", type: "text", required: true };
const textareaField: Field = {
  name: "body",
  type: "textarea",
  required: false,
};
const numberField: Field = { name: "price", type: "number", required: true };
const booleanField: Field = {
  name: "featured",
  type: "boolean",
  required: false,
};
const urlField: Field = { name: "link", type: "url", required: true };
const imageField: Field = { name: "thumbnail", type: "image", required: false };
const datetimeField: Field = {
  name: "publishDate",
  type: "datetime",
  required: true,
};
const selectField: Field = {
  name: "status",
  type: "select",
  required: true,
  options: {
    choices: [
      { label: "Active", value: "active" },
      { label: "Archived", value: "archived" },
    ],
  },
};
const selectFieldNoChoices: Field = {
  name: "category",
  type: "select",
  required: false,
};
const shopifyProductField: Field = {
  name: "product",
  type: "shopifyProduct",
  required: true,
};
const shopifyCollectionField: Field = {
  name: "collection",
  type: "shopifyCollection",
  required: false,
};

describe("generateFieldTypeMap", () => {
  it("maps text/textarea/url/image/datetime to string", () => {
    const result = generateFieldTypeMap([
      textField,
      textareaField,
      urlField,
      imageField,
      datetimeField,
    ]);
    for (const entry of result) {
      expect(entry.tsType).toBe("string");
    }
  });

  it("maps number to number", () => {
    const [entry] = generateFieldTypeMap([numberField]);
    expect(entry.tsType).toBe("number");
  });

  it("maps boolean to boolean", () => {
    const [entry] = generateFieldTypeMap([booleanField]);
    expect(entry.tsType).toBe("boolean");
  });

  it("maps select with choices to a union of string literals", () => {
    const [entry] = generateFieldTypeMap([selectField]);
    expect(entry.tsType).toBe('"active" | "archived"');
  });

  it("maps select without choices to string", () => {
    const [entry] = generateFieldTypeMap([selectFieldNoChoices]);
    expect(entry.tsType).toBe("string");
  });

  it("maps shopifyProduct to known object shape", () => {
    const [entry] = generateFieldTypeMap([shopifyProductField]);
    expect(entry.tsType).toContain("handle");
    expect(entry.tsType).toContain("title");
    expect(entry.tsType).toContain("shopifyId");
  });

  it("maps shopifyCollection to known object shape", () => {
    const [entry] = generateFieldTypeMap([shopifyCollectionField]);
    expect(entry.tsType).toContain("handle");
    expect(entry.tsType).toContain("title");
    expect(entry.tsType).toContain("shopifyId");
  });

  it("preserves name, type, and required flag", () => {
    const result = generateFieldTypeMap([textField, textareaField]);
    expect(result[0]).toEqual({
      name: "title",
      type: "text",
      tsType: "string",
      required: true,
    });
    expect(result[1]).toEqual({
      name: "body",
      type: "textarea",
      tsType: "string",
      required: false,
    });
  });
});

describe("generateTypeScriptInterface", () => {
  it("generates a valid interface string", () => {
    const result = generateTypeScriptInterface("Blog Post", [
      textField,
      textareaField,
    ]);
    expect(result).toContain("interface BlogPost extends NoMessEntry");
    expect(result).toContain("title: string;");
    expect(result).toContain("body?: string;");
  });

  it("marks optional fields with ?", () => {
    const result = generateTypeScriptInterface("Test", [
      { name: "opt", type: "text", required: false },
    ]);
    expect(result).toContain("opt?: string;");
  });

  it("marks required fields without ?", () => {
    const result = generateTypeScriptInterface("Test", [
      { name: "req", type: "text", required: true },
    ]);
    expect(result).toContain("req: string;");
    expect(result).not.toContain("req?:");
  });

  it("generates union types for select fields", () => {
    const result = generateTypeScriptInterface("Test", [selectField]);
    expect(result).toContain('"active" | "archived"');
  });

  it("converts hyphenated names to PascalCase", () => {
    const result = generateTypeScriptInterface("blog-posts", [textField]);
    expect(result).toContain("interface BlogPosts");
  });

  it("converts multi-word names to PascalCase", () => {
    const result = generateTypeScriptInterface("Product Review", [textField]);
    expect(result).toContain("interface ProductReview");
  });
});
