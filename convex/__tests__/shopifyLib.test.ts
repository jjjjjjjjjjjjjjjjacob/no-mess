import {
  fetchCollections,
  fetchProducts,
  testConnection,
} from "../lib/shopify";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function graphqlResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  };
}

function productsPage(
  products: unknown[],
  hasNextPage = false,
  endCursor: string | null = null,
) {
  return graphqlResponse({
    data: {
      products: {
        edges: products.map((p) => ({ node: p })),
        pageInfo: { hasNextPage, endCursor },
      },
    },
  });
}

function collectionsPage(
  collections: unknown[],
  hasNextPage = false,
  endCursor: string | null = null,
) {
  return graphqlResponse({
    data: {
      collections: {
        edges: collections.map((c) => ({ node: c })),
        pageInfo: { hasNextPage, endCursor },
      },
    },
  });
}

describe("fetchProducts", () => {
  it("POSTs to the correct Storefront GraphQL URL", async () => {
    mockFetch.mockResolvedValue(productsPage([]));

    await fetchProducts("myshop.myshopify.com", "sfapi_token123");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [calledUrl, calledOptions] = mockFetch.mock.calls[0];
    expect(calledUrl).toBe(
      "https://myshop.myshopify.com/api/2026-01/graphql.json",
    );
    expect(calledOptions.method).toBe("POST");
  });

  it("sets the Shopify-Storefront-Private-Token header", async () => {
    mockFetch.mockResolvedValue(productsPage([]));

    await fetchProducts("myshop.myshopify.com", "sfapi_token123");

    const calledOptions = mockFetch.mock.calls[0][1];
    expect(calledOptions.headers["Shopify-Storefront-Private-Token"]).toBe(
      "sfapi_token123",
    );
  });

  it("sends first=250 as a variable", async () => {
    mockFetch.mockResolvedValue(productsPage([]));

    await fetchProducts("myshop.myshopify.com", "sfapi_token123");

    const calledOptions = mockFetch.mock.calls[0][1];
    const body = JSON.parse(calledOptions.body);
    expect(body.variables.first).toBe(250);
  });

  it("returns the products array", async () => {
    const products = [
      {
        id: "gid://shopify/Product/1",
        title: "Product A",
        handle: "product-a",
      },
      {
        id: "gid://shopify/Product/2",
        title: "Product B",
        handle: "product-b",
      },
    ];
    mockFetch.mockResolvedValue(productsPage(products));

    const result = await fetchProducts(
      "myshop.myshopify.com",
      "sfapi_token123",
    );

    expect(result).toEqual(products);
    expect(result).toHaveLength(2);
  });

  it("returns empty array when no products exist", async () => {
    mockFetch.mockResolvedValue(productsPage([]));

    const result = await fetchProducts(
      "myshop.myshopify.com",
      "sfapi_token123",
    );

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it("paginates using hasNextPage and endCursor", async () => {
    const page1Products = [
      { id: "gid://shopify/Product/1", title: "Product 1", handle: "p-1" },
    ];
    const page2Products = [
      { id: "gid://shopify/Product/2", title: "Product 2", handle: "p-2" },
    ];

    mockFetch
      .mockResolvedValueOnce(productsPage(page1Products, true, "cursor_abc"))
      .mockResolvedValueOnce(productsPage(page2Products, false, null));

    const result = await fetchProducts(
      "myshop.myshopify.com",
      "sfapi_token123",
    );

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);

    // Second call should include after cursor
    const secondBody = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(secondBody.variables.after).toBe("cursor_abc");
  });

  it("stops pagination when hasNextPage is false", async () => {
    const products = [
      { id: "gid://shopify/Product/1", title: "Product 1", handle: "p-1" },
    ];
    mockFetch.mockResolvedValue(productsPage(products, false, null));

    await fetchProducts("myshop.myshopify.com", "sfapi_token123");

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("throws an error when the API returns a non-OK response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve("Unauthorized"),
    });

    await expect(
      fetchProducts("myshop.myshopify.com", "bad_token"),
    ).rejects.toThrow("Shopify API error 401: Unauthorized");
  });

  it("throws an error when GraphQL returns errors", async () => {
    mockFetch.mockResolvedValue(
      graphqlResponse({
        data: null,
        errors: [{ message: "Access denied" }],
      }),
    );

    await expect(
      fetchProducts("myshop.myshopify.com", "bad_token"),
    ).rejects.toThrow("Shopify GraphQL error: Access denied");
  });
});

describe("fetchCollections", () => {
  it("fetches collections via a single GraphQL query", async () => {
    const collections = [
      {
        id: "gid://shopify/Collection/1",
        title: "Spring",
        handle: "spring",
        image: null,
      },
    ];
    mockFetch.mockResolvedValue(collectionsPage(collections));

    const result = await fetchCollections(
      "myshop.myshopify.com",
      "sfapi_token123",
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result).toEqual(collections);
    expect(result).toHaveLength(1);
  });

  it("paginates collections using hasNextPage and endCursor", async () => {
    const page1 = [
      {
        id: "gid://shopify/Collection/1",
        title: "Col 1",
        handle: "col-1",
        image: null,
      },
    ];
    const page2 = [
      {
        id: "gid://shopify/Collection/2",
        title: "Col 2",
        handle: "col-2",
        image: null,
      },
    ];

    mockFetch
      .mockResolvedValueOnce(collectionsPage(page1, true, "cursor_col"))
      .mockResolvedValueOnce(collectionsPage(page2, false, null));

    const result = await fetchCollections(
      "myshop.myshopify.com",
      "sfapi_token123",
    );

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
  });

  it("returns empty array when no collections exist", async () => {
    mockFetch.mockResolvedValue(collectionsPage([]));

    const result = await fetchCollections(
      "myshop.myshopify.com",
      "sfapi_token123",
    );

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });
});

describe("testConnection", () => {
  it("returns success with shop name on valid connection", async () => {
    mockFetch.mockResolvedValue(
      graphqlResponse({ data: { shop: { name: "My Test Shop" } } }),
    );

    const result = await testConnection(
      "myshop.myshopify.com",
      "sfapi_token123",
    );

    expect(result).toEqual({ success: true, shopName: "My Test Shop" });
  });

  it("returns failure with error message on API error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      text: () => Promise.resolve("Forbidden"),
    });

    const result = await testConnection("myshop.myshopify.com", "bad_token");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Shopify API error 403");
  });

  it("POSTs the shop query to the Storefront GraphQL endpoint", async () => {
    mockFetch.mockResolvedValue(
      graphqlResponse({ data: { shop: { name: "My Shop" } } }),
    );

    await testConnection("myshop.myshopify.com", "sfapi_token123");

    const [calledUrl, calledOptions] = mockFetch.mock.calls[0];
    expect(calledUrl).toBe(
      "https://myshop.myshopify.com/api/2026-01/graphql.json",
    );
    expect(calledOptions.method).toBe("POST");
    const body = JSON.parse(calledOptions.body);
    expect(body.query).toContain("shop");
  });

  it("returns failure when fetch throws a network error", async () => {
    mockFetch.mockRejectedValue(new Error("Network failure"));

    const result = await testConnection(
      "myshop.myshopify.com",
      "sfapi_token123",
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Network failure");
  });

  it("returns failure when GraphQL returns errors", async () => {
    mockFetch.mockResolvedValue(
      graphqlResponse({
        data: null,
        errors: [{ message: "Invalid token" }],
      }),
    );

    const result = await testConnection("myshop.myshopify.com", "bad_token");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid token");
  });
});
