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
      expect(screen.getByText("Loading assets...")).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("shows empty state message when no assets exist", () => {
      mockUseQuery.mockReturnValue([]);
      renderDialog();
      expect(
        screen.getByText(
          "No assets uploaded yet. Upload images in the Assets section first.",
        ),
      ).toBeInTheDocument();
    });

    it("shows ImageIcon in empty state", () => {
      mockUseQuery.mockReturnValue([]);
      renderDialog();
      expect(screen.getByTestId("image-icon")).toBeInTheDocument();
    });
  });

  describe("dialog header", () => {
    it("renders the dialog title", () => {
      mockUseQuery.mockReturnValue([]);
      renderDialog();
      expect(screen.getByText("Select an Image")).toBeInTheDocument();
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
    it("Select button is disabled when no asset is selected", () => {
      mockUseQuery.mockReturnValue(imageAssets);
      renderDialog();
      const selectButton = screen.getByRole("button", { name: "Select" });
      expect(selectButton).toBeDisabled();
    });

    it("highlights the clicked asset and enables Select button", async () => {
      const user = userEvent.setup();
      mockUseQuery.mockReturnValue(imageAssets);
      renderDialog();

      // Click the first image asset button
      const assetButtons = screen
        .getAllByRole("button")
        .filter(
          (btn) =>
            btn.textContent === "banner.png" ||
            btn.querySelector("img[alt='banner.png']"),
        );
      await user.click(assetButtons[0]);

      // Select button should now be enabled
      const selectButton = screen.getByRole("button", { name: "Select" });
      expect(selectButton).not.toBeDisabled();
    });

    it("calls onSelect with the selected asset id on confirm", async () => {
      const user = userEvent.setup();
      mockUseQuery.mockReturnValue(imageAssets);
      const onSelect = vi.fn();
      const onOpenChange = vi.fn();
      renderDialog({ onSelect, onOpenChange });

      // Click the first image asset
      const assetButtons = screen
        .getAllByRole("button")
        .filter((btn) => btn.querySelector("img[alt='banner.png']"));
      await user.click(assetButtons[0]);

      // Click Select
      const selectButton = screen.getByRole("button", { name: "Select" });
      await user.click(selectButton);

      expect(onSelect).toHaveBeenCalledWith("asset-img-1");
    });

    it("allows changing selection before confirming", async () => {
      const user = userEvent.setup();
      mockUseQuery.mockReturnValue(imageAssets);
      const onSelect = vi.fn();
      renderDialog({ onSelect });

      // Click the first image
      const firstBtn = screen
        .getAllByRole("button")
        .filter((btn) => btn.querySelector("img[alt='banner.png']"));
      await user.click(firstBtn[0]);

      // Click the second image
      const secondBtn = screen
        .getAllByRole("button")
        .filter((btn) => btn.querySelector("img[alt='logo.jpg']"));
      await user.click(secondBtn[0]);

      // Confirm
      const selectButton = screen.getByRole("button", { name: "Select" });
      await user.click(selectButton);

      expect(onSelect).toHaveBeenCalledWith("asset-img-2");
    });
  });

  describe("cancel behavior", () => {
    it("calls onOpenChange(false) and resets selection on cancel", async () => {
      const user = userEvent.setup();
      mockUseQuery.mockReturnValue(imageAssets);
      const onOpenChange = vi.fn();
      renderDialog({ onOpenChange });

      // Select an asset first
      const assetButtons = screen
        .getAllByRole("button")
        .filter((btn) => btn.querySelector("img[alt='banner.png']"));
      await user.click(assetButtons[0]);

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
