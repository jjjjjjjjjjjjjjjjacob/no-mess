import { describe, expect, it } from "vitest";
import type {
  ContentTypeDefinition,
  NamedFieldDefinition,
  TemplateDefinition,
} from "@/packages/no-mess-client/src/schema/schema-types";
import { computeSchemaDiff } from "../schema-diff";

interface PrimitiveFieldOverrides {
  description?: string;
  label?: string;
  required?: boolean;
}

function makeTextField(
  name: string,
  overrides: PrimitiveFieldOverrides = {},
): NamedFieldDefinition {
  return {
    name,
    type: "text",
    required: false,
    ...overrides,
  };
}

function makeTextareaField(
  name: string,
  overrides: PrimitiveFieldOverrides = {},
): NamedFieldDefinition {
  return {
    name,
    type: "textarea",
    required: false,
    ...overrides,
  };
}

function makeNumberField(
  name: string,
  overrides: PrimitiveFieldOverrides = {},
): NamedFieldDefinition {
  return {
    name,
    type: "number",
    required: false,
    ...overrides,
  };
}

function makeObjectField(
  name: string,
  fields: NamedFieldDefinition[],
  overrides: Omit<PrimitiveFieldOverrides, never> = {},
): NamedFieldDefinition {
  return {
    name,
    type: "object",
    required: false,
    fields,
    ...overrides,
  };
}

function makeCt(
  slug: string,
  fields: NamedFieldDefinition[],
  name?: string,
  overrides: Partial<TemplateDefinition> = {},
): ContentTypeDefinition {
  return {
    kind: "template",
    mode: "collection",
    slug,
    name: name ?? slug,
    fields,
    ...overrides,
  };
}

describe("computeSchemaDiff", () => {
  describe("content type level", () => {
    it("marks all as added when no existing types", () => {
      const incoming = [
        makeCt("blog-post", [makeTextField("title")]),
        makeCt("page", [makeTextField("heading")]),
      ];
      const diff = computeSchemaDiff([], incoming);

      expect(diff.added).toHaveLength(2);
      expect(diff.modified).toHaveLength(0);
      expect(diff.unchanged).toHaveLength(0);
    });

    it("marks all as unchanged when identical", () => {
      const types = [
        makeCt("blog-post", [makeTextField("title")]),
        makeCt("page", [makeTextField("heading")]),
      ];
      const diff = computeSchemaDiff(types, types);

      expect(diff.added).toHaveLength(0);
      expect(diff.modified).toHaveLength(0);
      expect(diff.unchanged).toEqual(["blog-post", "page"]);
    });

    it("marks as modified when same slugs but different fields", () => {
      const existing = [makeCt("blog-post", [makeTextField("title")])];
      const incoming = [
        makeCt("blog-post", [
          makeTextField("title"),
          makeTextareaField("body"),
        ]),
      ];
      const diff = computeSchemaDiff(existing, incoming);

      expect(diff.added).toHaveLength(0);
      expect(diff.modified).toHaveLength(1);
      expect(diff.modified[0].slug).toBe("blog-post");
      expect(diff.unchanged).toHaveLength(0);
    });

    it("handles mixed: some added, modified, and unchanged", () => {
      const existing = [
        makeCt("blog-post", [makeTextField("title")]),
        makeCt("page", [makeTextField("heading")]),
      ];
      const incoming = [
        makeCt("blog-post", [makeTextField("title")]), // unchanged
        makeCt("page", [makeTextField("heading"), makeTextareaField("body")]), // modified (new field)
        makeCt("faq", [makeTextField("question")]), // added
      ];
      const diff = computeSchemaDiff(existing, incoming);

      expect(diff.added).toHaveLength(1);
      expect(diff.added[0].slug).toBe("faq");
      expect(diff.modified).toHaveLength(1);
      expect(diff.modified[0].slug).toBe("page");
      expect(diff.unchanged).toEqual(["blog-post"]);
    });

    it("marks as modified when name changes", () => {
      const existing = [
        makeCt("blog-post", [makeTextField("title")], "Blog Post"),
      ];
      const incoming = [
        makeCt("blog-post", [makeTextField("title")], "Article"),
      ];
      const diff = computeSchemaDiff(existing, incoming);

      expect(diff.modified).toHaveLength(1);
      expect(diff.modified[0].name).toBe("Article");
    });

    it("marks as modified when template mode changes", () => {
      const existing = [
        makeCt("settings", [makeTextField("title")], "Settings", {
          mode: "collection",
        }),
      ];
      const incoming = [
        makeCt("settings", [makeTextField("title")], "Settings", {
          mode: "singleton",
        }),
      ];
      const diff = computeSchemaDiff(existing, incoming);

      expect(diff.modified).toHaveLength(1);
      expect(diff.modified[0].slug).toBe("settings");
    });
  });

  describe("field level changes", () => {
    it("detects added fields", () => {
      const existing = [makeCt("test", [makeTextField("title")])];
      const incoming = [
        makeCt("test", [makeTextField("title"), makeTextareaField("body")]),
      ];
      const diff = computeSchemaDiff(existing, incoming);

      const fieldChanges = diff.modified[0].fieldChanges;
      expect(fieldChanges).toHaveLength(2);
      expect(fieldChanges[0]).toEqual(
        expect.objectContaining({ action: "unchanged", fieldName: "title" }),
      );
      expect(fieldChanges[1]).toEqual(
        expect.objectContaining({ action: "added", fieldName: "body" }),
      );
    });

    it("detects modified fields", () => {
      const existing = [
        makeCt("test", [makeTextField("title", { required: false })]),
      ];
      const incoming = [
        makeCt("test", [makeTextField("title", { required: true })]),
      ];
      const diff = computeSchemaDiff(existing, incoming);

      const fieldChanges = diff.modified[0].fieldChanges;
      expect(fieldChanges[0].action).toBe("modified");
      expect(fieldChanges[0].fieldName).toBe("title");
    });

    it("detects unchanged fields", () => {
      const field1 = makeTextField("title", { required: true });
      const existing = [makeCt("test", [field1])];
      const incoming = [makeCt("test", [{ ...field1 }])];
      // Need something different at content type level to trigger modified
      // Let's change name instead
      const existingWithName = [{ ...existing[0], name: "Test Old" }];
      const incomingWithName = [{ ...incoming[0], name: "Test New" }];
      const diff = computeSchemaDiff(existingWithName, incomingWithName);

      expect(diff.modified).toHaveLength(1);
      expect(diff.modified[0].fieldChanges[0].action).toBe("unchanged");
    });

    it("keeps existing fields not in incoming as unchanged", () => {
      const existing = [
        makeCt("test", [makeTextField("title"), makeTextField("legacyField")]),
      ];
      const incoming = [
        makeCt("test", [makeTextField("title"), makeNumberField("newField")]),
      ];
      const diff = computeSchemaDiff(existing, incoming);

      const fieldChanges = diff.modified[0].fieldChanges;
      const legacyChange = fieldChanges.find(
        (fc) => fc.fieldName === "legacyField",
      );
      expect(legacyChange?.action).toBe("unchanged");
    });

    it("detects nested object field changes using dotted paths", () => {
      const existing = [
        makeCt("page", [makeObjectField("hero", [makeTextField("title")])]),
      ];
      const incoming = [
        makeCt("page", [
          makeObjectField("hero", [
            makeTextField("title"),
            makeTextareaField("eyebrow"),
          ]),
        ]),
      ];
      const diff = computeSchemaDiff(existing, incoming);

      expect(diff.modified).toHaveLength(1);
      expect(
        diff.modified[0].fieldChanges.find(
          (fc) => fc.fieldName === "hero.eyebrow",
        ),
      ).toEqual(
        expect.objectContaining({ action: "added", fieldName: "hero.eyebrow" }),
      );
    });
  });

  describe("empty schemas", () => {
    it("handles both empty", () => {
      const diff = computeSchemaDiff([], []);
      expect(diff.added).toHaveLength(0);
      expect(diff.modified).toHaveLength(0);
      expect(diff.unchanged).toHaveLength(0);
    });

    it("handles empty incoming (nothing changes)", () => {
      const existing = [makeCt("blog-post", [makeTextField("title")])];
      const diff = computeSchemaDiff(existing, []);
      expect(diff.added).toHaveLength(0);
      expect(diff.modified).toHaveLength(0);
      // existing types not in incoming are just not matched — they remain
      expect(diff.unchanged).toHaveLength(0);
    });
  });
});
