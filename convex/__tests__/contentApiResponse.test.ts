import { describe, expect, it } from "vitest";
import { contentApiResponse } from "../lib/contentApiResponse";

describe("contentApiResponse", () => {
  it("returns cacheable headers for default published reads", () => {
    const response = contentApiResponse({ ok: true });

    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=60, s-maxage=60",
    );
  });

  it("returns no-store headers for fresh content reads", () => {
    const response = contentApiResponse(
      { ok: true },
      {
        fresh: true,
      },
    );

    expect(response.headers.get("Cache-Control")).toBe(
      "no-store, no-cache, must-revalidate",
    );
  });

  it("returns no-store headers for preview entry reads", () => {
    const response = contentApiResponse(
      { ok: true },
      {
        previewRequested: true,
      },
    );

    expect(response.headers.get("Cache-Control")).toBe(
      "no-store, no-cache, must-revalidate",
    );
  });
});
