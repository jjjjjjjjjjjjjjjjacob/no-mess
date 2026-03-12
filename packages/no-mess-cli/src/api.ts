import type { ContentTypeDefinition } from "@no-mess/client/schema";

export interface SyncResult {
  synced: { slug: string; action: "created" | "updated" }[];
  errors: string[];
}

export interface SchemaResponse {
  contentTypes: ContentTypeDefinition[];
}

/**
 * Push schema definitions to the no-mess API.
 */
export async function pushSchema(
  apiUrl: string,
  apiKey: string,
  contentTypes: ContentTypeDefinition[],
): Promise<SyncResult> {
  const response = await fetch(`${apiUrl}/api/schema/sync`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ contentTypes }),
  });

  if (!response.ok) {
    const body = await response.text();
    let message: string;
    try {
      const json = JSON.parse(body);
      message = json.error ?? body;
    } catch {
      message = body;
    }
    throw new Error(`API error (${response.status}): ${message}`);
  }

  return response.json();
}

/**
 * Pull schema definitions from the no-mess API.
 */
export async function pullSchema(
  apiUrl: string,
  apiKey: string,
): Promise<SchemaResponse> {
  const response = await fetch(`${apiUrl}/api/schema`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    let message: string;
    try {
      const json = JSON.parse(body);
      message = json.error ?? body;
    } catch {
      message = body;
    }
    throw new Error(`API error (${response.status}): ${message}`);
  }

  return response.json();
}
