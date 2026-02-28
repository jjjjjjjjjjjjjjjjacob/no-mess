import { describe, expect, it } from "vitest";
import { corsResponse, errorResponse, jsonResponse } from "../lib/apiResponse";

describe("jsonResponse", () => {
  it("returns 200 by default", () => {
    const res = jsonResponse({ ok: true });
    expect(res.status).toBe(200);
  });

  it("returns custom status code", () => {
    const res = jsonResponse({ created: true }, 201);
    expect(res.status).toBe(201);
  });

  it("serializes body as JSON", async () => {
    const data = { id: 1, name: "test" };
    const res = jsonResponse(data);
    const body = await res.json();
    expect(body).toEqual(data);
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonResponse({});
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });

  it("sets CORS allow-origin header", () => {
    const res = jsonResponse({});
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("sets Cache-Control header", () => {
    const res = jsonResponse({});
    expect(res.headers.get("Cache-Control")).toBe(
      "public, max-age=60, s-maxage=60",
    );
  });
});

describe("errorResponse", () => {
  it("returns 400 by default", () => {
    const res = errorResponse("Bad request");
    expect(res.status).toBe(400);
  });

  it("returns custom status code", () => {
    const res = errorResponse("Not found", 404);
    expect(res.status).toBe(404);
  });

  it("serializes error message as JSON", async () => {
    const res = errorResponse("Something went wrong");
    const body = await res.json();
    expect(body).toEqual({ error: "Something went wrong" });
  });

  it("sets Content-Type to application/json", () => {
    const res = errorResponse("err");
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });

  it("sets CORS allow-origin header", () => {
    const res = errorResponse("err");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("corsResponse", () => {
  it("returns 204 status", () => {
    const res = corsResponse();
    expect(res.status).toBe(204);
  });

  it("has null body", () => {
    const res = corsResponse();
    expect(res.body).toBeNull();
  });

  it("sets Access-Control-Allow-Origin", () => {
    const res = corsResponse();
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("sets Access-Control-Allow-Methods", () => {
    const res = corsResponse();
    expect(res.headers.get("Access-Control-Allow-Methods")).toBe(
      "GET, OPTIONS",
    );
  });

  it("sets Access-Control-Allow-Headers", () => {
    const res = corsResponse();
    expect(res.headers.get("Access-Control-Allow-Headers")).toBe(
      "Authorization, Content-Type",
    );
  });

  it("sets Access-Control-Max-Age", () => {
    const res = corsResponse();
    expect(res.headers.get("Access-Control-Max-Age")).toBe("86400");
  });
});
