/**
 * @vitest-environment node
 */

import { describe, expect, it, vi } from "vitest";
import {
  getDraftPublishWarningLines,
  printDraftPublishWarning,
} from "../sync-output";

describe("sync-output", () => {
  it("returns the canonical draft publish warning lines", () => {
    expect(getDraftPublishWarningLines()).toEqual([
      "Schemas were synced as drafts.",
      "Published delivery APIs only include published schemas and published entries.",
      "Publish the schema in the no-mess dashboard before querying /api/content/:type.",
    ]);
  });

  it("prints each draft publish warning line", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      printDraftPublishWarning();

      expect(warnSpy.mock.calls).toEqual(
        getDraftPublishWarningLines().map((line) => [line]),
      );
    } finally {
      warnSpy.mockRestore();
    }
  });
});
