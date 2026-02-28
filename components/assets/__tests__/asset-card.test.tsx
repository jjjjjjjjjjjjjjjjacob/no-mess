import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("lucide-react", () => ({
  FileText: (props: Record<string, unknown>) => (
    <svg data-testid="file-text-icon" {...props} />
  ),
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { AssetCard } from "../asset-card";

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const imageAsset = {
  _id: "asset-1",
  filename: "photo.png",
  mimeType: "image/png",
  size: 204800, // 200 KB
  url: "https://example.com/photo.png",
};

const pdfAsset = {
  _id: "asset-2",
  filename: "document.pdf",
  mimeType: "application/pdf",
  size: 5242880, // 5 MB
  url: "https://example.com/document.pdf",
};

const tinyAsset = {
  _id: "asset-3",
  filename: "small.txt",
  mimeType: "text/plain",
  size: 512, // 512 B
  url: "https://example.com/small.txt",
};

const kilobyteAsset = {
  _id: "asset-4",
  filename: "mid.json",
  mimeType: "application/json",
  size: 102400, // 100 KB
  url: "https://example.com/mid.json",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AssetCard", () => {
  describe("rendering", () => {
    it("renders the filename", () => {
      render(<AssetCard asset={imageAsset} />);
      expect(screen.getByText("photo.png")).toBeInTheDocument();
    });

    it("renders an <img> tag for image mimeTypes", () => {
      render(<AssetCard asset={imageAsset} />);
      const img = screen.getByAltText("photo.png");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "https://example.com/photo.png");
    });

    it("renders FileText icon for non-image mimeTypes", () => {
      render(<AssetCard asset={pdfAsset} />);
      expect(screen.getByTestId("file-text-icon")).toBeInTheDocument();
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });
  });

  describe("file size formatting", () => {
    it("displays bytes for sizes under 1 KB", () => {
      render(<AssetCard asset={tinyAsset} />);
      expect(screen.getByText("512 B")).toBeInTheDocument();
    });

    it("displays KB for sizes under 1 MB", () => {
      render(<AssetCard asset={kilobyteAsset} />);
      expect(screen.getByText("100.0 KB")).toBeInTheDocument();
    });

    it("displays KB with one decimal for image asset (200 KB)", () => {
      render(<AssetCard asset={imageAsset} />);
      expect(screen.getByText("200.0 KB")).toBeInTheDocument();
    });

    it("displays MB for sizes 1 MB and above", () => {
      render(<AssetCard asset={pdfAsset} />);
      expect(screen.getByText("5.0 MB")).toBeInTheDocument();
    });
  });

  describe("selection state", () => {
    it("does not apply ring class when isSelected is false", () => {
      const { container } = render(<AssetCard asset={imageAsset} />);
      const card = container.firstChild as HTMLElement;
      expect(card.className).not.toMatch(/ring-2/);
    });

    it("applies ring class when isSelected is true", () => {
      const { container } = render(
        <AssetCard asset={imageAsset} isSelected={true} />,
      );
      const card = container.firstChild as HTMLElement;
      expect(card.className).toMatch(/ring-2/);
    });
  });

  describe("click behavior", () => {
    it("calls onClick when clicked", async () => {
      const handleClick = vi.fn();
      render(<AssetCard asset={imageAsset} onClick={handleClick} />);

      const card = screen.getByRole("button");
      await userEvent.setup().click(card);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("calls onClick on Enter keypress", () => {
      const handleClick = vi.fn();
      render(<AssetCard asset={imageAsset} onClick={handleClick} />);

      const card = screen.getByRole("button");
      fireEvent.keyDown(card, { key: "Enter" });

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("does not call onClick on non-Enter keypress", () => {
      const handleClick = vi.fn();
      render(<AssetCard asset={imageAsset} onClick={handleClick} />);

      const card = screen.getByRole("button");
      fireEvent.keyDown(card, { key: "Space" });

      expect(handleClick).not.toHaveBeenCalled();
    });

    it("has role=button and tabIndex=0 when onClick is provided", () => {
      render(<AssetCard asset={imageAsset} onClick={() => {}} />);
      const card = screen.getByRole("button");
      expect(card).toHaveAttribute("tabindex", "0");
    });

    it("does not have role=button when onClick is not provided", () => {
      render(<AssetCard asset={imageAsset} />);
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("does not have tabIndex when onClick is not provided", () => {
      const { container } = render(<AssetCard asset={imageAsset} />);
      const card = container.firstChild as HTMLElement;
      expect(card).not.toHaveAttribute("tabindex");
    });
  });
});
