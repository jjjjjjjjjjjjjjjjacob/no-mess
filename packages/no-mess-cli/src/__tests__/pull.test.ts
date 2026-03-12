/**
 * @vitest-environment node
 */

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { pullSchemaMock, loadConfigMock, validateApiKeyMock } = vi.hoisted(
  () => ({
    pullSchemaMock: vi.fn(),
    loadConfigMock: vi.fn(),
    validateApiKeyMock: vi.fn(),
  }),
);

vi.mock("../api.js", () => ({
  pullSchema: pullSchemaMock,
}));

vi.mock("../config.js", () => ({
  loadConfig: loadConfigMock,
  validateApiKey: validateApiKeyMock,
}));

import { pullCommand } from "../commands/pull";

describe("pullCommand", () => {
  const originalCwd = process.cwd();
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "no-mess-cli-pull-"));
    process.chdir(tempDir);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    loadConfigMock.mockReturnValue({
      apiKey: "nm_secret_key",
      apiUrl: "https://api.test.convex.site",
      schemaPath: resolve(tempDir, "schema.ts"),
    });
    validateApiKeyMock.mockReturnValue({ valid: true });
    pullSchemaMock.mockResolvedValue({
      contentTypes: [
        {
          kind: "fragment",
          slug: "image-with-alt",
          name: "Image With Alt",
          fields: [
            {
              name: "image",
              type: "image",
              required: true,
            },
            {
              name: "alt",
              type: "text",
              required: false,
            },
          ],
        },
        {
          kind: "template",
          slug: "home-page",
          name: "Home Page",
          mode: "singleton",
          route: "/",
          fields: [
            {
              name: "hero",
              type: "object",
              required: false,
              fields: [
                {
                  name: "headline",
                  type: "text",
                  required: true,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("writes template and fragment schemas without flattening metadata", async () => {
    await pullCommand([]);

    const source = readFileSync(resolve(tempDir, "schema.ts"), "utf8");
    expect(source).toContain('defineFragment("image-with-alt"');
    expect(source).toContain('defineTemplate("home-page"');
    expect(source).toContain('mode: "singleton"');
    expect(source).toContain('route: "/"');
    expect(source).toContain("field.object({");
  });
});
