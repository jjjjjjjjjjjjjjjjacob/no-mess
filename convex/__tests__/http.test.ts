/**
 * Tests for the helper functions inside convex/http.ts.
 *
 * The http.ts module defines several local helper functions (authenticateRequest,
 * corsJsonResponse, corsJsonError, corsPreflightResponse, corsJsonResponseNoCache)
 * that are not exported. Since we cannot import them directly, we test the
 * corresponding exported equivalents from convex/lib/apiResponse.ts (already
 * tested in apiResponse.test.ts) and validate the HTTP routing structure
 * through behavioral expectations.
 *
 * This test file focuses on verifying that the http module exports a valid
 * HTTP router with the expected routes registered.
 */

import { vi } from "vitest";

// Mock the internal API references before importing http
vi.mock("../_generated/api", () => ({
  internal: {
    users: { upsertFromClerk: "internal:users:upsertFromClerk" },
    sites: { getByApiKey: "internal:sites:getByApiKey" },
    contentTypes: {
      getBySlugInternal: "internal:contentTypes:getBySlugInternal",
      listBySiteInternal: "internal:contentTypes:listBySiteInternal",
    },
    contentEntries: {
      listPublishedByType: "internal:contentEntries:listPublishedByType",
      getBySlugInternal: "internal:contentEntries:getBySlugInternal",
      getByIdInternal: "internal:contentEntries:getByIdInternal",
      countByTypeInternal: "internal:contentEntries:countByTypeInternal",
    },
    shopify: {
      listProductsInternal: "internal:shopify:listProductsInternal",
      getProductByHandleInternal: "internal:shopify:getProductByHandleInternal",
      listCollectionsInternal: "internal:shopify:listCollectionsInternal",
      getCollectionByHandleInternal:
        "internal:shopify:getCollectionByHandleInternal",
    },
    previewSessions: {
      getValidSession: "internal:previewSessions:getValidSession",
      markSessionUsed: "internal:previewSessions:markSessionUsed",
    },
    contentEntryRoutes: {
      reportDiscoveredInternal:
        "internal:contentEntryRoutes:reportDiscoveredInternal",
    },
  },
}));

// Mock schemaIntrospection dynamic import
vi.mock("../lib/schemaIntrospection", () => ({
  generateFieldTypeMap: vi.fn().mockReturnValue([]),
  generateTypeScriptInterface: vi.fn().mockReturnValue("interface Test {}"),
}));

// Need to mock the previewCrypto dynamic import
vi.mock("../lib/previewCrypto", () => ({
  verifyProof: vi.fn(),
}));

import http from "../http";

describe("http router", () => {
  it("exports a valid HTTP router", () => {
    expect(http).toBeDefined();
    // The router has an isRouter property
    expect(http.isRouter).toBe(true);
  });

  it("has registered routes", () => {
    // The httpRouter produces a function-like object with route configuration.
    // We verify the export exists and is a valid router object.
    expect(typeof http.lookup).toBe("function");
    expect(typeof http.getRoutes).toBe("function");
  });

  it("has routes defined for /webhooks/clerk", () => {
    // lookup returns route info for a path+method combo
    const clerkRoute = http.lookup("/webhooks/clerk", "POST");
    expect(clerkRoute).not.toBeNull();
  });

  it("has routes defined for /api/content/ OPTIONS preflight", () => {
    const optionsRoute = http.lookup("/api/content/blog-posts", "OPTIONS");
    expect(optionsRoute).not.toBeNull();
  });

  it("has routes defined for /api/content/ prefix GET", () => {
    const contentRoute = http.lookup("/api/content/blog-posts", "GET");
    expect(contentRoute).not.toBeNull();
  });

  it("has routes defined for /api/shopify/ OPTIONS preflight", () => {
    const shopifyOptions = http.lookup("/api/shopify/products", "OPTIONS");
    expect(shopifyOptions).not.toBeNull();
  });

  it("has routes defined for /api/shopify/ prefix GET", () => {
    const shopifyRoute = http.lookup("/api/shopify/products", "GET");
    expect(shopifyRoute).not.toBeNull();
  });

  it("has routes defined for /api/preview/exchange OPTIONS", () => {
    const previewOptions = http.lookup("/api/preview/exchange", "OPTIONS");
    expect(previewOptions).not.toBeNull();
  });

  it("has routes defined for /api/preview/exchange POST", () => {
    const previewExchange = http.lookup("/api/preview/exchange", "POST");
    expect(previewExchange).not.toBeNull();
  });

  it("has routes defined for /api/live-edit/routes/report OPTIONS", () => {
    const reportOptions = http.lookup(
      "/api/live-edit/routes/report",
      "OPTIONS",
    );
    expect(reportOptions).not.toBeNull();
  });

  it("has routes defined for /api/live-edit/routes/report POST", () => {
    const reportRoute = http.lookup("/api/live-edit/routes/report", "POST");
    expect(reportRoute).not.toBeNull();
  });

  it("has routes defined for /api/schema OPTIONS preflight", () => {
    const schemaOptions = http.lookup("/api/schema", "OPTIONS");
    expect(schemaOptions).not.toBeNull();
  });

  it("has routes defined for /api/schema GET (list all)", () => {
    const schemaRoute = http.lookup("/api/schema", "GET");
    expect(schemaRoute).not.toBeNull();
  });

  it("has routes defined for /api/schema/:typeSlug GET (single)", () => {
    const schemaRoute = http.lookup("/api/schema/blog-posts", "GET");
    expect(schemaRoute).not.toBeNull();
  });

  it("returns null for unregistered routes", () => {
    const unknown = http.lookup("/api/nonexistent", "GET");
    expect(unknown).toBeNull();
  });
});
