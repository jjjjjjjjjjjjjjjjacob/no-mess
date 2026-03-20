/**
 * @vitest-environment node
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { codegenCommand } from "../commands/codegen";

describe("codegenCommand", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects --schema when the flag is missing a value", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((
      code?: number,
    ) => {
      throw new Error(`process.exit:${code ?? 0}`);
    }) as never);

    await expect(codegenCommand(["--schema"])).rejects.toThrow(
      "process.exit:1",
    );
    expect(errorSpy).toHaveBeenCalledWith("Error: --schema requires a value.");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("rejects --out when the flag is missing a value", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((
      code?: number,
    ) => {
      throw new Error(`process.exit:${code ?? 0}`);
    }) as never);

    await expect(codegenCommand(["--out"])).rejects.toThrow("process.exit:1");
    expect(errorSpy).toHaveBeenCalledWith("Error: --out requires a value.");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
