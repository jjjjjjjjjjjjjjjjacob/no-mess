import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPreviewHandler } from "../index.js";
import type {
  NoMessEntry,
  PreviewExchangeResult,
  PreviewHandlerConfig,
  PreviewSessionAuth,
} from "../types.js";

// --- Mocks for window APIs ---

const mockPostMessage = vi.fn();
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();

Object.defineProperty(globalThis, "window", {
  value: {
    addEventListener: mockAddEventListener,
    removeEventListener: mockRemoveEventListener,
    parent: {
      postMessage: mockPostMessage,
    },
  },
  writable: true,
});

// --- Helpers ---

const ADMIN_ORIGIN = "https://admin.no-mess.xyz";

const mockEntry: NoMessEntry = {
  slug: "hello",
  title: "Hello World",
  _id: "entry1",
  _createdAt: 1000,
  _updatedAt: 2000,
};

const mockExchangeResult: PreviewExchangeResult = {
  entry: mockEntry,
  sessionId: "sid",
  expiresAt: Date.now() + 600_000,
};

function createMockConfig(
  overrides?: Partial<PreviewHandlerConfig>,
): PreviewHandlerConfig {
  return {
    client: {
      exchangePreviewSession: vi
        .fn<(session: PreviewSessionAuth) => Promise<PreviewExchangeResult>>()
        .mockResolvedValue(mockExchangeResult),
    },
    adminOrigin: ADMIN_ORIGIN,
    onEntry: vi.fn(),
    onError: vi.fn(),
    ...overrides,
  };
}

/**
 * Capture the message handler that was registered via addEventListener,
 * then invoke it with a synthetic MessageEvent.
 */
function getRegisteredHandler(): (event: MessageEvent) => void {
  const call = mockAddEventListener.mock.calls.find(
    (c) => c[0] === "message",
  );
  if (!call) throw new Error("No message listener registered");
  return call[1];
}

function createMessageEvent(
  data: unknown,
  origin: string = ADMIN_ORIGIN,
): MessageEvent {
  return { data, origin } as MessageEvent;
}

// --- Tests ---

describe("createPreviewHandler", () => {
  beforeEach(() => {
    mockPostMessage.mockReset();
    mockAddEventListener.mockReset();
    mockRemoveEventListener.mockReset();
  });

  describe("start()", () => {
    it("posts preview-ready to parent", () => {
      const config = createMockConfig();
      const handler = createPreviewHandler(config);

      handler.start();

      expect(mockPostMessage).toHaveBeenCalledWith(
        { type: "no-mess:preview-ready" },
        "*",
      );
    });

    it("registers message listener", () => {
      const config = createMockConfig();
      const handler = createPreviewHandler(config);

      handler.start();

      expect(mockAddEventListener).toHaveBeenCalledWith(
        "message",
        expect.any(Function),
      );
    });
  });

  describe("cleanup()", () => {
    it("removes message listener", () => {
      const config = createMockConfig();
      const handler = createPreviewHandler(config);

      handler.start();
      handler.cleanup();

      expect(mockRemoveEventListener).toHaveBeenCalledWith(
        "message",
        expect.any(Function),
      );
    });
  });

  describe("message handling", () => {
    it("ignores messages from wrong origin", async () => {
      const config = createMockConfig();
      const handler = createPreviewHandler(config);
      handler.start();

      const messageHandler = getRegisteredHandler();
      await messageHandler(
        createMessageEvent(
          { type: "no-mess:session-auth", sessionId: "sid", sessionSecret: "secret" },
          "https://evil.example.com",
        ),
      );

      expect(config.client.exchangePreviewSession).not.toHaveBeenCalled();
    });

    it("ignores messages without type field", async () => {
      const config = createMockConfig();
      const handler = createPreviewHandler(config);
      handler.start();

      const messageHandler = getRegisteredHandler();
      await messageHandler(createMessageEvent({}));

      expect(config.client.exchangePreviewSession).not.toHaveBeenCalled();
    });

    it("ignores messages with null data", async () => {
      const config = createMockConfig();
      const handler = createPreviewHandler(config);
      handler.start();

      const messageHandler = getRegisteredHandler();
      await messageHandler(createMessageEvent(null));

      expect(config.client.exchangePreviewSession).not.toHaveBeenCalled();
    });

    it("handles session-auth message", async () => {
      const config = createMockConfig();
      const handler = createPreviewHandler(config);
      handler.start();

      const messageHandler = getRegisteredHandler();
      await messageHandler(
        createMessageEvent({
          type: "no-mess:session-auth",
          sessionId: "sid",
          sessionSecret: "secret",
        }),
      );

      expect(config.client.exchangePreviewSession).toHaveBeenCalledWith({
        sessionId: "sid",
        sessionSecret: "secret",
      });
      expect(config.onEntry).toHaveBeenCalledWith(mockEntry);
      expect(mockPostMessage).toHaveBeenCalledWith(
        { type: "no-mess:preview-loaded" },
        ADMIN_ORIGIN,
      );
    });

    it("handles session-auth exchange failure", async () => {
      const exchangeError = new Error("Exchange failed");
      const config = createMockConfig({
        client: {
          exchangePreviewSession: vi
            .fn<(session: PreviewSessionAuth) => Promise<PreviewExchangeResult>>()
            .mockRejectedValue(exchangeError),
        },
      });
      const handler = createPreviewHandler(config);
      handler.start();

      const messageHandler = getRegisteredHandler();
      await messageHandler(
        createMessageEvent({
          type: "no-mess:session-auth",
          sessionId: "sid",
          sessionSecret: "secret",
        }),
      );

      expect(config.onError).toHaveBeenCalledWith(exchangeError);
      expect(mockPostMessage).toHaveBeenCalledWith(
        { type: "no-mess:preview-error", error: "Exchange failed" },
        ADMIN_ORIGIN,
      );
    });

    it("handles refresh with stored session", async () => {
      const config = createMockConfig();
      const handler = createPreviewHandler(config);
      handler.start();

      const messageHandler = getRegisteredHandler();

      // First: send session-auth to store the session
      await messageHandler(
        createMessageEvent({
          type: "no-mess:session-auth",
          sessionId: "sid",
          sessionSecret: "secret",
        }),
      );

      // Then: send refresh
      await messageHandler(
        createMessageEvent({ type: "no-mess:refresh" }),
      );

      expect(config.client.exchangePreviewSession).toHaveBeenCalledTimes(2);
    });

    it("ignores refresh without prior session", async () => {
      const config = createMockConfig();
      const handler = createPreviewHandler(config);
      handler.start();

      const messageHandler = getRegisteredHandler();
      await messageHandler(
        createMessageEvent({ type: "no-mess:refresh" }),
      );

      expect(config.client.exchangePreviewSession).not.toHaveBeenCalled();
    });
  });
});
