import { describe, it, expect } from "vitest";
import { handleCorsOptions, addCorsHeaders } from "../cors";

describe("handleCorsOptions", () => {
  it("returns 204 status", () => {
    const response = handleCorsOptions();
    expect(response.status).toBe(204);
  });

  it("sets Access-Control-Allow-Origin to *", () => {
    const response = handleCorsOptions();
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("sets Access-Control-Allow-Methods", () => {
    const response = handleCorsOptions();
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
      "GET, POST, OPTIONS",
    );
  });

  it("sets Access-Control-Allow-Headers", () => {
    const response = handleCorsOptions();
    expect(response.headers.get("Access-Control-Allow-Headers")).toBe(
      "Authorization, Content-Type",
    );
  });

  it("sets Access-Control-Max-Age to 86400", () => {
    const response = handleCorsOptions();
    expect(response.headers.get("Access-Control-Max-Age")).toBe("86400");
  });
});

describe("addCorsHeaders", () => {
  it("adds Access-Control-Allow-Origin to response", () => {
    const original = new Response("body", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

    const result = addCorsHeaders(original);
    expect(result.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("preserves original status", () => {
    const original = new Response(null, { status: 201 });
    const result = addCorsHeaders(original);
    expect(result.status).toBe(201);
  });

  it("preserves original headers", () => {
    const original = new Response(null, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Custom": "value",
      },
    });

    const result = addCorsHeaders(original);
    expect(result.headers.get("Content-Type")).toBe("application/json");
    expect(result.headers.get("X-Custom")).toBe("value");
  });

  it("preserves body content", async () => {
    const original = new Response(JSON.stringify({ data: "test" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

    const result = addCorsHeaders(original);
    const body = await result.json();
    expect(body).toEqual({ data: "test" });
  });
});
