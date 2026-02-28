export interface Env {
  UPSTREAM_URL: string;
  ENVIRONMENT: string;
  RATE_LIMIT_KV?: KVNamespace;
}

export const GATEWAY_VERSION = "0.1.0";
