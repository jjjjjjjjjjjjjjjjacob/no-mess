/**
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const toolRegistry = new Map<
  string,
  {
    description: string;
    handler: (args: Record<string, unknown>) => Promise<{
      content: { type: string; text: string }[];
    }>;
  }
>();

const connectMock = vi.fn();
const mockCreateNoMessClient = vi.fn();
const transportInstance = { kind: "stdio" };

vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => ({
  McpServer: class MockMcpServer {
    name: string;
    version: string;

    constructor(config: { name: string; version: string }) {
      this.name = config.name;
      this.version = config.version;
    }

    tool(
      name: string,
      description: string,
      _schema: unknown,
      handler: (args: Record<string, unknown>) => Promise<{
        content: { type: string; text: string }[];
      }>,
    ) {
      toolRegistry.set(name, { description, handler });
    }

    connect = connectMock;
  },
}));

vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
  StdioServerTransport: class MockStdioServerTransport {
    constructor() {
      return transportInstance;
    }
  },
}));

vi.mock("@no-mess/client", () => ({
  createNoMessClient: mockCreateNoMessClient,
}));

describe("no-mess MCP server", () => {
  const originalApiKey = process.env.NO_MESS_API_KEY;
  const originalApiUrl = process.env.NO_MESS_API_URL;
  const originalVersion = process.env.NO_MESS_MCP_VERSION;

  const client = {
    getSchemas: vi.fn().mockResolvedValue([{ slug: "home-page", kind: "template" }]),
    getSchema: vi.fn().mockResolvedValue({ slug: "home-page", kind: "template" }),
    getEntries: vi.fn().mockResolvedValue([{ slug: "home" }]),
    getEntry: vi.fn().mockResolvedValue({ slug: "home" }),
    getProducts: vi.fn().mockResolvedValue([{ handle: "tee" }]),
    getProduct: vi.fn().mockResolvedValue({ handle: "tee" }),
    getCollections: vi.fn().mockResolvedValue([{ handle: "summer" }]),
    getCollection: vi.fn().mockResolvedValue({ handle: "summer" }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    toolRegistry.clear();
    connectMock.mockResolvedValue(undefined);
    mockCreateNoMessClient.mockReturnValue(client);
    process.env.NO_MESS_API_KEY = "nm_secret_key";
    process.env.NO_MESS_API_URL = "https://api.test.convex.site";
    process.env.NO_MESS_MCP_VERSION = "9.9.9";
  });

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.NO_MESS_API_KEY;
    } else {
      process.env.NO_MESS_API_KEY = originalApiKey;
    }

    if (originalApiUrl === undefined) {
      delete process.env.NO_MESS_API_URL;
    } else {
      process.env.NO_MESS_API_URL = originalApiUrl;
    }

    if (originalVersion === undefined) {
      delete process.env.NO_MESS_MCP_VERSION;
    } else {
      process.env.NO_MESS_MCP_VERSION = originalVersion;
    }
  });

  it("registers the full schema, content, and Shopify toolset", async () => {
    const { createServer } = await import("../index");
    const server = createServer() as unknown as { name: string; version: string };

    expect(server.name).toBe("no-mess");
    expect(server.version).toBe("9.9.9");
    expect([...toolRegistry.keys()]).toEqual([
      "get_schemas",
      "get_schema",
      "get_entries",
      "get_entry",
      "get_products",
      "get_product",
      "get_collections",
      "get_collection",
    ]);
  });

  it("rejects publishable keys with a clear error", async () => {
    process.env.NO_MESS_API_KEY = "nm_pub_test";
    const { createServer } = await import("../index");
    createServer();

    await expect(toolRegistry.get("get_schemas")!.handler({})).rejects.toThrow(
      "must be a secret key",
    );
  });

  it("calls through to the client for every registered tool", async () => {
    const { createServer } = await import("../index");
    createServer();

    const cases = [
      {
        tool: "get_schemas",
        args: {},
        method: client.getSchemas,
        expectedArg: undefined,
      },
      {
        tool: "get_schema",
        args: { typeSlug: "home-page" },
        method: client.getSchema,
        expectedArg: "home-page",
      },
      {
        tool: "get_entries",
        args: { typeSlug: "blog-posts" },
        method: client.getEntries,
        expectedArg: "blog-posts",
      },
      {
        tool: "get_entry",
        args: { typeSlug: "blog-posts", entrySlug: "hello-world" },
        method: client.getEntry,
        expectedArg: ["blog-posts", "hello-world"],
      },
      {
        tool: "get_products",
        args: {},
        method: client.getProducts,
        expectedArg: undefined,
      },
      {
        tool: "get_product",
        args: { handle: "tee" },
        method: client.getProduct,
        expectedArg: "tee",
      },
      {
        tool: "get_collections",
        args: {},
        method: client.getCollections,
        expectedArg: undefined,
      },
      {
        tool: "get_collection",
        args: { handle: "summer" },
        method: client.getCollection,
        expectedArg: "summer",
      },
    ] as const;

    for (const testCase of cases) {
      const result = await toolRegistry.get(testCase.tool)!.handler(testCase.args);
      const lastCall = testCase.method.mock.results[testCase.method.mock.results.length - 1];
      expect(result.content[0]?.type).toBe("text");
      expect(JSON.parse(result.content[0]?.text ?? "null")).toEqual(
        lastCall ? await lastCall.value : null,
      );

      if (testCase.expectedArg === undefined) {
        expect(testCase.method).toHaveBeenCalled();
      } else if (Array.isArray(testCase.expectedArg)) {
        expect(testCase.method).toHaveBeenCalledWith(...testCase.expectedArg);
      } else {
        expect(testCase.method).toHaveBeenCalledWith(testCase.expectedArg);
      }
    }

    expect(mockCreateNoMessClient).toHaveBeenCalledWith({
      apiKey: "nm_secret_key",
      apiUrl: "https://api.test.convex.site",
    });
  });

  it("connects the stdio transport in main()", async () => {
    const { main } = await import("../index");
    await main();

    expect(connectMock).toHaveBeenCalledWith(transportInstance);
  });
});
