import { describe, it, expect, vi, beforeEach } from "vitest";
import { proxyToUpstream } from "../proxy";
import type { Env } from "../config";

// Mock global fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

const env: Env = {
  UPSTREAM_URL: "https://upstream.test",
  ENVIRONMENT: "test",
};

describe("proxyToUpstream", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        statusText: "OK",
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("constructs correct upstream URL", async () => {
    const request = new Request(
      "https://api.no-mess.xyz/api/content/blog?preview=true",
    );

    await proxyToUpstream(env, request);

    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toBe(
      "https://upstream.test/api/content/blog?preview=true",
    );
  });

  it("forwards Authorization header", async () => {
    const request = new Request("https://api.no-mess.xyz/api/content/blog", {
      headers: { Authorization: "Bearer nm_abc123" },
    });

    await proxyToUpstream(env, request);

    const calledOptions = mockFetch.mock.calls[0][1];
    expect(calledOptions.headers.get("Authorization")).toBe(
      "Bearer nm_abc123",
    );
  });

  it("sets Content-Type from request or defaults to application/json", async () => {
    // With explicit Content-Type
    const requestWithCt = new Request(
      "https://api.no-mess.xyz/api/content/blog",
      {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "test",
      },
    );

    await proxyToUpstream(env, requestWithCt);

    const calledOptions1 = mockFetch.mock.calls[0][1];
    expect(calledOptions1.headers.get("Content-Type")).toBe("text/plain");

    mockFetch.mockReset();
    mockFetch.mockResolvedValue(
      new Response(null, { status: 200, statusText: "OK" }),
    );

    // Without Content-Type — should default
    const requestWithoutCt = new Request(
      "https://api.no-mess.xyz/api/content/blog",
    );

    await proxyToUpstream(env, requestWithoutCt);

    const calledOptions2 = mockFetch.mock.calls[0][1];
    expect(calledOptions2.headers.get("Content-Type")).toBe("application/json");
  });

  it("sets X-Gateway header", async () => {
    const request = new Request("https://api.no-mess.xyz/api/content/blog");

    await proxyToUpstream(env, request);

    const calledOptions = mockFetch.mock.calls[0][1];
    expect(calledOptions.headers.get("X-Gateway")).toBe(
      "no-mess-api-gateway",
    );
  });

  it("forwards CF-Connecting-IP as X-Forwarded-For", async () => {
    const request = new Request("https://api.no-mess.xyz/api/content/blog", {
      headers: { "CF-Connecting-IP": "192.168.1.1" },
    });

    await proxyToUpstream(env, request);

    const calledOptions = mockFetch.mock.calls[0][1];
    expect(calledOptions.headers.get("X-Forwarded-For")).toBe("192.168.1.1");
  });

  it("omits X-Forwarded-For when no CF-Connecting-IP", async () => {
    const request = new Request("https://api.no-mess.xyz/api/content/blog");

    await proxyToUpstream(env, request);

    const calledOptions = mockFetch.mock.calls[0][1];
    expect(calledOptions.headers.get("X-Forwarded-For")).toBeNull();
  });

  it("does not send body for GET requests", async () => {
    const request = new Request("https://api.no-mess.xyz/api/content/blog", {
      method: "GET",
    });

    await proxyToUpstream(env, request);

    const calledOptions = mockFetch.mock.calls[0][1];
    expect(calledOptions.body).toBeUndefined();
  });

  it("sends body for POST requests", async () => {
    const body = JSON.stringify({ title: "Test" });
    const request = new Request("https://api.no-mess.xyz/api/content/blog", {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" },
    });

    await proxyToUpstream(env, request);

    const calledOptions = mockFetch.mock.calls[0][1];
    expect(calledOptions.body).toBeDefined();
  });

  it("strips server response header", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(null, {
        status: 200,
        headers: {
          server: "convex",
          "Content-Type": "application/json",
        },
      }),
    );

    const request = new Request("https://api.no-mess.xyz/api/content/blog");
    const response = await proxyToUpstream(env, request);

    expect(response.headers.get("server")).toBeNull();
  });

  it("strips x-convex-request-id response header", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(null, {
        status: 200,
        headers: {
          "x-convex-request-id": "req_abc123",
          "Content-Type": "application/json",
        },
      }),
    );

    const request = new Request("https://api.no-mess.xyz/api/content/blog");
    const response = await proxyToUpstream(env, request);

    expect(response.headers.get("x-convex-request-id")).toBeNull();
  });

  it("adds Cache-Control for GET 200 responses", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        statusText: "OK",
      }),
    );

    const request = new Request("https://api.no-mess.xyz/api/content/blog", {
      method: "GET",
    });

    const response = await proxyToUpstream(env, request);

    expect(response.headers.get("Cache-Control")).toBe(
      "public, s-maxage=60, stale-while-revalidate=300",
    );
  });

  it("does not add Cache-Control for POST responses", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        statusText: "OK",
      }),
    );

    const request = new Request("https://api.no-mess.xyz/api/content/blog", {
      method: "POST",
      body: JSON.stringify({ title: "Test" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await proxyToUpstream(env, request);

    expect(response.headers.get("Cache-Control")).toBeNull();
  });

  it("preserves upstream status code and statusText", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(null, {
        status: 404,
        statusText: "Not Found",
      }),
    );

    const request = new Request("https://api.no-mess.xyz/api/content/blog");
    const response = await proxyToUpstream(env, request);

    expect(response.status).toBe(404);
    expect(response.statusText).toBe("Not Found");
  });
});
