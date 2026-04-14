import { describe, expect, it } from "vitest";
import { buildCacheKey, shouldBypassCache } from "../cache";

describe("buildCacheKey", () => {
  it("includes API key in cache key", () => {
    const request = new Request("https://api.nomess.xyz/api/content/blog");
    const cacheKey = buildCacheKey(request, "nm_abc123");
    const url = new URL(cacheKey.url);
    expect(url.searchParams.get("_ck")).toBe("nm_abc123");
  });

  it("uses 'anon' for null API key", () => {
    const request = new Request("https://api.nomess.xyz/api/content/blog");
    const cacheKey = buildCacheKey(request, null);
    const url = new URL(cacheKey.url);
    expect(url.searchParams.get("_ck")).toBe("anon");
  });

  it("different API keys produce different cache keys", () => {
    const request = new Request("https://api.nomess.xyz/api/content/blog");
    const key1 = buildCacheKey(request, "nm_key1");
    const key2 = buildCacheKey(request, "nm_key2");
    expect(key1.url).not.toBe(key2.url);
  });

  it("preserves existing query params", () => {
    const request = new Request(
      "https://api.nomess.xyz/api/content/blog?preview=true",
    );
    const cacheKey = buildCacheKey(request, "nm_test");
    const url = new URL(cacheKey.url);
    expect(url.searchParams.get("preview")).toBe("true");
    expect(url.searchParams.get("_ck")).toBe("nm_test");
  });
});

describe("shouldBypassCache", () => {
  it("returns true for preview requests", () => {
    const request = new Request(
      "https://api.nomess.xyz/api/content/blog?preview=true",
    );

    expect(shouldBypassCache(request)).toBe(true);
  });

  it("returns true for fresh requests", () => {
    const request = new Request(
      "https://api.nomess.xyz/api/content/blog?fresh=true",
    );

    expect(shouldBypassCache(request)).toBe(true);
  });

  it("returns false for normal GET requests", () => {
    const request = new Request("https://api.nomess.xyz/api/content/blog");

    expect(shouldBypassCache(request)).toBe(false);
  });
});
