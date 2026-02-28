import { ConvexError } from "convex/values";
import { getCurrentUser, getCurrentUserOrNull } from "../lib/auth";
import { createMockQueryCtx } from "./helpers/mockCtx";

describe("getCurrentUser", () => {
  it("returns the user when authenticated and found", async () => {
    const ctx = createMockQueryCtx();
    const mockUser = {
      _id: "user_123",
      _creationTime: 1000,
      clerkId: "clerk_abc",
      email: "test@example.com",
    };

    ctx.auth.getUserIdentity.mockResolvedValue({ subject: "clerk_abc" });
    ctx._mocks.first.mockResolvedValue(mockUser);

    const result = await getCurrentUser(ctx as any);
    expect(result).toEqual(mockUser);
  });

  it("queries users table with by_clerk index", async () => {
    const ctx = createMockQueryCtx();
    const mockUser = { _id: "user_123", clerkId: "clerk_abc" };

    ctx.auth.getUserIdentity.mockResolvedValue({ subject: "clerk_abc" });
    ctx._mocks.first.mockResolvedValue(mockUser);

    await getCurrentUser(ctx as any);

    expect(ctx.db.query).toHaveBeenCalledWith("users");
    expect(ctx._mocks.withIndex).toHaveBeenCalledWith(
      "by_clerk",
      expect.any(Function),
    );
  });

  it("throws 'Not authenticated' when no identity", async () => {
    const ctx = createMockQueryCtx();
    ctx.auth.getUserIdentity.mockResolvedValue(null);

    await expect(getCurrentUser(ctx as any)).rejects.toThrow(ConvexError);
    await expect(getCurrentUser(ctx as any)).rejects.toThrow(
      "Not authenticated",
    );
  });

  it("throws 'User not found in database' when identity exists but no user in DB", async () => {
    const ctx = createMockQueryCtx();
    ctx.auth.getUserIdentity.mockResolvedValue({ subject: "clerk_abc" });
    ctx._mocks.first.mockResolvedValue(null);

    await expect(getCurrentUser(ctx as any)).rejects.toThrow(ConvexError);
    await expect(getCurrentUser(ctx as any)).rejects.toThrow(
      "User not found in database",
    );
  });
});

describe("getCurrentUserOrNull", () => {
  it("returns the user when authenticated and found", async () => {
    const ctx = createMockQueryCtx();
    const mockUser = {
      _id: "user_456",
      _creationTime: 2000,
      clerkId: "clerk_def",
      email: "user@example.com",
    };

    ctx.auth.getUserIdentity.mockResolvedValue({ subject: "clerk_def" });
    ctx._mocks.first.mockResolvedValue(mockUser);

    const result = await getCurrentUserOrNull(ctx as any);
    expect(result).toEqual(mockUser);
  });

  it("returns null when no identity (does not throw)", async () => {
    const ctx = createMockQueryCtx();
    ctx.auth.getUserIdentity.mockResolvedValue(null);

    const result = await getCurrentUserOrNull(ctx as any);
    expect(result).toBeNull();
  });

  it("returns null when identity exists but no user in DB", async () => {
    const ctx = createMockQueryCtx();
    ctx.auth.getUserIdentity.mockResolvedValue({ subject: "clerk_xyz" });
    ctx._mocks.first.mockResolvedValue(null);

    const result = await getCurrentUserOrNull(ctx as any);
    expect(result).toBeNull();
  });

  it("does not query users table when no identity", async () => {
    const ctx = createMockQueryCtx();
    ctx.auth.getUserIdentity.mockResolvedValue(null);

    await getCurrentUserOrNull(ctx as any);
    expect(ctx.db.query).not.toHaveBeenCalled();
  });
});
