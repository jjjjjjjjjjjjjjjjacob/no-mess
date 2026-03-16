/**
 * @vitest-environment node
 */

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { pushSchemaMock, loadConfigMock, validateApiKeyMock } = vi.hoisted(
  () => ({
    pushSchemaMock: vi.fn(),
    loadConfigMock: vi.fn(),
    validateApiKeyMock: vi.fn(),
  }),
);

vi.mock("../api.js", () => ({
  pushSchema: pushSchemaMock,
}));

vi.mock("../config.js", () => ({
  loadConfig: loadConfigMock,
  validateApiKey: validateApiKeyMock,
}));

import { pushCommand } from "../commands/push";

describe("pushCommand", () => {
  const originalCwd = process.cwd();
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "no-mess-cli-push-"));
    process.chdir(tempDir);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    const schemaPath = resolve(tempDir, "schema.ts");
    writeFileSync(
      schemaPath,
      `import { defineSchema, defineTemplate, field } from "@no-mess/client/schema";

const homePage = defineTemplate("home-page", {
  name: "Home Page",
  mode: "singleton",
  route: "/",
  fields: {
    title: field.text({ required: true }),
  },
});

export default defineSchema({
  contentTypes: [homePage],
});
`,
      "utf8",
    );

    loadConfigMock.mockReturnValue({
      apiKey: "nm_secret_key",
      apiUrl: "https://api.test.convex.site",
      schemaPath,
    });
    validateApiKeyMock.mockReturnValue({ valid: true });
    pushSchemaMock.mockResolvedValue({
      synced: [{ slug: "home-page", action: "created" }],
      errors: [],
    });
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("prints the draft publish warning after a successful push", async () => {
    await pushCommand([]);

    expect(pushSchemaMock).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith("Push complete.");
    expect(console.warn).toHaveBeenCalledWith("Schemas were synced as drafts.");
    expect(console.warn).toHaveBeenCalledWith(
      "Published delivery APIs only include published schemas and published entries.",
    );
    expect(console.warn).toHaveBeenCalledWith(
      "Publish the schema in the no-mess dashboard before querying /api/content/:type.",
    );
  });
});
