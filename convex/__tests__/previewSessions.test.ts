import { vi } from "vitest";
import { createMockMutationCtx, createMockQueryCtx } from "./helpers/mockCtx";

vi.mock("../lib/access", () => ({
  requireSiteAccess: vi.fn(),
}));

vi.mock("../lib/utils", () => ({
  generateSessionId: vi.fn(() => "mock_session_id_abc"),
  generateSessionSecret: vi.fn(() => "mock_session_secret_xyz"),
}));

import { requireSiteAccess } from "../lib/access";

const mockRequireSiteAccess = vi.mocked(requireSiteAccess);

import * as previewSessions from "../previewSessions";

function getHandler(fn: any) {
  return fn._handler;
}

const mockUser = {
  _id: "user_1" as any,
  clerkId: "clerk_1",
  email: "owner@example.com",
  name: "Owner",
  createdAt: 1000,
};

const mockSite = {
  _id: "site_1" as any,
  ownerId: "user_1",
  name: "Test Site",
  slug: "test-site",
  previewUrl: "https://preview.example.com",
};

const mockSiteNoPreviewUrl = {
  ...mockSite,
  _id: "site_2" as any,
  previewUrl: undefined,
};

const mockContentType = {
  _id: "ct_1" as any,
  siteId: "site_1",
  name: "Blog Post",
  slug: "blog-post",
};

const mockEntry = {
  _id: "entry_1" as any,
  siteId: "site_1",
  contentTypeId: "ct_1",
  title: "My Post",
  slug: "my-post",
  draft: { body: "Draft content" },
  status: "draft" as const,
};

const mockSession = {
  _id: "ps_1" as any,
  sessionId: "session_abc",
  siteId: "site_1",
  entryId: "entry_1",
  contentTypeSlug: "blog-post",
  entrySlug: "my-post",
  sessionSecret: "secret_xyz",
  createdBy: "user_1",
  createdAt: 1000,
  expiresAt: Date.now() + 600_000, // 10 minutes from now
};

const mockExpiredSession = {
  ...mockSession,
  _id: "ps_expired" as any,
  sessionId: "session_expired",
  expiresAt: Date.now() - 60_000, // 1 minute ago
};

describe("previewSessions.create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a preview session and returns sessionId, sessionSecret, and previewUrl", async () => {
    const ctx = createMockMutationCtx();
    // First get call: entry, second: contentType, third: site
    let getCallCount = 0;
    ctx.db.get.mockImplementation(() => {
      getCallCount++;
      if (getCallCount === 1) return Promise.resolve(mockEntry);
      if (getCallCount === 2) return Promise.resolve(mockContentType);
      return Promise.resolve(mockSite);
    });

    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);

    // Collect for expired sessions cleanup
    ctx._mocks.collect.mockResolvedValue([]);
    ctx.db.insert.mockResolvedValue("ps_new");

    const handler = getHandler(previewSessions.create);
    const result = await handler(ctx, { entryId: "entry_1" });

    expect(result).toEqual({
      sessionId: "mock_session_id_abc",
      sessionSecret: "mock_session_secret_xyz",
      siteBaseUrl: "https://preview.example.com",
      previewUrl:
        "https://preview.example.com/no-mess-preview?sid=mock_session_id_abc",
    });
  });

  it("inserts session with correct data", async () => {
    const ctx = createMockMutationCtx();
    let getCallCount = 0;
    ctx.db.get.mockImplementation(() => {
      getCallCount++;
      if (getCallCount === 1) return Promise.resolve(mockEntry);
      if (getCallCount === 2) return Promise.resolve(mockContentType);
      return Promise.resolve(mockSite);
    });

    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);
    ctx._mocks.collect.mockResolvedValue([]);
    ctx.db.insert.mockResolvedValue("ps_new");

    const handler = getHandler(previewSessions.create);
    await handler(ctx, { entryId: "entry_1" });

    expect(ctx.db.insert).toHaveBeenCalledWith(
      "previewSessions",
      expect.objectContaining({
        sessionId: "mock_session_id_abc",
        siteId: "site_1",
        entryId: "entry_1",
        contentTypeSlug: "blog-post",
        entrySlug: "my-post",
        sessionSecret: "mock_session_secret_xyz",
        createdBy: "user_1",
      }),
    );
  });

  it("returns null previewUrl when site has no previewUrl", async () => {
    const ctx = createMockMutationCtx();
    let getCallCount = 0;
    ctx.db.get.mockImplementation(() => {
      getCallCount++;
      if (getCallCount === 1) return Promise.resolve(mockEntry);
      if (getCallCount === 2) return Promise.resolve(mockContentType);
      return Promise.resolve(mockSiteNoPreviewUrl);
    });

    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSiteNoPreviewUrl,
      role: "owner",
    } as any);
    ctx._mocks.collect.mockResolvedValue([]);
    ctx.db.insert.mockResolvedValue("ps_new");

    const handler = getHandler(previewSessions.create);
    const result = await handler(ctx, { entryId: "entry_1" });

    expect(result.previewUrl).toBeNull();
    expect(result.siteBaseUrl).toBeNull();
  });

  it("throws when entry not found", async () => {
    const ctx = createMockMutationCtx();
    ctx.db.get.mockResolvedValue(null);

    const handler = getHandler(previewSessions.create);
    await expect(handler(ctx, { entryId: "entry_missing" })).rejects.toThrow(
      "Content entry not found",
    );
  });

  it("throws when content type not found", async () => {
    const ctx = createMockMutationCtx();
    let getCallCount = 0;
    ctx.db.get.mockImplementation(() => {
      getCallCount++;
      if (getCallCount === 1) return Promise.resolve(mockEntry);
      return Promise.resolve(null); // content type not found
    });

    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);

    const handler = getHandler(previewSessions.create);
    await expect(handler(ctx, { entryId: "entry_1" })).rejects.toThrow(
      "Content type not found",
    );
  });

  it("cleans up expired sessions", async () => {
    const ctx = createMockMutationCtx();
    let getCallCount = 0;
    ctx.db.get.mockImplementation(() => {
      getCallCount++;
      if (getCallCount === 1) return Promise.resolve(mockEntry);
      if (getCallCount === 2) return Promise.resolve(mockContentType);
      return Promise.resolve(mockSite);
    });

    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);

    // Return some expired sessions
    ctx._mocks.collect.mockResolvedValue([
      { _id: "ps_expired_1", expiresAt: Date.now() - 120_000 },
      { _id: "ps_expired_2", expiresAt: Date.now() - 60_000 },
    ]);
    ctx.db.insert.mockResolvedValue("ps_new");

    const handler = getHandler(previewSessions.create);
    await handler(ctx, { entryId: "entry_1" });

    // Should delete expired sessions
    expect(ctx.db.delete).toHaveBeenCalledWith("ps_expired_1");
    expect(ctx.db.delete).toHaveBeenCalledWith("ps_expired_2");
  });

  it("does not delete non-expired sessions during cleanup", async () => {
    const ctx = createMockMutationCtx();
    let getCallCount = 0;
    ctx.db.get.mockImplementation(() => {
      getCallCount++;
      if (getCallCount === 1) return Promise.resolve(mockEntry);
      if (getCallCount === 2) return Promise.resolve(mockContentType);
      return Promise.resolve(mockSite);
    });

    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);

    // One expired, one still valid
    ctx._mocks.collect.mockResolvedValue([
      { _id: "ps_valid", expiresAt: Date.now() + 300_000 },
      { _id: "ps_expired_1", expiresAt: Date.now() - 60_000 },
    ]);
    ctx.db.insert.mockResolvedValue("ps_new");

    const handler = getHandler(previewSessions.create);
    await handler(ctx, { entryId: "entry_1" });

    expect(ctx.db.delete).toHaveBeenCalledWith("ps_expired_1");
    expect(ctx.db.delete).not.toHaveBeenCalledWith("ps_valid");
  });

  it("sets expiresAt to 10 minutes from now", async () => {
    const ctx = createMockMutationCtx();
    let getCallCount = 0;
    ctx.db.get.mockImplementation(() => {
      getCallCount++;
      if (getCallCount === 1) return Promise.resolve(mockEntry);
      if (getCallCount === 2) return Promise.resolve(mockContentType);
      return Promise.resolve(mockSite);
    });

    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);
    ctx._mocks.collect.mockResolvedValue([]);
    ctx.db.insert.mockResolvedValue("ps_new");

    const before = Date.now();
    const handler = getHandler(previewSessions.create);
    await handler(ctx, { entryId: "entry_1" });
    const after = Date.now();

    const insertData = ctx.db.insert.mock.calls[0][1] as Record<
      string,
      unknown
    >;
    const expiresAt = insertData.expiresAt as number;
    const createdAt = insertData.createdAt as number;
    const ttl = expiresAt - createdAt;

    expect(ttl).toBe(600_000); // 10 minutes
    expect(createdAt).toBeGreaterThanOrEqual(before);
    expect(createdAt).toBeLessThanOrEqual(after);
  });
});

describe("previewSessions.getValidSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the session when found and not expired", async () => {
    const ctx = createMockQueryCtx();
    ctx._mocks.first.mockResolvedValue(mockSession);

    const handler = getHandler(previewSessions.getValidSession);
    const result = await handler(ctx, { sessionId: "session_abc" });

    expect(result).toEqual(mockSession);
  });

  it("returns null when session not found", async () => {
    const ctx = createMockQueryCtx();
    ctx._mocks.first.mockResolvedValue(null);

    const handler = getHandler(previewSessions.getValidSession);
    const result = await handler(ctx, { sessionId: "session_missing" });

    expect(result).toBeNull();
  });

  it("returns null when session is expired", async () => {
    const ctx = createMockQueryCtx();
    ctx._mocks.first.mockResolvedValue(mockExpiredSession);

    const handler = getHandler(previewSessions.getValidSession);
    const result = await handler(ctx, { sessionId: "session_expired" });

    expect(result).toBeNull();
  });

  it("queries with by_session_id index", async () => {
    const ctx = createMockQueryCtx();
    ctx._mocks.first.mockResolvedValue(null);

    const handler = getHandler(previewSessions.getValidSession);
    await handler(ctx, { sessionId: "session_abc" });

    expect(ctx.db.query).toHaveBeenCalledWith("previewSessions");
    expect(ctx._mocks.withIndex).toHaveBeenCalledWith(
      "by_session_id",
      expect.any(Function),
    );
  });
});

describe("previewSessions.markSessionUsed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("patches the session with usedAt timestamp", async () => {
    const ctx = createMockMutationCtx();
    ctx._mocks.first.mockResolvedValue(mockSession);

    const before = Date.now();
    const handler = getHandler(previewSessions.markSessionUsed);
    await handler(ctx, { sessionId: "session_abc" });
    const after = Date.now();

    expect(ctx.db.patch).toHaveBeenCalledWith(
      "ps_1",
      expect.objectContaining({
        usedAt: expect.any(Number),
      }),
    );

    const patchData = ctx.db.patch.mock.calls[0][1] as Record<string, unknown>;
    expect(patchData.usedAt).toBeGreaterThanOrEqual(before);
    expect(patchData.usedAt).toBeLessThanOrEqual(after);
  });

  it("does nothing when session not found", async () => {
    const ctx = createMockMutationCtx();
    ctx._mocks.first.mockResolvedValue(null);

    const handler = getHandler(previewSessions.markSessionUsed);
    await handler(ctx, { sessionId: "session_missing" });

    expect(ctx.db.patch).not.toHaveBeenCalled();
  });

  it("queries with by_session_id index", async () => {
    const ctx = createMockMutationCtx();
    ctx._mocks.first.mockResolvedValue(null);

    const handler = getHandler(previewSessions.markSessionUsed);
    await handler(ctx, { sessionId: "session_abc" });

    expect(ctx.db.query).toHaveBeenCalledWith("previewSessions");
    expect(ctx._mocks.withIndex).toHaveBeenCalledWith(
      "by_session_id",
      expect.any(Function),
    );
  });
});
