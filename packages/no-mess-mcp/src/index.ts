import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { NoMessClient } from "@no-mess/client";
import { createNoMessClient } from "@no-mess/client";
import { z } from "zod";

function getClient(): NoMessClient {
  const apiKey = process.env.NO_MESS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "NO_MESS_API_KEY environment variable is required. " +
        "Set it to your site's API key (starts with nm_).",
    );
  }
  if (apiKey.startsWith("nm_pub_")) {
    throw new Error(
      "NO_MESS_API_KEY must be a secret key (nm_). Publishable keys (nm_pub_) do not expose the full schema and content tools used by the MCP server.",
    );
  }

  return createNoMessClient({
    apiKey,
    apiUrl: process.env.NO_MESS_API_URL,
  });
}

export function createServer(): McpServer {
  const server = new McpServer({
    name: "no-mess",
    version: process.env.NO_MESS_MCP_VERSION ?? "1.0.2",
  });

  // get_schemas -- List all template/fragment schemas
  server.tool(
    "get_schemas",
    "List all template and fragment schemas with field definitions and metadata",
    {},
    async () => {
      const client = getClient();
      const result = await client.getSchemas();
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  // get_schema -- Get a single template/fragment schema
  server.tool(
    "get_schema",
    "Get a single template or fragment schema with field definitions and metadata",
    { typeSlug: z.string().describe("The slug of the schema") },
    async ({ typeSlug }) => {
      const client = getClient();
      const result = await client.getSchema(typeSlug);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  // get_entries -- Fetch published entries of a collection or singleton template
  server.tool(
    "get_entries",
    "Fetch all published entries of a template schema",
    { typeSlug: z.string().describe("The slug of the template schema") },
    async ({ typeSlug }) => {
      const client = getClient();
      const entries = await client.getEntries(typeSlug);
      return {
        content: [{ type: "text", text: JSON.stringify(entries, null, 2) }],
      };
    },
  );

  // get_entry -- Get a single entry by type + slug
  server.tool(
    "get_entry",
    "Get a single content entry by template slug and entry slug",
    {
      typeSlug: z.string().describe("The slug of the template schema"),
      entrySlug: z.string().describe("The slug of the entry"),
    },
    async ({ typeSlug, entrySlug }) => {
      const client = getClient();
      const entry = await client.getEntry(typeSlug, entrySlug);
      return {
        content: [{ type: "text", text: JSON.stringify(entry, null, 2) }],
      };
    },
  );

  // get_products -- List synced Shopify products
  server.tool(
    "get_products",
    "List all synced Shopify products",
    {},
    async () => {
      const client = getClient();
      const products = await client.getProducts();
      return {
        content: [{ type: "text", text: JSON.stringify(products, null, 2) }],
      };
    },
  );

  // get_product -- Get a Shopify product by handle
  server.tool(
    "get_product",
    "Get a single synced Shopify product by handle",
    { handle: z.string().describe("The Shopify product handle") },
    async ({ handle }) => {
      const client = getClient();
      const product = await client.getProduct(handle);
      return {
        content: [{ type: "text", text: JSON.stringify(product, null, 2) }],
      };
    },
  );

  // get_collections -- List synced Shopify collections
  server.tool(
    "get_collections",
    "List all synced Shopify collections",
    {},
    async () => {
      const client = getClient();
      const collections = await client.getCollections();
      return {
        content: [{ type: "text", text: JSON.stringify(collections, null, 2) }],
      };
    },
  );

  // get_collection -- Get a single Shopify collection by handle
  server.tool(
    "get_collection",
    "Get a single synced Shopify collection by handle",
    { handle: z.string().describe("The Shopify collection handle") },
    async ({ handle }) => {
      const client = getClient();
      const collection = await client.getCollection(handle);
      return {
        content: [{ type: "text", text: JSON.stringify(collection, null, 2) }],
      };
    },
  );

  return server;
}

export async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
