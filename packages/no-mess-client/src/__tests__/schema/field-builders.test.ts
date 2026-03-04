import { describe, expect, it } from "vitest";
import { field } from "../../schema/field-builders";

describe("field builders", () => {
  describe("each type with no options", () => {
    const types = [
      ["text", field.text],
      ["textarea", field.textarea],
      ["number", field.number],
      ["boolean", field.boolean],
      ["datetime", field.datetime],
      ["url", field.url],
      ["image", field.image],
      ["shopifyProduct", field.shopifyProduct],
      ["shopifyCollection", field.shopifyCollection],
    ] as const;

    for (const [typeName, builder] of types) {
      it(`field.${typeName}() returns correct type and defaults`, () => {
        const result = builder();
        expect(result._type).toBe(typeName);
        expect(result._required).toBe(false);
        expect(result._description).toBeUndefined();
        expect(result._options).toBeUndefined();
      });
    }
  });

  describe("options", () => {
    it("sets required: true", () => {
      const result = field.text({ required: true });
      expect(result._required).toBe(true);
    });

    it("sets description", () => {
      const result = field.text({ description: "A title field" });
      expect(result._description).toBe("A title field");
    });

    it("sets combined options", () => {
      const result = field.text({
        required: true,
        description: "Required title",
      });
      expect(result._required).toBe(true);
      expect(result._description).toBe("Required title");
    });
  });

  describe("select builder", () => {
    it("requires choices", () => {
      const result = field.select({
        choices: [
          { label: "Draft", value: "draft" },
          { label: "Published", value: "published" },
        ],
      });
      expect(result._type).toBe("select");
      expect(result._required).toBe(false);
      expect(result._options?.choices).toEqual([
        { label: "Draft", value: "draft" },
        { label: "Published", value: "published" },
      ]);
    });

    it("supports combined options with choices", () => {
      const result = field.select({
        required: true,
        description: "Status selector",
        choices: [{ label: "Active", value: "active" }],
      });
      expect(result._required).toBe(true);
      expect(result._description).toBe("Status selector");
      expect(result._options?.choices).toHaveLength(1);
    });
  });
});
