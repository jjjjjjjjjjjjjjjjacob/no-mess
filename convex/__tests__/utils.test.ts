import { describe, expect, it } from "vitest";
import {
  generateApiKey,
  generatePreviewSecret,
  generatePublishableKey,
  slugify,
} from "../lib/utils";

describe("generateApiKey", () => {
  it("generates a key with nm_ prefix", () => {
    const key = generateApiKey();
    expect(key).toMatch(/^nm_[0-9a-f]{64}$/);
  });

  it("generates unique keys", () => {
    const key1 = generateApiKey();
    const key2 = generateApiKey();
    expect(key1).not.toBe(key2);
  });
});

describe("generatePublishableKey", () => {
  it("generates a key with nm_pub_ prefix", () => {
    const key = generatePublishableKey();
    expect(key).toMatch(/^nm_pub_[0-9a-f]{64}$/);
  });

  it("generates unique keys", () => {
    const key1 = generatePublishableKey();
    const key2 = generatePublishableKey();
    expect(key1).not.toBe(key2);
  });

  it("is distinguishable from a secret key", () => {
    const pubKey = generatePublishableKey();
    const secretKey = generateApiKey();
    expect(pubKey.startsWith("nm_pub_")).toBe(true);
    expect(secretKey.startsWith("nm_pub_")).toBe(false);
    expect(secretKey.startsWith("nm_")).toBe(true);
  });
});

describe("generatePreviewSecret", () => {
  it("generates a 48-character hex string", () => {
    const secret = generatePreviewSecret();
    expect(secret).toMatch(/^[0-9a-f]{48}$/);
  });

  it("generates unique secrets", () => {
    const s1 = generatePreviewSecret();
    const s2 = generatePreviewSecret();
    expect(s1).not.toBe(s2);
  });
});

describe("slugify", () => {
  it("converts text to lowercase slug", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("removes special characters", () => {
    expect(slugify("Hello, World!")).toBe("hello-world");
  });

  it("handles multiple spaces and dashes", () => {
    expect(slugify("Hello   World---Test")).toBe("hello-world-test");
  });

  it("trims leading and trailing dashes", () => {
    expect(slugify("  Hello World  ")).toBe("hello-world");
  });

  it("handles empty string", () => {
    expect(slugify("")).toBe("");
  });

  it("handles already-slugified text", () => {
    expect(slugify("already-a-slug")).toBe("already-a-slug");
  });
});
