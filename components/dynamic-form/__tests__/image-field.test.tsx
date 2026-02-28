import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import type { Id } from "@/convex/_generated/dataModel";

// Must be before component import
const mockUseQuery = vi.fn();
vi.mock("convex/react", () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
}));

const mockUseFormContext = vi.fn();
vi.mock("../form-context", () => ({
  useFormContext: () => mockUseFormContext(),
}));

vi.mock("@/components/assets/asset-picker-dialog", () => ({
  AssetPickerDialog: ({
    open,
    onOpenChange,
    onSelect,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (assetId: string) => void;
  }) =>
    open ? (
      <div data-testid="asset-picker">
        <button
          type="button"
          onClick={() => onSelect("asset-picked" as Id<"assets">)}
        >
          Pick Asset
        </button>
        <button type="button" onClick={() => onOpenChange(false)}>
          Close Picker
        </button>
      </div>
    ) : null,
}));

import { ImageField } from "../fields/image-field";

describe("ImageField", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue(undefined);
    mockUseFormContext.mockReturnValue({ siteId: null });
  });

  it("shows error when no siteId in context", () => {
    mockUseFormContext.mockReturnValue({ siteId: null });
    render(<ImageField value="" onChange={() => {}} />);
    expect(
      screen.getByText("Image picker not available (missing site context)."),
    ).toBeInTheDocument();
  });

  it("shows 'Select Image' button when no value", () => {
    mockUseFormContext.mockReturnValue({
      siteId: "site123" as Id<"sites">,
    });
    render(<ImageField value="" onChange={() => {}} />);
    expect(
      screen.getByRole("button", { name: /select image/i }),
    ).toBeInTheDocument();
  });

  it("renders image preview when value and asset are loaded", () => {
    mockUseFormContext.mockReturnValue({
      siteId: "site123" as Id<"sites">,
    });
    mockUseQuery.mockReturnValue({
      url: "https://example.com/img.png",
      filename: "photo.png",
      mimeType: "image/png",
      size: 2048,
      width: 800,
      height: 600,
    });
    render(<ImageField value={"asset456" as string} onChange={() => {}} />);
    const img = screen.getByRole("img", { name: "photo.png" });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/img.png");
    expect(screen.getByText("photo.png")).toBeInTheDocument();
  });

  it("clear button resets value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    mockUseFormContext.mockReturnValue({
      siteId: "site123" as Id<"sites">,
    });
    mockUseQuery.mockReturnValue({
      url: "https://example.com/img.png",
      filename: "photo.png",
      mimeType: "image/png",
      size: 2048,
      width: null,
      height: null,
    });
    render(<ImageField value={"asset456" as string} onChange={onChange} />);
    // The clear button is the one with the X icon
    const buttons = screen.getAllByRole("button");
    // The last button in the asset preview row is the clear/X button
    const clearButton = buttons.find(
      (btn) => !btn.textContent?.includes("Select Image"),
    );
    expect(clearButton).toBeDefined();
    await user.click(clearButton as HTMLElement);
    expect(onChange).toHaveBeenCalledWith("");
  });
});
