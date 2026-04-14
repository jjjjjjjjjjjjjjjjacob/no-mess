import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import type { Id } from "@/convex/_generated/dataModel";

vi.mock("@/components/dynamic-form/render-field", () => ({
  renderField: (field: any, value: unknown) => (
    <div data-testid={`render-field-${field.type}`}>
      {JSON.stringify(value)}
    </div>
  ),
}));

vi.mock("@/components/dynamic-form/form-context", () => ({
  FormProvider: ({ children }: any) => (
    <div data-testid="form-provider">{children}</div>
  ),
}));

vi.mock("@/components/dynamic-form/field-wrapper", () => ({
  FieldWrapper: ({ label, children }: any) => (
    <div data-testid={`field-wrapper-${label}`}>{children}</div>
  ),
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: any) => (
    <div data-testid="scroll-area">{children}</div>
  ),
}));

import { LiveEditFieldPanel } from "../live-edit-field-panel";

describe("LiveEditFieldPanel", () => {
  const defaultProps = {
    mappedFieldNames: [],
    title: "Landing Page",
    values: {},
    siteId: "site123" as Id<"sites">,
    focusedField: null,
    onTitleChange: vi.fn(),
    onFieldChange: vi.fn(),
    onFieldFocus: vi.fn(),
    onFieldBlur: vi.fn(),
  };

  const fragments = [
    {
      kind: "fragment" as const,
      slug: "image-with-alt",
      name: "Image With Alt",
      fields: [
        { name: "image", type: "image" as const, required: false },
        { name: "alt", type: "text" as const, required: false },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds shaped fragment items from the footer", async () => {
    const user = userEvent.setup();
    const onFieldChange = vi.fn();

    render(
      <LiveEditFieldPanel
        {...defaultProps}
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
        fragments={fragments}
        onFieldChange={onFieldChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add Item" }));

    expect(onFieldChange).toHaveBeenCalledWith("slides", [
      { image: "", alt: "" },
    ]);
  });

  it("duplicates the previous fragment item from the footer", async () => {
    const user = userEvent.setup();
    const onFieldChange = vi.fn();

    render(
      <LiveEditFieldPanel
        {...defaultProps}
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
        values={{
          slides: [
            { image: "asset-1", alt: "Intro" },
            { image: "asset-2", alt: "Outro" },
          ],
        }}
        fragments={fragments}
        onFieldChange={onFieldChange}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Duplicate Previous" }),
    );

    expect(onFieldChange).toHaveBeenCalledWith("slides", [
      { image: "asset-1", alt: "Intro" },
      { image: "asset-2", alt: "Outro" },
      { image: "asset-2", alt: "Outro" },
    ]);
  });

  it("disables duplicate previous when the fragment array is empty", () => {
    render(
      <LiveEditFieldPanel
        {...defaultProps}
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
        fragments={fragments}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Duplicate Previous" }),
    ).toBeDisabled();
  });

  it("disables both footer actions when the panel is disabled", () => {
    render(
      <LiveEditFieldPanel
        {...defaultProps}
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
        values={{ slides: [{ image: "asset-1", alt: "Intro" }] }}
        fragments={fragments}
        disabled
      />,
    );

    expect(screen.getByRole("button", { name: "Add Item" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Duplicate Previous" }),
    ).toBeDisabled();
  });
});
