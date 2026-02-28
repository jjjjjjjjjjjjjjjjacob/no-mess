import { vi } from "vitest";

/**
 * Creates a mock Convex QueryCtx with chainable db.query().
 */
export function createMockQueryCtx() {
  const collectFn = vi.fn().mockResolvedValue([]);
  const firstFn = vi.fn().mockResolvedValue(null);
  const orderFn = vi
    .fn()
    .mockReturnValue({ collect: collectFn, first: firstFn });
  const filterFn = vi
    .fn()
    .mockReturnValue({ collect: collectFn, first: firstFn, order: orderFn });
  const withIndexFn = vi.fn().mockReturnValue({
    collect: collectFn,
    first: firstFn,
    order: orderFn,
    filter: filterFn,
  });
  const queryFn = vi.fn().mockReturnValue({
    withIndex: withIndexFn,
    collect: collectFn,
    first: firstFn,
    filter: filterFn,
    order: orderFn,
  });

  const ctx = {
    db: {
      get: vi.fn().mockResolvedValue(null),
      query: queryFn,
    },
    auth: {
      getUserIdentity: vi.fn().mockResolvedValue(null),
    },
    storage: {
      getUrl: vi.fn().mockResolvedValue(null),
    },
    // expose inner mocks for assertions
    _mocks: {
      collect: collectFn,
      first: firstFn,
      withIndex: withIndexFn,
      query: queryFn,
      order: orderFn,
      filter: filterFn,
    },
  };

  return ctx;
}

/**
 * Creates a mock Convex MutationCtx (extends QueryCtx).
 */
export function createMockMutationCtx() {
  const queryCtx = createMockQueryCtx();

  return {
    ...queryCtx,
    db: {
      ...queryCtx.db,
      insert: vi.fn().mockResolvedValue("mock_id"),
      patch: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      replace: vi.fn().mockResolvedValue(undefined),
    },
    scheduler: {
      runAfter: vi.fn().mockResolvedValue(undefined),
      runAt: vi.fn().mockResolvedValue(undefined),
    },
  };
}

/**
 * Creates a mock Convex ActionCtx.
 */
export function createMockActionCtx() {
  return {
    runQuery: vi.fn().mockResolvedValue(null),
    runMutation: vi.fn().mockResolvedValue(null),
    runAction: vi.fn().mockResolvedValue(null),
    auth: {
      getUserIdentity: vi.fn().mockResolvedValue(null),
    },
    scheduler: {
      runAfter: vi.fn().mockResolvedValue(undefined),
      runAt: vi.fn().mockResolvedValue(undefined),
    },
  };
}
