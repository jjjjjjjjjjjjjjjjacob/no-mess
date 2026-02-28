import { describe, expect, it } from "vitest";
import { docsNavigation, flatNavItems, getPrevNext } from "../docs-nav-config";

describe("docsNavigation", () => {
  it("has 3 groups", () => {
    expect(docsNavigation).toHaveLength(3);
  });

  it("has correct group titles", () => {
    const titles = docsNavigation.map((g) => g.title);
    expect(titles).toEqual(["Introduction", "Reference", "Integrations"]);
  });

  it("all items have href and title", () => {
    for (const group of docsNavigation) {
      for (const item of group.items) {
        expect(item.href).toBeTruthy();
        expect(item.title).toBeTruthy();
        expect(item.href.startsWith("/docs")).toBe(true);
      }
    }
  });
});

describe("flatNavItems", () => {
  it("returns all items in order", () => {
    const items = flatNavItems();
    expect(items.length).toBeGreaterThan(0);

    // Count items manually
    let expectedCount = 0;
    for (const group of docsNavigation) {
      expectedCount += group.items.length;
    }
    expect(items).toHaveLength(expectedCount);
  });

  it("first item is Getting Started", () => {
    const items = flatNavItems();
    expect(items[0].title).toBe("Getting Started");
  });

  it("last item is Live Edit", () => {
    const items = flatNavItems();
    expect(items[items.length - 1].title).toBe("Live Edit");
  });

  it("preserves order across groups", () => {
    const items = flatNavItems();
    const titles = items.map((i) => i.title);
    expect(titles).toEqual([
      "Getting Started",
      "Local Development",
      "Field Types",
      "SDK Usage",
      "API Reference",
      "Shopify",
      "Preview Mode",
      "Live Edit",
    ]);
  });
});

describe("getPrevNext", () => {
  it("returns null prev for first item", () => {
    const { prev, next } = getPrevNext("/docs/getting-started");
    expect(prev).toBeNull();
    expect(next).not.toBeNull();
    expect(next?.title).toBe("Local Development");
  });

  it("returns null next for last item", () => {
    const { prev, next } = getPrevNext("/docs/live-edit");
    expect(next).toBeNull();
    expect(prev).not.toBeNull();
    expect(prev?.title).toBe("Preview Mode");
  });

  it("returns both prev and next for middle item", () => {
    const { prev, next } = getPrevNext("/docs/sdk");
    expect(prev?.title).toBe("Field Types");
    expect(next?.title).toBe("API Reference");
  });

  it("returns null prev and first item as next for non-existent href", () => {
    // findIndex returns -1, so prev is null (-1 > 0 is false)
    // and next is items[0] (-1 < length-1 is true)
    const { prev, next } = getPrevNext("/docs/nonexistent");
    expect(prev).toBeNull();
    expect(next?.title).toBe("Getting Started");
  });
});
