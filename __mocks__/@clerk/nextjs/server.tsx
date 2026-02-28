import { vi } from "vitest";

export const auth = vi.fn().mockResolvedValue({
  userId: null,
  sessionId: null,
  getToken: vi.fn().mockResolvedValue(null),
});

export const currentUser = vi.fn().mockResolvedValue(null);
