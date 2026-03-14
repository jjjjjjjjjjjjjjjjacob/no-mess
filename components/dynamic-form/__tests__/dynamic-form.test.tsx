import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import type { Id } from "@/convex/_generated/dataModel";

// Mock all field components
vi.mock("../fields/text-field", () => ({
  TextField: ({ value, onChange, disabled }: any) => (
    <div data-testid="text-field" data-disabled={disabled}>
      <span>{value}</span>
      <button type="button" onClick={() => onChange("new-text")}>
        change-text
      </button>
    </div>
  ),
}));

vi.mock("../fields/textarea-field", () => ({
  TextareaField: ({ value, disabled }: any) => (
    <div data-testid="textarea-field" data-disabled={disabled}>
      {value}
    </div>
  ),
}));

vi.mock("../fields/number-field", () => ({
  NumberField: ({ value, disabled }: any) => (
    <div data-testid="number-field" data-disabled={disabled}>
      {value}
    </div>
  ),
}));

vi.mock("../fields/boolean-field", () => ({
  BooleanField: ({ value, disabled }: any) => (
    <div data-testid="boolean-field" data-disabled={disabled}>
      {String(value)}
    </div>
  ),
}));

vi.mock("../fields/datetime-field", () => ({
  DatetimeField: ({ value, disabled }: any) => (
    <div data-testid="datetime-field" data-disabled={disabled}>
      {value}
    </div>
  ),
}));

vi.mock("../fields/url-field", () => ({
  UrlField: ({ value, disabled }: any) => (
    <div data-testid="url-field" data-disabled={disabled}>
      {value}
    </div>
  ),
}));

vi.mock("../fields/select-field", () => ({
  SelectField: ({ value, disabled }: any) => (
    <div data-testid="select-field" data-disabled={disabled}>
      {value}
    </div>
  ),
}));

vi.mock("../fields/image-field", () => ({
  ImageField: ({ value, disabled }: any) => (
    <div data-testid="image-field" data-disabled={disabled}>
      {value}
    </div>
  ),
}));

vi.mock("../fields/gallery-field", () => ({
  GalleryField: ({ value, disabled }: any) => (
    <div data-testid="gallery-field" data-disabled={disabled}>
      {JSON.stringify(value)}
    </div>
  ),
}));

vi.mock("../fields/shopify-product-field", () => ({
  ShopifyProductField: ({ value, disabled }: any) => (
    <div data-testid="shopify-product-field" data-disabled={disabled}>
      {value}
    </div>
  ),
}));

// Mock FormProvider to track whether it wraps content
vi.mock("../form-context", () => ({
  FormProvider: ({ siteId, children }: any) => (
    <div data-testid="form-provider" data-site-id={siteId}>
      {children}
    </div>
  ),
}));

// Mock FieldWrapper to pass through
vi.mock("../field-wrapper", () => ({
  FieldWrapper: ({ label, children }: any) => (
    <div data-testid={`field-wrapper-${label}`}>{children}</div>
  ),
}));

import { DynamicForm } from "../dynamic-form";

describe("DynamicForm", () => {
  const defaultOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders TextField for type 'text'", () => {
    render(
      <DynamicForm
        fields={[{ name: "title", type: "text", required: false }]}
        values={{ title: "hello" }}
        onChange={defaultOnChange}
      />,
    );
    expect(screen.getByTestId("text-field")).toBeInTheDocument();
  });

  it("renders TextareaField for type 'textarea'", () => {
    render(
      <DynamicForm
        fields={[{ name: "body", type: "textarea", required: false }]}
        values={{ body: "content" }}
        onChange={defaultOnChange}
      />,
    );
    expect(screen.getByTestId("textarea-field")).toBeInTheDocument();
  });

  it("renders NumberField for type 'number'", () => {
    render(
      <DynamicForm
        fields={[{ name: "count", type: "number", required: false }]}
        values={{ count: 5 }}
        onChange={defaultOnChange}
      />,
    );
    expect(screen.getByTestId("number-field")).toBeInTheDocument();
  });

  it("renders BooleanField for type 'boolean'", () => {
    render(
      <DynamicForm
        fields={[{ name: "active", type: "boolean", required: false }]}
        values={{ active: true }}
        onChange={defaultOnChange}
      />,
    );
    expect(screen.getByTestId("boolean-field")).toBeInTheDocument();
  });

  it("renders DatetimeField for type 'datetime'", () => {
    render(
      <DynamicForm
        fields={[{ name: "publishedAt", type: "datetime", required: false }]}
        values={{ publishedAt: "2025-01-01T00:00" }}
        onChange={defaultOnChange}
      />,
    );
    expect(screen.getByTestId("datetime-field")).toBeInTheDocument();
  });

  it("renders UrlField for type 'url'", () => {
    render(
      <DynamicForm
        fields={[{ name: "website", type: "url", required: false }]}
        values={{ website: "https://example.com" }}
        onChange={defaultOnChange}
      />,
    );
    expect(screen.getByTestId("url-field")).toBeInTheDocument();
  });

  it("renders SelectField for type 'select'", () => {
    render(
      <DynamicForm
        fields={[
          {
            name: "status",
            type: "select",
            required: false,
            options: {
              choices: [
                { label: "Draft", value: "draft" },
                { label: "Published", value: "published" },
              ],
            },
          },
        ]}
        values={{ status: "draft" }}
        onChange={defaultOnChange}
      />,
    );
    expect(screen.getByTestId("select-field")).toBeInTheDocument();
  });

  it("renders ImageField for type 'image'", () => {
    render(
      <DynamicForm
        fields={[{ name: "cover", type: "image", required: false }]}
        values={{ cover: "" }}
        onChange={defaultOnChange}
      />,
    );
    expect(screen.getByTestId("image-field")).toBeInTheDocument();
  });

  it("renders GalleryField for type 'gallery'", () => {
    render(
      <DynamicForm
        fields={[{ name: "gallery", type: "gallery", required: false }]}
        values={{ gallery: ["asset-1", "asset-2"] }}
        onChange={defaultOnChange}
      />,
    );
    expect(screen.getByTestId("gallery-field")).toBeInTheDocument();
  });

  it("renders ShopifyProductField for type 'shopifyProduct'", () => {
    render(
      <DynamicForm
        fields={[{ name: "product", type: "shopifyProduct", required: false }]}
        values={{ product: "" }}
        onChange={defaultOnChange}
      />,
    );
    expect(screen.getByTestId("shopify-product-field")).toBeInTheDocument();
  });

  it("renders nested array items inline", () => {
    render(
      <DynamicForm
        fields={[
          {
            name: "groups",
            type: "array",
            required: false,
            of: {
              type: "array",
              required: false,
              of: { type: "text", required: false },
            },
          },
        ]}
        values={{ groups: [["hello"]] }}
        onChange={defaultOnChange}
      />,
    );
    expect(screen.getByTestId("text-field")).toBeInTheDocument();
    expect(screen.getAllByText("Add Item")).toHaveLength(2);
  });

  it("initializes fragment array items as objects", async () => {
    const user = userEvent.setup();

    render(
      <DynamicForm
        fields={[
          {
            name: "slides",
            type: "array",
            required: false,
            of: {
              type: "fragment",
              required: false,
              fragment: "image-with-alt",
            },
          },
        ]}
        values={{ slides: [] }}
        onChange={defaultOnChange}
        fragments={[
          {
            kind: "fragment",
            slug: "image-with-alt",
            name: "Image With Alt",
            fields: [
              { name: "image", type: "image", required: false },
              { name: "alt", type: "text", required: false },
            ],
          },
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: /add item/i }));

    expect(defaultOnChange).toHaveBeenCalledWith({
      slides: [{ image: "", alt: "" }],
    });
  });

  it("passes disabled prop to fields", () => {
    render(
      <DynamicForm
        fields={[{ name: "title", type: "text", required: false }]}
        values={{ title: "test" }}
        onChange={defaultOnChange}
        disabled
      />,
    );
    expect(screen.getByTestId("text-field")).toHaveAttribute(
      "data-disabled",
      "true",
    );
  });

  it("calls onChange with updated values when a field changes", () => {
    render(
      <DynamicForm
        fields={[{ name: "title", type: "text", required: false }]}
        values={{ title: "old" }}
        onChange={defaultOnChange}
      />,
    );
    screen.getByText("change-text").click();
    expect(defaultOnChange).toHaveBeenCalledWith({ title: "new-text" });
  });

  it("wraps in FormProvider when siteId is provided", () => {
    const fakeSiteId = "site123" as Id<"sites">;
    render(
      <DynamicForm
        fields={[{ name: "title", type: "text", required: false }]}
        values={{ title: "test" }}
        onChange={defaultOnChange}
        siteId={fakeSiteId}
      />,
    );
    const provider = screen.getByTestId("form-provider");
    expect(provider).toBeInTheDocument();
    expect(provider).toHaveAttribute("data-site-id", "site123");
  });

  it("does not wrap in FormProvider when siteId is not provided", () => {
    render(
      <DynamicForm
        fields={[{ name: "title", type: "text", required: false }]}
        values={{ title: "test" }}
        onChange={defaultOnChange}
      />,
    );
    expect(screen.queryByTestId("form-provider")).not.toBeInTheDocument();
  });

  it("renders nothing when fields array is empty", () => {
    const { container } = render(
      <DynamicForm fields={[]} values={{}} onChange={defaultOnChange} />,
    );
    // The outer div should exist but have no field children
    expect(screen.queryByTestId("text-field")).not.toBeInTheDocument();
    expect(screen.queryByTestId("number-field")).not.toBeInTheDocument();
    expect(screen.queryByTestId("boolean-field")).not.toBeInTheDocument();
    expect(container.querySelector(".space-y-4")?.children.length).toBe(0);
  });
});
