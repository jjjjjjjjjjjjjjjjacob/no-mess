import { beforeEach, describe, expect, it, vi } from "vitest";
import { createNoMessClient, DEFAULT_API_URL, NoMessError } from "../index.js";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

function createMockResponse({
  ok = true,
  status = 200,
  body,
  text,
  headers,
}: {
  ok?: boolean;
  status?: number;
  body?: unknown;
  text?: string;
  headers?: Record<string, string>;
}) {
  const bodyText =
    typeof text === "string"
      ? text
      : typeof body === "undefined"
        ? ""
        : JSON.stringify(body);

  return {
    ok,
    status,
    json: () =>
      typeof body === "undefined"
        ? Promise.reject(new Error("no json body"))
        : Promise.resolve(body),
    text: () => Promise.resolve(bodyText),
    headers: {
      get: (name: string) => headers?.[name.toLowerCase()] ?? null,
    },
  };
}

describe("NoMessClient", () => {
  const client = createNoMessClient({
    apiUrl: "https://api.test.convex.site",
    apiKey: "nm_testkey123",
  });

  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("creates a client with config", () => {
    expect(client).toBeDefined();
  });

  it("fetches entries with auth header", async () => {
    const mockEntries = [
      { slug: "hello", title: "Hello", _id: "1", _createdAt: 0, _updatedAt: 0 },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockEntries),
    });

    const entries = await client.getEntries("blog-post");
    expect(entries).toEqual(mockEntries);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.test.convex.site/api/content/blog-post",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer nm_testkey123",
        }),
      }),
    );
  });

  it("fetches a single entry by slug", async () => {
    const mockEntry = {
      slug: "hello",
      title: "Hello",
      _id: "1",
      _createdAt: 0,
      _updatedAt: 0,
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockEntry),
    });

    const entry = await client.getEntry("blog-post", "hello");
    expect(entry).toEqual(mockEntry);
  });

  it("passes preview params", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          slug: "hello",
          title: "Hello",
          _id: "1",
          _createdAt: 0,
          _updatedAt: 0,
        }),
    });

    await client.getEntry("blog-post", "hello", {
      preview: true,
      previewSecret: "secret123",
    });

    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain("preview=true");
    expect(calledUrl).toContain("secret=secret123");
  });

  it("throws NoMessError on API errors", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: "Entry not found" }),
    });

    await expect(client.getEntry("blog-post", "missing")).rejects.toThrow(
      NoMessError,
    );
  });

  it("fetches Shopify products", async () => {
    const mockProducts = [{ handle: "shirt", title: "Cool Shirt" }];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockProducts),
    });

    const products = await client.getProducts();
    expect(products).toEqual(mockProducts);
  });

  it("fetches a single Shopify product", async () => {
    const mockProduct = { handle: "shirt", title: "Cool Shirt" };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockProduct),
    });

    const product = await client.getProduct("shirt");
    expect(product).toEqual(mockProduct);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.test.convex.site/api/shopify/products/shirt",
      expect.any(Object),
    );
  });

  it("removes trailing slash from apiUrl", () => {
    const c = createNoMessClient({
      apiUrl: "https://api.test.convex.site/",
      apiKey: "nm_test",
    });
    expect(c).toBeDefined();
  });

  it("uses default API URL when apiUrl is omitted", async () => {
    const defaultClient = createNoMessClient({
      apiKey: "nm_defaulttest",
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await defaultClient.getEntries("blog-post");

    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toBe(`${DEFAULT_API_URL}/api/content/blog-post`);
  });

  it("uses custom apiUrl when provided (backward compat)", async () => {
    const customClient = createNoMessClient({
      apiUrl: "https://custom.example.com",
      apiKey: "nm_custom",
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await customClient.getEntries("blog-post");

    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toBe("https://custom.example.com/api/content/blog-post");
  });

  describe("getCollections", () => {
    it("fetches /api/shopify/collections", async () => {
      const mockCollections = [
        { handle: "summer", title: "Summer Collection", productsCount: 5 },
        { handle: "winter", title: "Winter Collection", productsCount: 3 },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCollections),
      });

      const collections = await client.getCollections();
      expect(collections).toEqual(mockCollections);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.convex.site/api/shopify/collections",
        expect.any(Object),
      );
    });
  });

  describe("getCollection", () => {
    it("fetches /api/shopify/collections/{handle}", async () => {
      const mockCollection = {
        handle: "summer",
        title: "Summer Collection",
        productsCount: 5,
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCollection),
      });

      const collection = await client.getCollection("summer");
      expect(collection).toEqual(mockCollection);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.convex.site/api/shopify/collections/summer",
        expect.any(Object),
      );
    });
  });

  describe("getSchemas", () => {
    it("fetches /api/schema", async () => {
      const mockResponse = {
        site: { name: "Test", slug: "test" },
        contentTypes: [
          {
            name: "Blog Post",
            slug: "blog-posts",
            fields: [],
            fieldTypeMap: [],
            typescript: "interface BlogPost extends NoMessEntry {}",
            entryCounts: { published: 5, draft: 2, total: 7 },
            endpoints: {
              list: "/api/content/blog-posts",
              get: "/api/content/blog-posts/{slug}",
            },
          },
        ],
        sdkExample: "...",
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.getSchemas();
      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.convex.site/api/schema",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer nm_testkey123",
          }),
        }),
      );
    });
  });

  describe("getSchema", () => {
    it("fetches /api/schema/:typeSlug", async () => {
      const mockResponse = {
        site: { name: "Test", slug: "test" },
        contentType: {
          name: "Blog Post",
          slug: "blog-posts",
          fields: [],
          fieldTypeMap: [],
          typescript: "interface BlogPost extends NoMessEntry {}",
          entryCounts: { published: 5, draft: 2, total: 7 },
          endpoints: {
            list: "/api/content/blog-posts",
            get: "/api/content/blog-posts/{slug}",
          },
        },
        sdkExample: "...",
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.getSchema("blog-posts");
      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.convex.site/api/schema/blog-posts",
        expect.any(Object),
      );
    });
  });

  describe("error handling edge cases", () => {
    it("normalizes fetch rejections as retryable NoMessError", async () => {
      mockFetch.mockRejectedValueOnce(new TypeError("Network down"));

      try {
        await client.getEntries("blog-post");
        expect.unreachable("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(NoMessError);
        expect((err as NoMessError).code).toBe("request_failed");
        expect((err as NoMessError).kind).toBe("network");
        expect((err as NoMessError).retryable).toBe(true);
      }
    });

    it("throws NoMessError when a success response is not valid JSON", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          body: undefined,
          text: "<html>not json</html>",
        }),
      );

      try {
        await client.getEntries("blog-post");
        expect.unreachable("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(NoMessError);
        expect((err as NoMessError).code).toBe("invalid_success_response");
        expect((err as NoMessError).kind).toBe("response");
      }
    });

    it("falls back to HTTP status for non-JSON error response", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: false,
          status: 500,
          text: "",
        }),
      );

      await expect(client.getEntries("blog-post")).rejects.toThrow(
        "HTTP 500 (HTTP 500)",
      );
    });

    it("uses text body when JSON parsing fails", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: false,
          status: 404,
          text: "Not Found",
        }),
      );

      await expect(client.getEntries("blog-post")).rejects.toThrow(
        "Not Found (HTTP 404)",
      );
    });

    it("throws NoMessError with correct status for 500", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: false,
          status: 500,
          body: { error: "Server error" },
          headers: { "x-request-id": "req_123" },
        }),
      );

      try {
        await client.getEntries("blog-post");
        expect.unreachable("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(NoMessError);
        expect((err as InstanceType<typeof NoMessError>).status).toBe(500);
        expect((err as InstanceType<typeof NoMessError>).message).toBe(
          "Server error (HTTP 500)",
        );
        expect((err as InstanceType<typeof NoMessError>).requestId).toBe(
          "req_123",
        );
        expect((err as InstanceType<typeof NoMessError>).retryable).toBe(true);
      }
    });

    it("marks 401 responses as non-retryable", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: false,
          status: 401,
          body: { error: "Unauthorized" },
        }),
      );

      try {
        await client.getEntries("blog-post");
        expect.unreachable("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(NoMessError);
        expect((err as NoMessError).retryable).toBe(false);
        expect((err as NoMessError).code).toBe("http_error");
      }
    });
  });
});
