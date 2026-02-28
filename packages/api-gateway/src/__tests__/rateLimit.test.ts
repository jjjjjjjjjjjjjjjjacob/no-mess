import { describe, expect, it } from "vitest";
import { extractApiKey } from "../rateLimit";

describe("extractApiKey", () => {
  it("extracts nm_ key from Bearer token", () => {
    const request = new Request("https://api.no-mess.xyz/api/content/blog", {
      headers: { Authorization: "Bearer nm_abc123" },
    });
    expect(extractApiKey(request)).toBe("nm_abc123");
  });

  it("returns null for missing Authorization header", () => {
    const request = new Request("https://api.no-mess.xyz/api/content/blog");
    expect(extractApiKey(request)).toBeNull();
  });

  it("returns null for non-Bearer auth", () => {
    const request = new Request("https://api.no-mess.xyz/api/content/blog", {
      headers: { Authorization: "Basic abc123" },
    });
    expect(extractApiKey(request)).toBeNull();
  });

  it("returns null for non-nm_ key", () => {
    const request = new Request("https://api.no-mess.xyz/api/content/blog", {
      headers: { Authorization: "Bearer sk_abc123" },
    });
    expect(extractApiKey(request)).toBeNull();
  });

  it("returns null for empty Bearer value", () => {
    const request = new Request("https://api.no-mess.xyz/api/content/blog", {
      headers: { Authorization: "Bearer " },
    });
    expect(extractApiKey(request)).toBeNull();
  });
});
