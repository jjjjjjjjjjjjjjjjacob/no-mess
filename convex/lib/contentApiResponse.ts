import { jsonNoStoreResponse, jsonResponse } from "./apiResponse";

export function contentApiResponse(
  data: unknown,
  options?: {
    fresh?: boolean;
    previewRequested?: boolean;
  },
  status = 200,
): Response {
  return options?.previewRequested || options?.fresh
    ? jsonNoStoreResponse(data, status)
    : jsonResponse(data, status);
}
