import { render, screen } from "@testing-library/react";
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

import { AssetGrid } from "../asset-grid";

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const assets = [
  {
    _id: "asset-1",
    filename: "photo1.png",
    mimeType: "image/png",
    size: 1024,
    url: "https://example.com/photo1.png",
    uploadedAt: 1700000000000,
  },
  {
    _id: "asset-2",
    filename: "document.pdf",
    mimeType: "application/pdf",
    size: 2048,
    url: "https://example.com/document.pdf",
    uploadedAt: 1700000001000,
  },
  {
    _id: "asset-3",
    filename: "photo2.jpg",
    mimeType: "image/jpeg",
    size: 4096,
    width: 800,
    height: 600,
    url: "https://example.com/photo2.jpg",
    uploadedAt: 1700000002000,
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AssetGrid", () => {
  describe("rendering", () => {
    it("renders all assets", () => {
      render(<AssetGrid assets={assets} />);
      expect(screen.getByText("photo1.png")).toBeInTheDocument();
      expect(screen.getByText("document.pdf")).toBeInTheDocument();
      expect(screen.getByText("photo2.jpg")).toBeInTheDocument();
    });

    it("renders an image tag for image assets", () => {
      render(<AssetGrid assets={assets} />);
      expect(screen.getByAltText("photo1.png")).toBeInTheDocument();
      expect(screen.getByAltText("photo2.jpg")).toBeInTheDocument();
    });

    it("renders file icon for non-image assets", () => {
      render(<AssetGrid assets={assets} />);
      expect(screen.getByTestId("file-text-icon")).toBeInTheDocument();
    });

    it("renders empty grid when no assets are provided", () => {
      const { container } = render(<AssetGrid assets={[]} />);
      const grid = container.firstChild as HTMLElement;
      expect(grid.children).toHaveLength(0);
    });
  });

  describe("selection", () => {
    it("marks the correct asset as selected", () => {
      const { container } = render(
        <AssetGrid assets={assets} selectedId="asset-2" onSelect={vi.fn()} />,
      );
      // The second card should have the ring-2 class (selected)
      const cards = container.querySelectorAll("[class*='flex flex-col']");
      // asset-2 is the second card (index 1)
      expect(cards[1]?.className).toMatch(/ring-2/);
      // Others should not
      expect(cards[0]?.className).not.toMatch(/ring-2/);
      expect(cards[2]?.className).not.toMatch(/ring-2/);
    });

    it("does not mark any asset as selected when selectedId is not provided", () => {
      const { container } = render(
        <AssetGrid assets={assets} onSelect={vi.fn()} />,
      );
      const cards = container.querySelectorAll("[class*='flex flex-col']");
      for (const card of cards) {
        expect(card.className).not.toMatch(/ring-2/);
      }
    });
  });

  describe("onSelect callback", () => {
    it("calls onSelect with the asset _id when an asset is clicked", async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(<AssetGrid assets={assets} onSelect={onSelect} />);

      const buttons = screen.getAllByRole("button");
      await user.click(buttons[0]);

      expect(onSelect).toHaveBeenCalledWith("asset-1");
    });

    it("calls onSelect with the correct id for each asset", async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(<AssetGrid assets={assets} onSelect={onSelect} />);

      const buttons = screen.getAllByRole("button");
      await user.click(buttons[2]);

      expect(onSelect).toHaveBeenCalledWith("asset-3");
    });

    it("does not render buttons when onSelect is not provided", () => {
      render(<AssetGrid assets={assets} />);
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
  });
});
