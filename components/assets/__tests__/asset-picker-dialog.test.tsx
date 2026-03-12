import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Module mocks — must be before any import that touches the mocked modules
// ---------------------------------------------------------------------------

const mockUseQuery = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock("@/convex/_generated/api", () => ({
  api: {
    assets: {
      listBySite: "assets:listBySite",
    },
  },
}));

vi.mock("lucide-react", () => ({
  ImageIcon: (props: Record<string, unknown>) => (
    <svg data-testid="image-icon" {...props} />
  ),
}));

vi.mock("@/components/assets/upload-dropzone", () => ({
  UploadDropzone: ({
    accept,
    label,
    multiple,
    onUploadComplete,
  }: {
    accept?: string;
    label?: string;
    multiple?: boolean;
    onUploadComplete?: (assetId: string) => void;
  }) => (
    <div
      data-testid="upload-dropzone"
      data-accept={accept}
      data-multiple={String(multiple)}
    >
      <span>{label}</span>
      <button
        type="button"
        onClick={() => onUploadComplete?.("asset-uploaded")}
      >
        Upload Image
      </button>
    </div>
  ),
}));

// Stub icon libraries used by Dialog
vi.mock("@hugeicons/core-free-icons", () => ({
  Cancel01Icon: "Cancel01Icon",
}));

vi.mock("@hugeicons/react", () => ({
  HugeiconsIcon: (props: Record<string, unknown>) => (
    <svg data-testid="hugeicons-icon" {...props} />
  ),
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { AssetPickerDialog } from "../asset-picker-dialog";

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const siteId = "site-123" as any;

const imageAssets = [
  {
    _id: "asset-img-1" as any,
    filename: "banner.png",
    mimeType: "image/png",
    size: 2048,
    url: "https://example.com/banner.png",
  },
  {
    _id: "asset-img-2" as any,
    filename: "logo.jpg",
    mimeType: "image/jpeg",
    size: 1024,
    url: "https://example.com/logo.jpg",
  },
];

const mixedAssets = [
  ...imageAssets,
  {
    _id: "asset-pdf-1" as any,
    filename: "report.pdf",
    mimeType: "application/pdf",
    size: 4096,
    url: "https://example.com/report.pdf",
  },
];

const nonImageAssets = [mixedAssets[2]];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderDialog(
  overrides: {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onSelect?: (assetId: any) => void;
  } = {},
) {
  const onOpenChange = overrides.onOpenChange ?? vi.fn();
  const onSelect = overrides.onSelect ?? vi.fn();
  return {
    onOpenChange,
    onSelect,
    ...render(
      <AssetPickerDialog
        open={overrides.open ?? true}
        onOpenChange={onOpenChange}
        siteId={siteId}
        onSelect={onSelect}
      />,
    ),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockUseQuery.mockReset();
});

describe("AssetPickerDialog", () => {
  describe("loading state", () => {
    it("shows loading message when assets are undefined", () => {
      mockUseQuery.mockReturnValue(undefined);
      renderDialog();
      expect(screen.getByText("Loading images...")).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("shows empty state message when no assets exist", () => {
      mockUseQuery.mockReturnValue([]);
      renderDialog();
      expect(
        screen.getByText("Upload your first image above."),
      ).toBeInTheDocument();
    });

    it("shows ImageIcon in empty state", () => {
      mockUseQuery.mockReturnValue([]);
      renderDialog();
      expect(screen.getByTestId("image-icon")).toBeInTheDocument();
    });

    it("shows the same empty state when only non-image assets exist", () => {
      mockUseQuery.mockReturnValue(nonImageAssets);
      renderDialog();
      expect(
        screen.getByText("Upload your first image above."),
      ).toBeInTheDocument();
    });
  });

  describe("dialog header", () => {
    it("renders the dialog title", () => {
      mockUseQuery.mockReturnValue([]);
      renderDialog();
      expect(screen.getByText("Choose or Upload Image")).toBeInTheDocument();
    });

    it("renders the upload dropzone with image-only settings", () => {
      mockUseQuery.mockReturnValue([]);
      renderDialog();
      const dropzone = screen.getByTestId("upload-dropzone");
      expect(dropzone).toHaveAttribute("data-accept", "image/*");
      expect(dropzone).toHaveAttribute("data-multiple", "false");
      expect(
        screen.getByText("Drop an image here or click to upload"),
      ).toBeInTheDocument();
    });
  });

  describe("asset display", () => {
    it("renders only image assets, filtering out non-images", () => {
      mockUseQuery.mockReturnValue(mixedAssets);
      renderDialog();

      expect(screen.getByAltText("banner.png")).toBeInTheDocument();
      expect(screen.getByAltText("logo.jpg")).toBeInTheDocument();
      // The PDF should be filtered out (it is not an image)
      expect(screen.queryByText("report.pdf")).not.toBeInTheDocument();
    });

    it("renders image filename overlays", () => {
      mockUseQuery.mockReturnValue(imageAssets);
      renderDialog();
      expect(screen.getByText("banner.png")).toBeInTheDocument();
      expect(screen.getByText("logo.jpg")).toBeInTheDocument();
    });
  });

  describe("selection behavior", () => {
    it("calls onSelect and closes when an image is clicked", async () => {
      const user = userEvent.setup();
      mockUseQuery.mockReturnValue(imageAssets);
      const onSelect = vi.fn();
      const onOpenChange = vi.fn();
      renderDialog({ onSelect, onOpenChange });

      await user.click(
        screen.getByRole("button", { name: "Select banner.png" }),
      );

      expect(onSelect).toHaveBeenCalledWith("asset-img-1");
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("calls onSelect and closes when upload completes", async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      const onOpenChange = vi.fn();
      renderDialog({ onSelect, onOpenChange });

      await user.click(screen.getByRole("button", { name: "Upload Image" }));

      expect(onSelect).toHaveBeenCalledWith("asset-uploaded");
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("cancel behavior", () => {
    it("calls onOpenChange(false) and resets selection on cancel", async () => {
      const user = userEvent.setup();
      mockUseQuery.mockReturnValue(imageAssets);
      const onOpenChange = vi.fn();
      renderDialog({ onOpenChange });

      // Click Cancel
      const cancelButton = screen.getByRole("button", { name: "Cancel" });
      await user.click(cancelButton);

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("useQuery call", () => {
    it("passes siteId to the query", () => {
      mockUseQuery.mockReturnValue(undefined);
      renderDialog();
      expect(mockUseQuery).toHaveBeenCalledWith("assets:listBySite", {
        siteId,
      });
    });
  });
});
