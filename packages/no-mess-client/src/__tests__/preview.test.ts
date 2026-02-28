import { beforeEach, describe, expect, it, vi } from "vitest";
import { createNoMessClient, NoMessError } from "../index.js";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// Mock crypto.subtle for HMAC computation
const mockSign = vi.fn();
Object.defineProperty(globalThis, "crypto", {
  value: {
    subtle: {
      importKey: vi.fn().mockResolvedValue("mock-key"),
      sign: mockSign.mockResolvedValue(new ArrayBuffer(32)),
    },
  },
  writable: true,
});

describe("exchangePreviewSession", () => {
  const client = createNoMessClient({
    apiUrl: "https://api.test.convex.site",
    apiKey: "nm_previewtest",
  });

  beforeEach(() => {
    mockFetch.mockReset();
    mockSign.mockResolvedValue(new ArrayBuffer(32));
  });

  it("sends POST to /api/preview/exchange", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          entry: { slug: "hello", title: "Hello", _id: "1" },
          sessionId: "sess123",
          expiresAt: Date.now() + 600_000,
        }),
    });

    await client.exchangePreviewSession({
      sessionId: "sess123",
      sessionSecret: "a".repeat(64),
    });

    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toBe(
      "https://api.test.convex.site/api/preview/exchange",
    );
  });

  it("sends POST method with correct body", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          entry: { slug: "hello", title: "Hello", _id: "1" },
          sessionId: "sess123",
          expiresAt: Date.now() + 600_000,
        }),
    });

    await client.exchangePreviewSession({
      sessionId: "sess123",
      sessionSecret: "b".repeat(64),
    });

    const options = mockFetch.mock.calls[0][1];
    expect(options.method).toBe("POST");

    const body = JSON.parse(options.body);
    expect(body.sessionId).toBe("sess123");
    expect(body.timestamp).toBeDefined();
    expect(body.proof).toBeDefined();
  });

  it("includes Authorization header", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          entry: { slug: "hello", title: "Hello", _id: "1" },
          sessionId: "sess123",
          expiresAt: Date.now() + 600_000,
        }),
    });

    await client.exchangePreviewSession({
      sessionId: "sess123",
      sessionSecret: "c".repeat(64),
    });

    const options = mockFetch.mock.calls[0][1];
    expect(options.headers.Authorization).toBe("Bearer nm_previewtest");
  });

  it("returns entry and session metadata", async () => {
    const expected = {
      entry: {
        slug: "hello",
        title: "Hello",
        _id: "1",
        _createdAt: 1000,
        _updatedAt: 2000,
      },
      sessionId: "sess123",
      expiresAt: Date.now() + 600_000,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(expected),
    });

    const result = await client.exchangePreviewSession({
      sessionId: "sess123",
      sessionSecret: "d".repeat(64),
    });

    expect(result.entry.slug).toBe("hello");
    expect(result.sessionId).toBe("sess123");
    expect(result.expiresAt).toBeDefined();
  });

  it("throws NoMessError on 401", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: "Invalid or expired session" }),
    });

    await expect(
      client.exchangePreviewSession({
        sessionId: "expired",
        sessionSecret: "e".repeat(64),
      }),
    ).rejects.toThrow(NoMessError);
  });

  it("throws NoMessError on invalid proof", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () =>
        Promise.resolve({ error: "Invalid proof or stale timestamp" }),
    });

    await expect(
      client.exchangePreviewSession({
        sessionId: "sess123",
        sessionSecret: "f".repeat(64),
      }),
    ).rejects.toThrow("Invalid proof or stale timestamp");
  });
});
