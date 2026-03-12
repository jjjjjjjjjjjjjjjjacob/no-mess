import { describe, expect, it } from "vitest";
import { parseSchemaSource } from "../../schema/parse-schema";
import type {
  ContentTypeDefinition,
  NamedFieldDefinition,
  SchemaDefinition,
  TemplateDefinition,
} from "../../schema/schema-types";
import {
  generateContentTypeSource,
  generateSchemaSource,
} from "../../schema/serialize-schema";

function makeTemplate(
  overrides: Omit<TemplateDefinition, "kind" | "mode"> &
    Partial<Pick<TemplateDefinition, "mode">>,
): TemplateDefinition {
  return {
    kind: "template",
    mode: "collection",
    ...overrides,
  };
}

function getFieldOptions(field: NamedFieldDefinition) {
  if (
    field.type === "object" ||
    field.type === "array" ||
    field.type === "fragment"
  ) {
    return undefined;
  }

  return field.options;
}

describe("generateSchemaSource", () => {
  describe("field types in output", () => {
    it("serializes each field type", () => {
      const schema: SchemaDefinition = {
        contentTypes: [
          makeTemplate({
            slug: "all-fields",
            name: "All Fields",
            fields: [
              { name: "a", type: "text", required: false },
              { name: "b", type: "textarea", required: false },
              { name: "c", type: "number", required: false },
              { name: "d", type: "boolean", required: false },
              { name: "e", type: "datetime", required: false },
              { name: "f", type: "url", required: false },
              { name: "g", type: "image", required: false },
              { name: "h", type: "gallery", required: false },
              { name: "i", type: "shopifyProduct", required: false },
              { name: "j", type: "shopifyCollection", required: false },
            ],
          }),
        ],
      };
      const output = generateSchemaSource(schema);
      expect(output).toContain("field.text()");
      expect(output).toContain("field.textarea()");
      expect(output).toContain("field.number()");
      expect(output).toContain("field.boolean()");
      expect(output).toContain("field.datetime()");
      expect(output).toContain("field.url()");
      expect(output).toContain("field.image()");
      expect(output).toContain("field.gallery()");
      expect(output).toContain("field.shopifyProduct()");
      expect(output).toContain("field.shopifyCollection()");
    });
  });

  describe("field options in output", () => {
    it("serializes required option", () => {
      const schema: SchemaDefinition = {
        contentTypes: [
          makeTemplate({
            slug: "test",
            name: "Test",
            fields: [{ name: "title", type: "text", required: true }],
          }),
        ],
      };
      const output = generateSchemaSource(schema);
      expect(output).toContain("field.text({ required: true })");
    });

    it("serializes description option", () => {
      const schema: SchemaDefinition = {
        contentTypes: [
          makeTemplate({
            slug: "test",
            name: "Test",
            fields: [
              {
                name: "title",
                type: "text",
                required: false,
                description: "The title",
              },
            ],
          }),
        ],
      };
      const output = generateSchemaSource(schema);
      expect(output).toContain('description: "The title"');
    });

    it("serializes select with choices", () => {
      const schema: SchemaDefinition = {
        contentTypes: [
          makeTemplate({
            slug: "test",
            name: "Test",
            fields: [
              {
                name: "status",
                type: "select",
                required: false,
                options: {
                  choices: [
                    { label: "Draft", value: "draft" },
                    { label: "Published", value: "published" },
                  ],
                },
              },
            ],
          }),
        ],
      };
      const output = generateSchemaSource(schema);
      expect(output).toContain("field.select({");
      expect(output).toContain('label: "Draft"');
      expect(output).toContain('value: "draft"');
      expect(output).toContain('label: "Published"');
    });
  });

  describe("multiple content types", () => {
    it("generates camelCase variable names from slugs", () => {
      const schema: SchemaDefinition = {
        contentTypes: [
          makeTemplate({
            slug: "blog-post",
            name: "Blog Post",
            fields: [{ name: "title", type: "text", required: false }],
          }),
          makeTemplate({
            slug: "product-page",
            name: "Product Page",
            fields: [{ name: "heading", type: "text", required: false }],
          }),
        ],
      };
      const output = generateSchemaSource(schema);
      expect(output).toContain("const blogPost = defineTemplate");
      expect(output).toContain("const productPage = defineTemplate");
      expect(output).toContain("contentTypes: [blogPost, productPage]");
    });
  });

  describe("round-trip guarantee", () => {
    it("parseSchemaSource(generateSchemaSource(s)) matches original", () => {
      const schema: SchemaDefinition = {
        contentTypes: [
          makeTemplate({
            slug: "blog-post",
            name: "Blog Post",
            description: "A blog article",
            fields: [
              { name: "title", type: "text", required: true },
              {
                name: "body",
                type: "textarea",
                required: false,
                description: "Main content",
              },
              { name: "featured", type: "boolean", required: false },
              {
                name: "status",
                type: "select",
                required: true,
                options: {
                  choices: [
                    { label: "Draft", value: "draft" },
                    { label: "Published", value: "published" },
                  ],
                },
              },
            ],
          }),
          makeTemplate({
            slug: "page",
            name: "Page",
            fields: [
              { name: "heading", type: "text", required: true },
              { name: "coverImage", type: "image", required: false },
              { name: "gallery", type: "gallery", required: false },
            ],
          }),
        ],
      };

      const source = generateSchemaSource(schema);
      const parsed = parseSchemaSource(source);

      expect(parsed.success).toBe(true);
      expect(parsed.errors).toHaveLength(0);
      expect(parsed.contentTypes).toHaveLength(schema.contentTypes.length);

      for (let i = 0; i < schema.contentTypes.length; i++) {
        const original = schema.contentTypes[i];
        const roundTripped = parsed.contentTypes[i];

        expect(roundTripped.slug).toBe(original.slug);
        expect(roundTripped.name).toBe(original.name);
        expect(roundTripped.description).toBe(original.description);
        expect(roundTripped.kind).toBe(original.kind);
        expect(roundTripped.fields).toHaveLength(original.fields.length);

        for (let j = 0; j < original.fields.length; j++) {
          expect(roundTripped.fields[j].name).toBe(original.fields[j].name);
          expect(roundTripped.fields[j].type).toBe(original.fields[j].type);
          expect(roundTripped.fields[j].required).toBe(
            original.fields[j].required,
          );
          expect(roundTripped.fields[j].description).toBe(
            original.fields[j].description,
          );
          const originalOptions = getFieldOptions(original.fields[j]);
          if (originalOptions) {
            expect(getFieldOptions(roundTripped.fields[j])).toEqual(
              originalOptions,
            );
          }
        }
      }
    });
  });

  describe("edge cases", () => {
    it("generates output for empty schema", () => {
      const schema: SchemaDefinition = { contentTypes: [] };
      const output = generateSchemaSource(schema);
      expect(output).toContain("defineSchema({ contentTypes: [] })");
      expect(output).toContain("import");
    });

    it("escapes quotes in strings", () => {
      const schema: SchemaDefinition = {
        contentTypes: [
          makeTemplate({
            slug: "test",
            name: 'Test "Quoted"',
            fields: [{ name: "title", type: "text", required: false }],
          }),
        ],
      };
      const output = generateSchemaSource(schema);
      expect(output).toContain('Test \\"Quoted\\"');
    });
  });
});

describe("generateContentTypeSource", () => {
  it("generates standalone content type source", () => {
    const ct: ContentTypeDefinition = {
      kind: "template",
      mode: "collection",
      slug: "blog-post",
      name: "Blog Post",
      fields: [
        { name: "title", type: "text", required: true },
        { name: "body", type: "textarea", required: false },
      ],
    };
    const output = generateContentTypeSource(ct);
    expect(output).toContain(
      'import { defineTemplate, field } from "@no-mess/client/schema"',
    );
    expect(output).toContain("export const blogPost = defineTemplate");
    expect(output).toContain('"blog-post"');
    expect(output).toContain("field.text({ required: true })");
    expect(output).toContain("field.textarea()");
  });
});
