import { describe, expect, it } from "vitest";
import {
  getShopifyHandle,
  isShopifyCollectionRef,
  isShopifyProductRef,
} from "../reference-utils.js";

describe("reference-utils", () => {
  it("extracts a handle from string refs", () => {
    expect(getShopifyHandle("classic-tee")).toBe("classic-tee");
  });

  it("extracts a handle from object refs", () => {
    expect(getShopifyHandle({ handle: "summer-sale" })).toBe("summer-sale");
  });

  it("returns null for nullish or invalid refs", () => {
    expect(getShopifyHandle(null)).toBeNull();
    expect(getShopifyHandle(undefined)).toBeNull();
    expect(getShopifyHandle("")).toBeNull();
    expect(getShopifyHandle({})).toBeNull();
  });

  it("treats structural product refs as valid", () => {
    expect(isShopifyProductRef("classic-tee")).toBe(true);
    expect(isShopifyProductRef({ handle: "classic-tee" })).toBe(true);
    expect(isShopifyProductRef({ title: "Classic Tee" })).toBe(false);
  });

  it("treats structural collection refs as valid", () => {
    expect(isShopifyCollectionRef("summer-sale")).toBe(true);
    expect(isShopifyCollectionRef({ handle: "summer-sale" })).toBe(true);
    expect(isShopifyCollectionRef({ id: "collection_1" })).toBe(false);
  });
});
