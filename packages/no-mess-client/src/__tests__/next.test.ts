import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_API_URL, NoMessError } from "../index.js";
import {
  createBrowserNoMessClient,
  createServerNoMessClient,
} from "../next/index.js";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe("@no-mess/client/next", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NO_MESS_API_KEY;
    delete process.env.NO_MESS_API_URL;
    delete process.env.NEXT_PUBLIC_NO_MESS_API_URL;
    delete process.env.NEXT_PUBLIC_NO_MESS_PUBLISHABLE_KEY;
    mockFetch.mockReset();
  });

  it("creates a server client from NO_MESS_API_KEY and NO_MESS_API_URL", async () => {
    process.env.NO_MESS_API_KEY = "nm_server_key";
    process.env.NO_MESS_API_URL = "https://server.example.com";
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const client = createServerNoMessClient();
    await client.getEntries("blog-post");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://server.example.com/api/content/blog-post",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer nm_server_key",
        }),
      }),
    );
  });

  it("passes optional server overrides through to the client", async () => {
    process.env.NO_MESS_API_KEY = "nm_server_key";
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve("[]"),
      headers: { get: () => null },
    });

    await createServerNoMessClient({
      apiUrl: "https://override.example.com",
      fetch: {
        cache: "no-store",
      },
    }).getEntries("blog-post");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://override.example.com/api/content/blog-post?fresh=true",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
  });

  it("falls back to NEXT_PUBLIC_NO_MESS_API_URL then DEFAULT_API_URL on the server", async () => {
    process.env.NO_MESS_API_KEY = "nm_server_key";
    process.env.NEXT_PUBLIC_NO_MESS_API_URL = "https://public.example.com";
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await createServerNoMessClient().getEntries("blog-post");
    expect(mockFetch.mock.calls[0][0]).toBe(
      "https://public.example.com/api/content/blog-post",
    );

    mockFetch.mockReset();
    delete process.env.NEXT_PUBLIC_NO_MESS_API_URL;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await createServerNoMessClient().getEntries("blog-post");
    expect(mockFetch.mock.calls[0][0]).toBe(
      `${DEFAULT_API_URL}/api/content/blog-post`,
    );
  });

  it("throws a config error when NO_MESS_API_KEY is missing on the server", () => {
    expect(() => createServerNoMessClient()).toThrow(NoMessError);
    expect(() => createServerNoMessClient()).toThrow(
      "Missing required no-mess configuration: NO_MESS_API_KEY.",
    );
  });

  it("creates a browser client from NEXT_PUBLIC_NO_MESS_PUBLISHABLE_KEY", async () => {
    process.env.NEXT_PUBLIC_NO_MESS_PUBLISHABLE_KEY = "nm_pub_browser_key";
    process.env.NEXT_PUBLIC_NO_MESS_API_URL = "https://browser.example.com";
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const client = createBrowserNoMessClient();
    await client.getEntries("blog-post");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://browser.example.com/api/content/blog-post",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer nm_pub_browser_key",
        }),
      }),
    );
  });

  it("passes optional browser overrides through to the client", async () => {
    process.env.NEXT_PUBLIC_NO_MESS_PUBLISHABLE_KEY = "nm_pub_browser_key";
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve("[]"),
      headers: { get: () => null },
    });

    await createBrowserNoMessClient({
      apiUrl: "https://override-browser.example.com",
      fresh: true,
    }).getEntries("blog-post");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://override-browser.example.com/api/content/blog-post?fresh=true",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer nm_pub_browser_key",
        }),
      }),
    );
  });

  it("throws a config error when NEXT_PUBLIC_NO_MESS_PUBLISHABLE_KEY is missing", () => {
    expect(() => createBrowserNoMessClient()).toThrow(NoMessError);
    expect(() => createBrowserNoMessClient()).toThrow(
      "Missing required no-mess configuration: NEXT_PUBLIC_NO_MESS_PUBLISHABLE_KEY.",
    );
  });
});
