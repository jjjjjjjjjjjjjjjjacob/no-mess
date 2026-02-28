import { vi } from "vitest";
import { createMockActionCtx } from "./helpers/mockCtx";

vi.mock("../_generated/api", () => ({
  internal: {
    sites: {
      getByApiKey: "internal:sites:getByApiKey",
      getByPublishableKey: "internal:sites:getByPublishableKey",
    },
  },
}));

import { classifyApiKey, validateApiKey } from "../lib/apiAuth";

describe("classifyApiKey", () => {
  it('returns "publishable" for nm_pub_ prefix', () => {
    expect(classifyApiKey("nm_pub_abc123")).toBe("publishable");
  });

  it('returns "secret" for nm_ prefix (not nm_pub_)', () => {
    expect(classifyApiKey("nm_abc123")).toBe("secret");
  });

  it("returns null for invalid prefix", () => {
    expect(classifyApiKey("sk_abc123")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(classifyApiKey("")).toBeNull();
  });

  it('classifies a full-length publishable key as "publishable"', () => {
    const key = `nm_pub_${"a".repeat(64)}`;
    expect(classifyApiKey(key)).toBe("publishable");
  });

  it('classifies a full-length secret key as "secret"', () => {
    const key = `nm_${"a".repeat(64)}`;
    expect(classifyApiKey(key)).toBe("secret");
  });
});

describe("validateApiKey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no Authorization header is present", async () => {
    const ctx = createMockActionCtx();
    const request = new Request("https://example.com/api/data");

    const result = await validateApiKey(ctx as any, request);
    expect(result).toBeNull();
  });

  it("returns null for non-Bearer authorization format", async () => {
    const ctx = createMockActionCtx();
    const request = new Request("https://example.com/api/data", {
      headers: { Authorization: "Basic abc123" },
    });

    const result = await validateApiKey(ctx as any, request);
    expect(result).toBeNull();
  });

  it("returns null when Bearer token has invalid prefix", async () => {
    const ctx = createMockActionCtx();
    const request = new Request("https://example.com/api/data", {
      headers: { Authorization: "Bearer sk_invalid_key" },
    });

    const result = await validateApiKey(ctx as any, request);
    expect(result).toBeNull();
  });

  it("returns null when key is empty after 'Bearer '", async () => {
    const ctx = createMockActionCtx();
    const request = new Request("https://example.com/api/data", {
      headers: { Authorization: "Bearer " },
    });

    const result = await validateApiKey(ctx as any, request);
    expect(result).toBeNull();
  });

  it("returns null when Authorization header has too many parts", async () => {
    const ctx = createMockActionCtx();
    const request = new Request("https://example.com/api/data", {
      headers: { Authorization: "Bearer nm_key extra" },
    });

    const result = await validateApiKey(ctx as any, request);
    expect(result).toBeNull();
  });

  it("returns site and keyType 'secret' for valid secret key", async () => {
    const ctx = createMockActionCtx();
    const mockSite = {
      _id: "site_abc",
      slug: "my-site",
      name: "My Site",
      previewSecret: "secret_123",
    };
    ctx.runQuery.mockResolvedValue(mockSite);

    const request = new Request("https://example.com/api/data", {
      headers: { Authorization: "Bearer nm_validapikey123" },
    });

    const result = await validateApiKey(ctx as any, request);

    expect(result).toEqual({ site: mockSite, keyType: "secret" });
    expect(ctx.runQuery).toHaveBeenCalledWith("internal:sites:getByApiKey", {
      apiKey: "nm_validapikey123",
    });
  });

  it("returns site and keyType 'publishable' for valid publishable key", async () => {
    const ctx = createMockActionCtx();
    const mockSite = {
      _id: "site_abc",
      slug: "my-site",
      name: "My Site",
      previewSecret: "secret_123",
    };
    ctx.runQuery.mockResolvedValue(mockSite);

    const request = new Request("https://example.com/api/data", {
      headers: { Authorization: "Bearer nm_pub_validpubkey456" },
    });

    const result = await validateApiKey(ctx as any, request);

    expect(result).toEqual({ site: mockSite, keyType: "publishable" });
    expect(ctx.runQuery).toHaveBeenCalledWith(
      "internal:sites:getByPublishableKey",
      { publishableKey: "nm_pub_validpubkey456" },
    );
  });

  it("returns null when valid key format but site not found", async () => {
    const ctx = createMockActionCtx();
    ctx.runQuery.mockResolvedValue(null);

    const request = new Request("https://example.com/api/data", {
      headers: { Authorization: "Bearer nm_nonexistentkey" },
    });

    const result = await validateApiKey(ctx as any, request);
    expect(result).toBeNull();
    expect(ctx.runQuery).toHaveBeenCalledWith("internal:sites:getByApiKey", {
      apiKey: "nm_nonexistentkey",
    });
  });

  it("returns null when valid publishable key but site not found", async () => {
    const ctx = createMockActionCtx();
    ctx.runQuery.mockResolvedValue(null);

    const request = new Request("https://example.com/api/data", {
      headers: { Authorization: "Bearer nm_pub_nonexistent" },
    });

    const result = await validateApiKey(ctx as any, request);
    expect(result).toBeNull();
    expect(ctx.runQuery).toHaveBeenCalledWith(
      "internal:sites:getByPublishableKey",
      { publishableKey: "nm_pub_nonexistent" },
    );
  });
});
