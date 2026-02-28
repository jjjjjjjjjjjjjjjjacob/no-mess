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

  return createNoMessClient({
    apiKey,
    apiUrl: process.env.NO_MESS_API_URL,
  });
}

export function createServer(): McpServer {
  const server = new McpServer({
    name: "no-mess",
    version: "0.1.0",
  });

  // get_schemas -- List all content type schemas
  server.tool(
    "get_schemas",
    "List all content type schemas with TypeScript interfaces, field definitions, and entry counts",
    {},
    async () => {
      const client = getClient();
      const result = await client.getSchemas();
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  // get_schema -- Get a single content type schema
  server.tool(
    "get_schema",
    "Get a single content type schema with TypeScript interface and field definitions",
    { typeSlug: z.string().describe("The slug of the content type") },
    async ({ typeSlug }) => {
      const client = getClient();
      const result = await client.getSchema(typeSlug);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  // get_entries -- Fetch published entries of a content type
  server.tool(
    "get_entries",
    "Fetch all published entries of a content type",
    { typeSlug: z.string().describe("The slug of the content type") },
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
    "Get a single content entry by content type slug and entry slug",
    {
      typeSlug: z.string().describe("The slug of the content type"),
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

  return server;
}

export async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
