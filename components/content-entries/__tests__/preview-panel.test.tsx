import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { PreviewPanel, type PreviewPanelRef } from "../preview-panel";

const mockCreateSession = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => mockCreateSession),
}));

vi.mock("@/convex/_generated/api", () => ({
  api: {
    previewSessions: {
      create: "mock_ref",
    },
  },
}));

vi.mock("lucide-react", () => ({
  Eye: (props: Record<string, unknown>) => (
    <span data-testid="eye-icon" {...props} />
  ),
  Loader2: (props: Record<string, unknown>) => (
    <span data-testid="loader-icon" {...props} />
  ),
  RefreshCw: (props: Record<string, unknown>) => (
    <span data-testid="refresh-icon" {...props} />
  ),
  X: (props: Record<string, unknown>) => (
    <span data-testid="x-icon" {...props} />
  ),
}));

const defaultProps = {
  entryId: "entry123" as never,
  previewUrl: "https://example.com/preview",
  onClose: vi.fn(),
};

describe("PreviewPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateSession.mockReset();
  });

  it('renders "Preview" header text', () => {
    mockCreateSession.mockImplementation(() => new Promise(() => {}));
    render(<PreviewPanel {...defaultProps} />);
    expect(screen.getByText("Preview")).toBeInTheDocument();
  });

  it("shows loading state initially (spinner)", () => {
    mockCreateSession.mockImplementation(() => new Promise(() => {}));
    render(<PreviewPanel {...defaultProps} />);
    const loaders = screen.getAllByTestId("loader-icon");
    expect(loaders.length).toBeGreaterThanOrEqual(1);
  });

  it("calls createSession mutation on mount", () => {
    mockCreateSession.mockImplementation(() => new Promise(() => {}));
    render(<PreviewPanel {...defaultProps} />);
    expect(mockCreateSession).toHaveBeenCalledWith({
      entryId: "entry123",
    });
  });

  it("close button calls onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    mockCreateSession.mockImplementation(() => new Promise(() => {}));
    render(<PreviewPanel {...defaultProps} onClose={onClose} />);

    const closeButton = screen.getByTitle("Close preview");
    await user.click(closeButton);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("error state shows error message and Retry button", async () => {
    mockCreateSession.mockRejectedValue(new Error("Network error"));
    render(<PreviewPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("exposes refresh and isActive via ref", async () => {
    mockCreateSession.mockResolvedValue({
      sessionId: "sess_1",
      sessionSecret: "secret_abc",
      previewUrl: "https://example.com/preview?session=sess_1",
    });

    const ref = createRef<PreviewPanelRef>();
    render(<PreviewPanel ref={ref} {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTitle("Content preview")).toBeInTheDocument();
    });

    expect(ref.current).not.toBeNull();
    expect(typeof ref.current?.refresh).toBe("function");
    expect(typeof ref.current?.isActive).toBe("boolean");
  });

  it("when session data is loaded, renders iframe with correct src and sandbox attributes", async () => {
    mockCreateSession.mockResolvedValue({
      sessionId: "sess_1",
      sessionSecret: "secret_abc",
      previewUrl: "https://example.com/preview?session=sess_1",
    });

    render(<PreviewPanel {...defaultProps} />);

    await waitFor(() => {
      const iframe = screen.getByTitle("Content preview");
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute(
        "src",
        "https://example.com/preview?session=sess_1",
      );
      expect(iframe).toHaveAttribute(
        "sandbox",
        "allow-scripts allow-same-origin allow-forms",
      );
    });
  });
});
