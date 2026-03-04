import { describe, expect, it } from "vitest";
import type {
  ContentTypeDefinition,
  FieldDefinition,
} from "@/packages/no-mess-client/src/schema/schema-types";
import { computeSchemaDiff } from "../schema-diff";

function makeField(
  overrides: Partial<FieldDefinition> & { name: string },
): FieldDefinition {
  return {
    type: "text",
    required: false,
    ...overrides,
  };
}

function makeCt(
  slug: string,
  fields: FieldDefinition[],
  name?: string,
): ContentTypeDefinition {
  return { slug, name: name ?? slug, fields };
}

describe("computeSchemaDiff", () => {
  describe("content type level", () => {
    it("marks all as added when no existing types", () => {
      const incoming = [
        makeCt("blog-post", [makeField({ name: "title" })]),
        makeCt("page", [makeField({ name: "heading" })]),
      ];
      const diff = computeSchemaDiff([], incoming);

      expect(diff.added).toHaveLength(2);
      expect(diff.modified).toHaveLength(0);
      expect(diff.unchanged).toHaveLength(0);
    });

    it("marks all as unchanged when identical", () => {
      const types = [
        makeCt("blog-post", [makeField({ name: "title" })]),
        makeCt("page", [makeField({ name: "heading" })]),
      ];
      const diff = computeSchemaDiff(types, types);

      expect(diff.added).toHaveLength(0);
      expect(diff.modified).toHaveLength(0);
      expect(diff.unchanged).toEqual(["blog-post", "page"]);
    });

    it("marks as modified when same slugs but different fields", () => {
      const existing = [makeCt("blog-post", [makeField({ name: "title" })])];
      const incoming = [
        makeCt("blog-post", [
          makeField({ name: "title" }),
          makeField({ name: "body", type: "textarea" }),
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
        makeCt("blog-post", [makeField({ name: "title" })]),
        makeCt("page", [makeField({ name: "heading" })]),
      ];
      const incoming = [
        makeCt("blog-post", [makeField({ name: "title" })]), // unchanged
        makeCt("page", [
          makeField({ name: "heading" }),
          makeField({ name: "body", type: "textarea" }),
        ]), // modified (new field)
        makeCt("faq", [makeField({ name: "question" })]), // added
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
        makeCt("blog-post", [makeField({ name: "title" })], "Blog Post"),
      ];
      const incoming = [
        makeCt("blog-post", [makeField({ name: "title" })], "Article"),
      ];
      const diff = computeSchemaDiff(existing, incoming);

      expect(diff.modified).toHaveLength(1);
      expect(diff.modified[0].name).toBe("Article");
    });
  });

  describe("field level changes", () => {
    it("detects added fields", () => {
      const existing = [makeCt("test", [makeField({ name: "title" })])];
      const incoming = [
        makeCt("test", [
          makeField({ name: "title" }),
          makeField({ name: "body", type: "textarea" }),
        ]),
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
        makeCt("test", [makeField({ name: "title", required: false })]),
      ];
      const incoming = [
        makeCt("test", [makeField({ name: "title", required: true })]),
      ];
      const diff = computeSchemaDiff(existing, incoming);

      const fieldChanges = diff.modified[0].fieldChanges;
      expect(fieldChanges[0].action).toBe("modified");
      expect(fieldChanges[0].fieldName).toBe("title");
    });

    it("detects unchanged fields", () => {
      const field1 = makeField({ name: "title", type: "text", required: true });
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
        makeCt("test", [
          makeField({ name: "title" }),
          makeField({ name: "legacyField" }),
        ]),
      ];
      const incoming = [
        makeCt("test", [
          makeField({ name: "title" }),
          makeField({ name: "newField", type: "number" }),
        ]),
      ];
      const diff = computeSchemaDiff(existing, incoming);

      const fieldChanges = diff.modified[0].fieldChanges;
      const legacyChange = fieldChanges.find(
        (fc) => fc.fieldName === "legacyField",
      );
      expect(legacyChange?.action).toBe("unchanged");
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
      const existing = [makeCt("blog-post", [makeField({ name: "title" })])];
      const diff = computeSchemaDiff(existing, []);
      expect(diff.added).toHaveLength(0);
      expect(diff.modified).toHaveLength(0);
      // existing types not in incoming are just not matched — they remain
      expect(diff.unchanged).toHaveLength(0);
    });
  });
});
