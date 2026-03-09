import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logRequest } from "../logger";
import type { Env } from "../config";

const env: Env = {
  UPSTREAM_URL: "https://upstream.test",
  ENVIRONMENT: "test",
};

describe("logRequest", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("logs JSON with all expected fields", async () => {
    const request = new Request("https://api.nomess.xyz/api/content/blog", {
      method: "GET",
    });
    const response = new Response(null, { status: 200 });

    await logRequest(env, request, response, false, "nm_abc1234");

    expect(consoleSpy).toHaveBeenCalledOnce();

    const logged = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(logged).toHaveProperty("timestamp");
    expect(logged.method).toBe("GET");
    expect(logged.path).toBe("/api/content/blog");
    expect(logged.status).toBe(200);
    expect(logged.cacheHit).toBe(false);
    expect(logged.apiKeyPrefix).toBe("nm_abc1...");
  });

  it("truncates API key to prefix + '...'", async () => {
    const request = new Request("https://api.nomess.xyz/api/content/blog");
    const response = new Response(null, { status: 200 });

    await logRequest(env, request, response, false, "nm_longerkey12345");

    const logged = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(logged.apiKeyPrefix).toBe("nm_long...");
  });

  it("handles null API key", async () => {
    const request = new Request("https://api.nomess.xyz/api/content/blog");
    const response = new Response(null, { status: 200 });

    await logRequest(env, request, response, false, null);

    const logged = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(logged.apiKeyPrefix).toBeNull();
  });

  it("records cacheHit correctly", async () => {
    const request = new Request("https://api.nomess.xyz/api/content/blog");
    const response = new Response(null, { status: 200 });

    await logRequest(env, request, response, true, "nm_test123");

    const logged = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(logged.cacheHit).toBe(true);
  });
});
