import { vi } from "vitest";
import * as contentEntries from "../contentEntries";

import * as contentTypes from "../contentTypes";
import { createMockQueryCtx } from "./helpers/mockCtx";

function getHandler(fn: any) {
  return fn._handler;
}

describe("contentTypes.listBySiteInternal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only published content types (filters out draft-only)", async () => {
    const ctx = createMockQueryCtx();

    const mockTypes = [
      {
        _id: "ct_1",
        siteId: "site_1",
        name: "Blog",
        slug: "blog",
        status: "published",
      },
      {
        _id: "ct_2",
        siteId: "site_1",
        name: "Draft Schema",
        slug: "draft-schema",
        status: "draft",
      },
      {
        _id: "ct_3",
        siteId: "site_1",
        name: "Pages",
        slug: "pages",
        status: undefined,
      },
    ];

    ctx._mocks.collect.mockResolvedValue(mockTypes);

    const handler = getHandler(contentTypes.listBySiteInternal);
    const result = await handler(ctx, { siteId: "site_1" as any });

    expect(result).toHaveLength(2);
    expect(result[0].slug).toBe("blog");
    expect(result[1].slug).toBe("pages");
  });

  it("queries with by_site index", async () => {
    const ctx = createMockQueryCtx();
    ctx._mocks.collect.mockResolvedValue([]);

    const handler = getHandler(contentTypes.listBySiteInternal);
    await handler(ctx, { siteId: "site_1" as any });

    expect(ctx._mocks.withIndex).toHaveBeenCalledWith(
      "by_site",
      expect.any(Function),
    );
  });
});

describe("contentEntries.countByTypeInternal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("counts entries grouped by status, filtered by siteId", async () => {
    const ctx = createMockQueryCtx();

    const mockEntries = [
      {
        _id: "e1",
        siteId: "site_1",
        contentTypeId: "ct_1",
        status: "published",
      },
      {
        _id: "e2",
        siteId: "site_1",
        contentTypeId: "ct_1",
        status: "published",
      },
      { _id: "e3", siteId: "site_1", contentTypeId: "ct_1", status: "draft" },
      {
        _id: "e4",
        siteId: "site_2",
        contentTypeId: "ct_1",
        status: "published",
      },
    ];

    ctx._mocks.collect.mockResolvedValue(mockEntries);

    const handler = getHandler(contentEntries.countByTypeInternal);
    const result = await handler(ctx, {
      siteId: "site_1" as any,
      contentTypeId: "ct_1" as any,
    });

    expect(result).toEqual({
      published: 2,
      draft: 1,
      total: 3,
    });
  });

  it("returns zeros when no entries exist", async () => {
    const ctx = createMockQueryCtx();
    ctx._mocks.collect.mockResolvedValue([]);

    const handler = getHandler(contentEntries.countByTypeInternal);
    const result = await handler(ctx, {
      siteId: "site_1" as any,
      contentTypeId: "ct_1" as any,
    });

    expect(result).toEqual({
      published: 0,
      draft: 0,
      total: 0,
    });
  });

  it("queries with by_type index", async () => {
    const ctx = createMockQueryCtx();
    ctx._mocks.collect.mockResolvedValue([]);

    const handler = getHandler(contentEntries.countByTypeInternal);
    await handler(ctx, {
      siteId: "site_1" as any,
      contentTypeId: "ct_1" as any,
    });

    expect(ctx._mocks.withIndex).toHaveBeenCalledWith(
      "by_type",
      expect.any(Function),
    );
  });
});
