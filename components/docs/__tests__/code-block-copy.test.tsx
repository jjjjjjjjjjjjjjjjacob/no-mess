import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CodeBlockCopy } from "../code-block-copy";

// Mock the Hugeicons libraries
vi.mock("@hugeicons/core-free-icons", () => ({
  CheckmarkCircle02Icon: "checkmark-icon-stub",
  Copy01Icon: "copy-icon-stub",
}));

vi.mock("@hugeicons/react", () => ({
  HugeiconsIcon: ({
    icon,
    ...props
  }: {
    icon: string;
    className?: string;
    strokeWidth?: number;
  }) => <span data-testid="hugeicon" data-icon={icon} {...props} />,
}));

// Mock clipboard API
const mockWriteText = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  Object.assign(navigator, {
    clipboard: {
      writeText: mockWriteText,
    },
  });
  mockWriteText.mockClear();
});

describe("CodeBlockCopy", () => {
  it("renders a button", () => {
    render(<CodeBlockCopy code="const x = 1;" />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("renders the copy icon initially", () => {
    render(<CodeBlockCopy code="const x = 1;" />);
    const icon = screen.getByTestId("hugeicon");
    expect(icon).toHaveAttribute("data-icon", "copy-icon-stub");
  });

  it("copies code to clipboard when clicked", async () => {
    render(<CodeBlockCopy code="const x = 1;" />);
    const button = screen.getByRole("button");
    fireEvent.click(button);
    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith("const x = 1;");
    });
  });

  it("shows checkmark icon after copying", async () => {
    render(<CodeBlockCopy code="hello world" />);
    const button = screen.getByRole("button");
    fireEvent.click(button);
    await waitFor(() => {
      const icon = screen.getByTestId("hugeicon");
      expect(icon).toHaveAttribute("data-icon", "checkmark-icon-stub");
    });
  });

  it("handles clipboard errors gracefully", async () => {
    mockWriteText.mockRejectedValueOnce(new Error("Clipboard unavailable"));
    render(<CodeBlockCopy code="some code" />);
    const button = screen.getByRole("button");
    fireEvent.click(button);
    // Should not throw; icon should remain copy
    await waitFor(() => {
      const icon = screen.getByTestId("hugeicon");
      expect(icon).toHaveAttribute("data-icon", "copy-icon-stub");
    });
  });
});
