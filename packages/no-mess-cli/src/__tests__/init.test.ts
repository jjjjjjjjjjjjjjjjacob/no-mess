/**
 * @vitest-environment node
 */

import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initCommand } from "../commands/init";

describe("initCommand", () => {
  const originalCwd = process.cwd();
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "no-mess-cli-init-"));
    process.chdir(tempDir);
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("creates a recursive starter schema with a fragment and singleton template", async () => {
    await initCommand(["--schema", "cms/schema.ts"]);

    const schemaPath = resolve(tempDir, "cms/schema.ts");
    const envPath = resolve(tempDir, ".env");

    expect(existsSync(schemaPath)).toBe(true);
    expect(existsSync(envPath)).toBe(true);

    const source = readFileSync(schemaPath, "utf8");
    expect(source).toContain("defineFragment(\"image-with-alt\"");
    expect(source).toContain("defineTemplate(\"home-page\"");
    expect(source).toContain('mode: "singleton"');
    expect(source).toContain('route: "/"');
    expect(source).toContain("field.object({");
    expect(source).toContain("field.array({");
    expect(source).toContain("field.fragment(imageWithAlt)");
    expect(readFileSync(envPath, "utf8")).toContain("NO_MESS_API_KEY=");
  });

  it("does not overwrite an existing schema file", async () => {
    const schemaPath = resolve(tempDir, "schema.ts");
    writeFileSync(schemaPath, "// keep me\n", "utf8");

    await initCommand([]);

    expect(readFileSync(schemaPath, "utf8")).toBe("// keep me\n");
  });
});
