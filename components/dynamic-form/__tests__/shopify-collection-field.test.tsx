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

import { ShopifyCollectionField } from "../fields/shopify-collection-field";

const mockCollections = [
  {
    _id: "col1" as Id<"shopifyCollections">,
    handle: "products",
    title: "Products",
    image: "https://example.com/products.png",
  },
  {
    _id: "col2" as Id<"shopifyCollections">,
    handle: "sale",
    title: "Sale",
    image: null,
  },
];

describe("ShopifyCollectionField", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue(undefined);
    mockUseFormContext.mockReturnValue({ siteId: null });
  });

  it("shows error when no siteId in context", () => {
    render(<ShopifyCollectionField value="" onChange={() => {}} />);

    expect(
      screen.getByText(
        "Shopify collection picker not available (missing site context).",
      ),
    ).toBeInTheDocument();
  });

  it("shows search input when no value", () => {
    mockUseFormContext.mockReturnValue({
      siteId: "site123" as Id<"sites">,
    });
    mockUseQuery.mockReturnValue(mockCollections);

    render(<ShopifyCollectionField value="" onChange={() => {}} />);

    expect(
      screen.getByPlaceholderText("Search collections..."),
    ).toBeInTheDocument();
  });

  it("renders selected collection when value matches", () => {
    mockUseFormContext.mockReturnValue({
      siteId: "site123" as Id<"sites">,
    });
    mockUseQuery.mockReturnValue(mockCollections);

    render(<ShopifyCollectionField value="products" onChange={() => {}} />);

    expect(screen.getByText("Products")).toBeInTheDocument();
    expect(screen.getByText("products")).toBeInTheDocument();
    const img = screen.getByRole("img", { name: "Products" });
    expect(img).toHaveAttribute("src", "https://example.com/products.png");
  });

  it("clear button resets value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    mockUseFormContext.mockReturnValue({
      siteId: "site123" as Id<"sites">,
    });
    mockUseQuery.mockReturnValue(mockCollections);

    render(<ShopifyCollectionField value="products" onChange={onChange} />);

    const buttons = screen.getAllByRole("button");
    const clearButton = buttons[buttons.length - 1];
    await user.click(clearButton);

    expect(onChange).toHaveBeenCalledWith("");
  });

  it("selects a collection from the dropdown", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    mockUseFormContext.mockReturnValue({
      siteId: "site123" as Id<"sites">,
    });
    mockUseQuery.mockReturnValue(mockCollections);

    render(<ShopifyCollectionField value="" onChange={onChange} />);

    await user.click(screen.getByPlaceholderText("Search collections..."));
    await user.click(screen.getByRole("button", { name: /products/i }));

    expect(onChange).toHaveBeenCalledWith("products");
    expect(screen.queryByText("Sale")).not.toBeInTheDocument();
  });

  it("closes the dropdown when clicking outside", async () => {
    const user = userEvent.setup();
    mockUseFormContext.mockReturnValue({
      siteId: "site123" as Id<"sites">,
    });
    mockUseQuery.mockReturnValue(mockCollections);

    render(
      <div>
        <ShopifyCollectionField value="" onChange={() => {}} />
        <button type="button">Outside</button>
      </div>,
    );

    await user.click(screen.getByPlaceholderText("Search collections..."));
    expect(screen.getByText("Products")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Outside" }));

    expect(screen.queryByText("Products")).not.toBeInTheDocument();
  });
});
