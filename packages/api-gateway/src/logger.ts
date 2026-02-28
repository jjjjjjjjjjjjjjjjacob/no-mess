import type { Env } from "./config";

interface LogEntry {
  timestamp: number;
  method: string;
  path: string;
  status: number;
  cacheHit: boolean;
  apiKeyPrefix: string | null;
}

/**
 * Log a request asynchronously.
 * Uses console.log (visible in Workers Logs dashboard).
 */
export async function logRequest(
  _env: Env,
  request: Request,
  response: Response,
  cacheHit: boolean,
  apiKey: string | null,
): Promise<void> {
  const entry: LogEntry = {
    timestamp: Date.now(),
    method: request.method,
    path: new URL(request.url).pathname,
    status: response.status,
    cacheHit,
    apiKeyPrefix: apiKey ? apiKey.slice(0, 7) + "..." : null,
  };

  console.log(JSON.stringify(entry));
}
