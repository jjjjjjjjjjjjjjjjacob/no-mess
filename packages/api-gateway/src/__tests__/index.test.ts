import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Env } from "../config";

// Mock global fetch for upstream proxy calls
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// Mock caches.default
const mockCacheMatch = vi.fn();
const mockCachePut = vi.fn();

Object.defineProperty(globalThis, "caches", {
  value: {
    default: {
      match: mockCacheMatch,
      put: mockCachePut,
    },
  },
  writable: true,
});

// Import handler after mocks are set up
import worker from "../index";

const env: Env = {
  UPSTREAM_URL: "https://upstream.test",
  ENVIRONMENT: "test",
};

function createExecutionContext(): ExecutionContext {
  return {
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn(),
  };
}

describe("Worker fetch handler", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockCacheMatch.mockReset();
    mockCachePut.mockReset();

    // Default: no cache hit, upstream returns 200
    mockCacheMatch.mockResolvedValue(undefined);
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        statusText: "OK",
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("OPTIONS request returns CORS preflight (204)", async () => {
    const request = new Request("https://api.nomess.xyz/api/content/blog", {
      method: "OPTIONS",
    });
    const ctx = createExecutionContext();

    const response = await worker.fetch(request, env, ctx);

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
      "GET, POST, OPTIONS",
    );
  });

  it("GET request proxies to upstream and has CORS headers", async () => {
    const request = new Request("https://api.nomess.xyz/api/content/blog", {
      method: "GET",
      headers: { Authorization: "Bearer nm_testkey" },
    });
    const ctx = createExecutionContext();

    const response = await worker.fetch(request, env, ctx);

    // Should have proxied to upstream
    expect(mockFetch).toHaveBeenCalled();
    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toBe("https://upstream.test/api/content/blog");

    // Should have CORS headers
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");

    // Should have 200 status from upstream
    expect(response.status).toBe(200);
  });

  it("rate-limited request returns 429", async () => {
    // Create env with a mock KV that simulates rate limit exceeded
    const mockKV = {
      get: vi.fn().mockResolvedValue(
        JSON.stringify({
          count: 121, // Over the 120 limit
          windowStart: Date.now(),
        }),
      ),
      put: vi.fn().mockResolvedValue(undefined),
    };

    const envWithKV: Env = {
      ...env,
      RATE_LIMIT_KV: mockKV as unknown as KVNamespace,
    };

    const request = new Request("https://api.nomess.xyz/api/content/blog", {
      method: "GET",
      headers: { Authorization: "Bearer nm_testkey" },
    });
    const ctx = createExecutionContext();

    const response = await worker.fetch(request, envWithKV, ctx);

    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body).toHaveProperty("error", "Rate limit exceeded");
  });

  it("GET request without auth still proxies (no rate limit applied)", async () => {
    const request = new Request("https://api.nomess.xyz/api/content/blog", {
      method: "GET",
    });
    const ctx = createExecutionContext();

    const response = await worker.fetch(request, env, ctx);

    // Should still proxy successfully
    expect(mockFetch).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});
