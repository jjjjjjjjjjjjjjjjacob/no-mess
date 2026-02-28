import { ConvexError } from "convex/values";
import { vi } from "vitest";
import { createMockQueryCtx } from "./helpers/mockCtx";

vi.mock("../lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

import { requireSiteAccess, requireSiteOwner } from "../lib/access";
import { getCurrentUser } from "../lib/auth";

const mockGetCurrentUser = vi.mocked(getCurrentUser);

const mockUser = {
  _id: "user_owner",
  clerkId: "clerk_1",
  email: "owner@example.com",
};
const mockOtherUser = {
  _id: "user_editor",
  clerkId: "clerk_2",
  email: "editor@example.com",
};
const mockSite = {
  _id: "site_1",
  name: "Test Site",
  ownerId: "user_owner",
  slug: "test-site",
};

describe("requireSiteAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns role 'owner' when the user is the site owner", async () => {
    const ctx = createMockQueryCtx();
    mockGetCurrentUser.mockResolvedValue(mockUser as any);
    ctx.db.get.mockResolvedValue(mockSite);

    const result = await requireSiteAccess(ctx as any, "site_1" as any);

    expect(result.role).toBe("owner");
    expect(result.user).toEqual(mockUser);
    expect(result.site).toEqual(mockSite);
  });

  it("returns the correct role for a non-owner with siteAccess record", async () => {
    const ctx = createMockQueryCtx();
    mockGetCurrentUser.mockResolvedValue(mockOtherUser as any);
    ctx.db.get.mockResolvedValue(mockSite);
    ctx._mocks.first.mockResolvedValue({
      siteId: "site_1",
      userId: "user_editor",
      role: "editor",
    });

    const result = await requireSiteAccess(ctx as any, "site_1" as any);

    expect(result.role).toBe("editor");
    expect(result.user).toEqual(mockOtherUser);
    expect(result.site).toEqual(mockSite);
  });

  it("queries siteAccess with by_site_user index for non-owners", async () => {
    const ctx = createMockQueryCtx();
    mockGetCurrentUser.mockResolvedValue(mockOtherUser as any);
    ctx.db.get.mockResolvedValue(mockSite);
    ctx._mocks.first.mockResolvedValue({
      siteId: "site_1",
      userId: "user_editor",
      role: "editor",
    });

    await requireSiteAccess(ctx as any, "site_1" as any);

    expect(ctx.db.query).toHaveBeenCalledWith("siteAccess");
    expect(ctx._mocks.withIndex).toHaveBeenCalledWith(
      "by_site_user",
      expect.any(Function),
    );
  });

  it("throws 'Site not found' when site does not exist", async () => {
    const ctx = createMockQueryCtx();
    mockGetCurrentUser.mockResolvedValue(mockUser as any);
    ctx.db.get.mockResolvedValue(null);

    await expect(
      requireSiteAccess(ctx as any, "site_missing" as any),
    ).rejects.toThrow(ConvexError);
    await expect(
      requireSiteAccess(ctx as any, "site_missing" as any),
    ).rejects.toThrow("Site not found");
  });

  it("throws 'You don't have access to this site' when no access record", async () => {
    const ctx = createMockQueryCtx();
    mockGetCurrentUser.mockResolvedValue(mockOtherUser as any);
    ctx.db.get.mockResolvedValue(mockSite);
    ctx._mocks.first.mockResolvedValue(null);

    await expect(
      requireSiteAccess(ctx as any, "site_1" as any),
    ).rejects.toThrow(ConvexError);
    await expect(
      requireSiteAccess(ctx as any, "site_1" as any),
    ).rejects.toThrow("You don't have access to this site");
  });
});

describe("requireSiteOwner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes when user is the owner", async () => {
    const ctx = createMockQueryCtx();
    mockGetCurrentUser.mockResolvedValue(mockUser as any);
    ctx.db.get.mockResolvedValue(mockSite);

    const result = await requireSiteOwner(ctx as any, "site_1" as any);

    expect(result.role).toBe("owner");
    expect(result.user).toEqual(mockUser);
    expect(result.site).toEqual(mockSite);
  });

  it("throws 'Only the site owner can perform this action' for non-owner", async () => {
    const ctx = createMockQueryCtx();
    mockGetCurrentUser.mockResolvedValue(mockOtherUser as any);
    ctx.db.get.mockResolvedValue(mockSite);
    ctx._mocks.first.mockResolvedValue({
      siteId: "site_1",
      userId: "user_editor",
      role: "editor",
    });

    await expect(requireSiteOwner(ctx as any, "site_1" as any)).rejects.toThrow(
      ConvexError,
    );
    await expect(requireSiteOwner(ctx as any, "site_1" as any)).rejects.toThrow(
      "Only the site owner can perform this action",
    );
  });

  it("throws 'Site not found' when site does not exist", async () => {
    const ctx = createMockQueryCtx();
    mockGetCurrentUser.mockResolvedValue(mockUser as any);
    ctx.db.get.mockResolvedValue(null);

    await expect(
      requireSiteOwner(ctx as any, "site_missing" as any),
    ).rejects.toThrow("Site not found");
  });
});
