import { vi } from "vitest";
import * as users from "../users";
import { createMockMutationCtx, createMockQueryCtx } from "./helpers/mockCtx";

function getHandler(fn: any) {
  return fn._handler;
}

const mockUser = {
  _id: "user_1" as any,
  clerkId: "clerk_abc",
  email: "user@example.com",
  name: "Test User",
  avatarUrl: "https://example.com/avatar.png",
  createdAt: 1000,
};

describe("users.upsertFromClerk", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts a new user when not found by clerkId", async () => {
    const ctx = createMockMutationCtx();
    ctx._mocks.first.mockResolvedValue(null); // no existing user
    ctx.db.insert.mockResolvedValue("new_user_id");

    const handler = getHandler(users.upsertFromClerk);
    const result = await handler(ctx, {
      clerkId: "clerk_new",
      email: "new@example.com",
      name: "New User",
      avatarUrl: "https://example.com/new-avatar.png",
    });

    expect(result).toBe("new_user_id");
    expect(ctx.db.insert).toHaveBeenCalledWith(
      "users",
      expect.objectContaining({
        clerkId: "clerk_new",
        email: "new@example.com",
        name: "New User",
        avatarUrl: "https://example.com/new-avatar.png",
      }),
    );
  });

  it("sets createdAt on new user", async () => {
    const ctx = createMockMutationCtx();
    ctx._mocks.first.mockResolvedValue(null);
    ctx.db.insert.mockResolvedValue("new_user_id");

    const before = Date.now();
    const handler = getHandler(users.upsertFromClerk);
    await handler(ctx, {
      clerkId: "clerk_new",
      email: "new@example.com",
      name: "New User",
    });
    const after = Date.now();

    const insertData = ctx.db.insert.mock.calls[0][1] as Record<
      string,
      unknown
    >;
    expect(insertData.createdAt).toBeGreaterThanOrEqual(before);
    expect(insertData.createdAt).toBeLessThanOrEqual(after);
  });

  it("patches existing user when found by clerkId", async () => {
    const ctx = createMockMutationCtx();
    ctx._mocks.first.mockResolvedValue(mockUser);

    const handler = getHandler(users.upsertFromClerk);
    const result = await handler(ctx, {
      clerkId: "clerk_abc",
      email: "updated@example.com",
      name: "Updated User",
      avatarUrl: "https://example.com/updated.png",
    });

    expect(result).toBe("user_1");
    expect(ctx.db.patch).toHaveBeenCalledWith("user_1", {
      email: "updated@example.com",
      name: "Updated User",
      avatarUrl: "https://example.com/updated.png",
    });
    expect(ctx.db.insert).not.toHaveBeenCalled();
  });

  it("queries users table with by_clerk index", async () => {
    const ctx = createMockMutationCtx();
    ctx._mocks.first.mockResolvedValue(null);
    ctx.db.insert.mockResolvedValue("new_user_id");

    const handler = getHandler(users.upsertFromClerk);
    await handler(ctx, {
      clerkId: "clerk_abc",
      email: "test@example.com",
      name: "Test",
    });

    expect(ctx.db.query).toHaveBeenCalledWith("users");
    expect(ctx._mocks.withIndex).toHaveBeenCalledWith(
      "by_clerk",
      expect.any(Function),
    );
  });

  it("handles optional avatarUrl", async () => {
    const ctx = createMockMutationCtx();
    ctx._mocks.first.mockResolvedValue(null);
    ctx.db.insert.mockResolvedValue("new_user_id");

    const handler = getHandler(users.upsertFromClerk);
    await handler(ctx, {
      clerkId: "clerk_new",
      email: "new@example.com",
      name: "New User",
    });

    const insertData = ctx.db.insert.mock.calls[0][1] as Record<
      string,
      unknown
    >;
    expect(insertData.avatarUrl).toBeUndefined();
  });
});

describe("users.getCurrent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the user when authenticated", async () => {
    const ctx = createMockQueryCtx();
    ctx.auth.getUserIdentity.mockResolvedValue({ subject: "clerk_abc" });
    ctx._mocks.first.mockResolvedValue(mockUser);

    const handler = getHandler(users.getCurrent);
    const result = await handler(ctx, {});

    expect(result).toEqual(mockUser);
  });

  it("returns null when not authenticated", async () => {
    const ctx = createMockQueryCtx();
    ctx.auth.getUserIdentity.mockResolvedValue(null);

    const handler = getHandler(users.getCurrent);
    const result = await handler(ctx, {});

    expect(result).toBeNull();
  });

  it("returns null when user not found in database", async () => {
    const ctx = createMockQueryCtx();
    ctx.auth.getUserIdentity.mockResolvedValue({ subject: "clerk_unknown" });
    ctx._mocks.first.mockResolvedValue(null);

    const handler = getHandler(users.getCurrent);
    const result = await handler(ctx, {});

    expect(result).toBeNull();
  });

  it("queries users table with by_clerk index", async () => {
    const ctx = createMockQueryCtx();
    ctx.auth.getUserIdentity.mockResolvedValue({ subject: "clerk_abc" });
    ctx._mocks.first.mockResolvedValue(mockUser);

    const handler = getHandler(users.getCurrent);
    await handler(ctx, {});

    expect(ctx.db.query).toHaveBeenCalledWith("users");
    expect(ctx._mocks.withIndex).toHaveBeenCalledWith(
      "by_clerk",
      expect.any(Function),
    );
  });
});

describe("users.getByClerkId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the user when found", async () => {
    const ctx = createMockQueryCtx();
    ctx._mocks.first.mockResolvedValue(mockUser);

    const handler = getHandler(users.getByClerkId);
    const result = await handler(ctx, { clerkId: "clerk_abc" });

    expect(result).toEqual(mockUser);
  });

  it("returns null when not found", async () => {
    const ctx = createMockQueryCtx();
    ctx._mocks.first.mockResolvedValue(null);

    const handler = getHandler(users.getByClerkId);
    const result = await handler(ctx, { clerkId: "clerk_unknown" });

    expect(result).toBeNull();
  });

  it("queries with by_clerk index", async () => {
    const ctx = createMockQueryCtx();
    ctx._mocks.first.mockResolvedValue(null);

    const handler = getHandler(users.getByClerkId);
    await handler(ctx, { clerkId: "clerk_abc" });

    expect(ctx.db.query).toHaveBeenCalledWith("users");
    expect(ctx._mocks.withIndex).toHaveBeenCalledWith(
      "by_clerk",
      expect.any(Function),
    );
  });
});
