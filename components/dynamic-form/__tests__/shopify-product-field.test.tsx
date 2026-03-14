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

import { ShopifyProductField } from "../fields/shopify-product-field";

const mockProducts = [
  {
    _id: "prod1" as Id<"shopifyProducts">,
    handle: "blue-shirt",
    title: "Blue Shirt",
    featuredImage: "https://example.com/blue.png",
  },
  {
    _id: "prod2" as Id<"shopifyProducts">,
    handle: "red-hat",
    title: "Red Hat",
    featuredImage: null,
  },
];

describe("ShopifyProductField", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue(undefined);
    mockUseFormContext.mockReturnValue({ siteId: null });
  });

  it("shows error when no siteId in context", () => {
    mockUseFormContext.mockReturnValue({ siteId: null });
    render(<ShopifyProductField value="" onChange={() => {}} />);
    expect(
      screen.getByText(
        "Shopify product picker not available (missing site context).",
      ),
    ).toBeInTheDocument();
  });

  it("shows search input when no value", () => {
    mockUseFormContext.mockReturnValue({
      siteId: "site123" as Id<"sites">,
    });
    mockUseQuery.mockReturnValue(mockProducts);
    render(<ShopifyProductField value="" onChange={() => {}} />);
    expect(
      screen.getByPlaceholderText("Search products..."),
    ).toBeInTheDocument();
  });

  it("renders selected product when value matches", () => {
    mockUseFormContext.mockReturnValue({
      siteId: "site123" as Id<"sites">,
    });
    mockUseQuery.mockReturnValue(mockProducts);
    render(<ShopifyProductField value="blue-shirt" onChange={() => {}} />);
    expect(screen.getByText("Blue Shirt")).toBeInTheDocument();
    expect(screen.getByText("blue-shirt")).toBeInTheDocument();
    const img = screen.getByRole("img", { name: "Blue Shirt" });
    expect(img).toHaveAttribute("src", "https://example.com/blue.png");
  });

  it("clear button resets value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    mockUseFormContext.mockReturnValue({
      siteId: "site123" as Id<"sites">,
    });
    mockUseQuery.mockReturnValue(mockProducts);
    render(<ShopifyProductField value="blue-shirt" onChange={onChange} />);
    // Find the clear/X button in the selected product view
    const buttons = screen.getAllByRole("button");
    const clearButton = buttons[buttons.length - 1];
    await user.click(clearButton);
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("selects a product from the dropdown", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    mockUseFormContext.mockReturnValue({
      siteId: "site123" as Id<"sites">,
    });
    mockUseQuery.mockReturnValue(mockProducts);

    render(<ShopifyProductField value="" onChange={onChange} />);

    await user.click(screen.getByPlaceholderText("Search products..."));
    await user.click(screen.getByRole("button", { name: /blue shirt/i }));

    expect(onChange).toHaveBeenCalledWith("blue-shirt");
    expect(screen.queryByText("red-hat")).not.toBeInTheDocument();
  });

  it("closes the dropdown when clicking outside", async () => {
    const user = userEvent.setup();
    mockUseFormContext.mockReturnValue({
      siteId: "site123" as Id<"sites">,
    });
    mockUseQuery.mockReturnValue(mockProducts);

    render(
      <div>
        <ShopifyProductField value="" onChange={() => {}} />
        <button type="button">Outside</button>
      </div>,
    );

    await user.click(screen.getByPlaceholderText("Search products..."));
    expect(screen.getByText("Blue Shirt")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Outside" }));

    expect(screen.queryByText("Blue Shirt")).not.toBeInTheDocument();
  });
});
