import { ConvexError } from "convex/values";
import { vi } from "vitest";
import { createMockMutationCtx, createMockQueryCtx } from "./helpers/mockCtx";

vi.mock("../lib/access", () => ({
  requireSiteAccess: vi.fn(),
  requireSiteOwner: vi.fn(),
}));

import { requireSiteAccess, requireSiteOwner } from "../lib/access";

const mockRequireSiteAccess = vi.mocked(requireSiteAccess);
const mockRequireSiteOwner = vi.mocked(requireSiteOwner);

import * as siteAccess from "../siteAccess";

function getHandler(fn: any) {
  return fn._handler;
}

const mockOwner = {
  _id: "user_owner" as any,
  clerkId: "clerk_owner",
  email: "owner@example.com",
  name: "Owner",
  createdAt: 1000,
};

const mockInvitedUser = {
  _id: "user_invited" as any,
  clerkId: "clerk_invited",
  email: "invited@example.com",
  name: "Invited User",
  createdAt: 2000,
};

const mockSite = {
  _id: "site_1" as any,
  ownerId: "user_owner",
  name: "Test Site",
  slug: "test-site",
};

const mockAccessRecord = {
  _id: "access_1" as any,
  siteId: "site_1",
  userId: "user_invited",
  role: "editor" as const,
  invitedBy: "user_owner",
  invitedAt: 3000,
};

describe("siteAccess.invite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invites a user by email", async () => {
    const ctx = createMockMutationCtx();
    mockRequireSiteOwner.mockResolvedValue({
      user: mockOwner,
      site: mockSite,
      role: "owner",
    } as any);

    // first call: find invited user by email, second call: check existing access
    let firstCallCount = 0;
    ctx._mocks.first.mockImplementation(() => {
      firstCallCount++;
      if (firstCallCount === 1) return Promise.resolve(mockInvitedUser); // user by email
      return Promise.resolve(null); // no existing access
    });

    ctx.db.get.mockResolvedValue(mockSite); // get site for owner check
    ctx.db.insert.mockResolvedValue("access_new");

    const handler = getHandler(siteAccess.invite);
    const result = await handler(ctx, {
      siteId: "site_1",
      email: "invited@example.com",
    });

    expect(result).toBe("access_new");
    expect(ctx.db.insert).toHaveBeenCalledWith(
      "siteAccess",
      expect.objectContaining({
        siteId: "site_1",
        userId: "user_invited",
        role: "editor",
        invitedBy: "user_owner",
      }),
    );
  });

  it("throws when user with email not found", async () => {
    const ctx = createMockMutationCtx();
    mockRequireSiteOwner.mockResolvedValue({
      user: mockOwner,
      site: mockSite,
      role: "owner",
    } as any);
    ctx._mocks.first.mockResolvedValue(null); // no user found by email

    const handler = getHandler(siteAccess.invite);
    await expect(
      handler(ctx, {
        siteId: "site_1",
        email: "unknown@example.com",
      }),
    ).rejects.toThrow("User with this email not found");
  });

  it("throws when user already has access", async () => {
    const ctx = createMockMutationCtx();
    mockRequireSiteOwner.mockResolvedValue({
      user: mockOwner,
      site: mockSite,
      role: "owner",
    } as any);

    let firstCallCount = 0;
    ctx._mocks.first.mockImplementation(() => {
      firstCallCount++;
      if (firstCallCount === 1) return Promise.resolve(mockInvitedUser); // user by email
      return Promise.resolve(mockAccessRecord); // existing access
    });

    const handler = getHandler(siteAccess.invite);
    await expect(
      handler(ctx, {
        siteId: "site_1",
        email: "invited@example.com",
      }),
    ).rejects.toThrow("User already has access to this site");
  });

  it("throws when inviting the site owner", async () => {
    const ctx = createMockMutationCtx();
    mockRequireSiteOwner.mockResolvedValue({
      user: mockOwner,
      site: mockSite,
      role: "owner",
    } as any);

    let firstCallCount = 0;
    ctx._mocks.first.mockImplementation(() => {
      firstCallCount++;
      if (firstCallCount === 1) return Promise.resolve(mockOwner); // found owner by email
      return Promise.resolve(null); // no existing access
    });

    ctx.db.get.mockResolvedValue(mockSite); // get site

    const handler = getHandler(siteAccess.invite);
    await expect(
      handler(ctx, {
        siteId: "site_1",
        email: "owner@example.com",
      }),
    ).rejects.toThrow("User is already the owner of this site");
  });

  it("requires site owner to invite", async () => {
    const ctx = createMockMutationCtx();
    mockRequireSiteOwner.mockRejectedValue(
      new ConvexError("Only the site owner can perform this action"),
    );

    const handler = getHandler(siteAccess.invite);
    await expect(
      handler(ctx, {
        siteId: "site_1",
        email: "invited@example.com",
      }),
    ).rejects.toThrow("Only the site owner can perform this action");
  });

  it("queries users by email index", async () => {
    const ctx = createMockMutationCtx();
    mockRequireSiteOwner.mockResolvedValue({
      user: mockOwner,
      site: mockSite,
      role: "owner",
    } as any);

    let firstCallCount = 0;
    ctx._mocks.first.mockImplementation(() => {
      firstCallCount++;
      if (firstCallCount === 1) return Promise.resolve(mockInvitedUser);
      return Promise.resolve(null);
    });

    ctx.db.get.mockResolvedValue(mockSite);
    ctx.db.insert.mockResolvedValue("access_new");

    const handler = getHandler(siteAccess.invite);
    await handler(ctx, { siteId: "site_1", email: "invited@example.com" });

    expect(ctx.db.query).toHaveBeenCalledWith("users");
    expect(ctx._mocks.withIndex).toHaveBeenCalledWith(
      "by_email",
      expect.any(Function),
    );
  });
});

describe("siteAccess.removeAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes the access record", async () => {
    const ctx = createMockMutationCtx();
    ctx.db.get.mockResolvedValue(mockAccessRecord);
    mockRequireSiteOwner.mockResolvedValue({
      user: mockOwner,
      site: mockSite,
      role: "owner",
    } as any);

    const handler = getHandler(siteAccess.removeAccess);
    await handler(ctx, { siteAccessId: "access_1" });

    expect(ctx.db.delete).toHaveBeenCalledWith("access_1");
  });

  it("throws when access record not found", async () => {
    const ctx = createMockMutationCtx();
    ctx.db.get.mockResolvedValue(null);

    const handler = getHandler(siteAccess.removeAccess);
    await expect(
      handler(ctx, { siteAccessId: "access_missing" }),
    ).rejects.toThrow("Access record not found");
  });

  it("requires site owner to remove access", async () => {
    const ctx = createMockMutationCtx();
    ctx.db.get.mockResolvedValue(mockAccessRecord);
    mockRequireSiteOwner.mockRejectedValue(
      new ConvexError("Only the site owner can perform this action"),
    );

    const handler = getHandler(siteAccess.removeAccess);
    await expect(handler(ctx, { siteAccessId: "access_1" })).rejects.toThrow(
      "Only the site owner can perform this action",
    );
  });
});

describe("siteAccess.listBySite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns access records with user info", async () => {
    const ctx = createMockQueryCtx();
    mockRequireSiteAccess.mockResolvedValue({
      user: mockOwner,
      site: mockSite,
      role: "owner",
    } as any);
    ctx._mocks.collect.mockResolvedValue([mockAccessRecord]);
    ctx.db.get.mockResolvedValue(mockInvitedUser);

    const handler = getHandler(siteAccess.listBySite);
    const result = await handler(ctx, { siteId: "site_1" });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        siteId: "site_1",
        userId: "user_invited",
        role: "editor",
        user: {
          name: "Invited User",
          email: "invited@example.com",
          avatarUrl: undefined,
        },
      }),
    );
  });

  it("returns null user when user no longer exists", async () => {
    const ctx = createMockQueryCtx();
    mockRequireSiteAccess.mockResolvedValue({
      user: mockOwner,
      site: mockSite,
      role: "owner",
    } as any);
    ctx._mocks.collect.mockResolvedValue([mockAccessRecord]);
    ctx.db.get.mockResolvedValue(null); // user deleted

    const handler = getHandler(siteAccess.listBySite);
    const result = await handler(ctx, { siteId: "site_1" });

    expect(result).toHaveLength(1);
    expect(result[0].user).toBeNull();
  });

  it("queries with by_site index", async () => {
    const ctx = createMockQueryCtx();
    mockRequireSiteAccess.mockResolvedValue({
      user: mockOwner,
      site: mockSite,
      role: "owner",
    } as any);
    ctx._mocks.collect.mockResolvedValue([]);

    const handler = getHandler(siteAccess.listBySite);
    await handler(ctx, { siteId: "site_1" });

    expect(ctx.db.query).toHaveBeenCalledWith("siteAccess");
    expect(ctx._mocks.withIndex).toHaveBeenCalledWith(
      "by_site",
      expect.any(Function),
    );
  });
});
