import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import type { Id } from "@/convex/_generated/dataModel";

const mockUseQuery = vi.fn();
vi.mock("convex/react", () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
}));

const mockUseFormContext = vi.fn();
vi.mock("../form-context", () => ({
  useFormContext: () => mockUseFormContext(),
}));

vi.mock("@/convex/_generated/api", () => ({
  api: {
    assets: {
      listBySite: "assets:listBySite",
    },
  },
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
        <button type="button" onClick={() => onSelect("asset-new")}>
          Pick Asset
        </button>
        <button type="button" onClick={() => onOpenChange(false)}>
          Close Picker
        </button>
      </div>
    ) : null,
}));

import { GalleryField } from "../fields/gallery-field";

const mockAssets = [
  {
    _id: "asset-1",
    filename: "first.png",
    mimeType: "image/png",
    size: 1024,
    url: "https://example.com/first.png",
    uploadedAt: 1000,
  },
  {
    _id: "asset-2",
    filename: "second.mp4",
    mimeType: "video/mp4",
    size: 2048,
    url: "https://example.com/second.mp4",
    uploadedAt: 2000,
  },
];

describe("GalleryField", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue(mockAssets);
    mockUseFormContext.mockReturnValue({ siteId: "site123" as Id<"sites"> });
  });

  it("shows error when no siteId in context", () => {
    mockUseFormContext.mockReturnValue({ siteId: null });
    render(<GalleryField value={[]} onChange={() => {}} />);
    expect(
      screen.getByText("Gallery picker not available (missing site context)."),
    ).toBeInTheDocument();
  });

  it("shows the empty state and add button", () => {
    render(<GalleryField value={[]} onChange={() => {}} />);
    expect(
      screen.getByText("No gallery items selected yet."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /add media/i }),
    ).toBeInTheDocument();
  });

  it("opens the picker and appends an asset", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<GalleryField value={["asset-1"]} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /add media/i }));
    await user.click(screen.getByRole("button", { name: /pick asset/i }));

    expect(onChange).toHaveBeenCalledWith(["asset-1", "asset-new"]);
  });

  it("removes an asset from the gallery", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<GalleryField value={["asset-1", "asset-2"]} onChange={onChange} />);
    await user.click(
      screen.getByRole("button", { name: /remove second\.mp4 from gallery/i }),
    );

    expect(onChange).toHaveBeenCalledWith(["asset-1"]);
  });

  it("reorders assets", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<GalleryField value={["asset-1", "asset-2"]} onChange={onChange} />);
    await user.click(
      screen.getByRole("button", { name: /move second\.mp4 up/i }),
    );

    expect(onChange).toHaveBeenCalledWith(["asset-2", "asset-1"]);
  });
});
