vi.mock("convex/react", () => ({
  useQuery: vi.fn().mockReturnValue(undefined),
}));

vi.mock("@/convex/_generated/api", () => ({
  api: {
    contentTypes: {
      checkSlugAvailability: "contentTypes:checkSlugAvailability",
    },
  },
}));

vi.mock("@/hooks/use-debounced-value", () => ({
  useDebouncedValue: (value: unknown) => value,
}));

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContentTypeForm } from "../content-type-form";

vi.mock("lucide-react", () => ({
  GripVertical: (props: Record<string, unknown>) => (
    <span data-testid="grip-icon" {...props} />
  ),
  Plus: (props: Record<string, unknown>) => (
    <span data-testid="plus-icon" {...props} />
  ),
  Trash2: (props: Record<string, unknown>) => (
    <span data-testid="trash-icon" {...props} />
  ),
  Copy: (props: Record<string, unknown>) => (
    <span data-testid="copy-icon" {...props} />
  ),
}));

vi.mock("@hugeicons/core-free-icons", () => ({
  ArrowDown01Icon: "ArrowDown01Icon",
  ArrowUp01Icon: "ArrowUp01Icon",
  Tick02Icon: "Tick02Icon",
  UnfoldMoreIcon: "UnfoldMoreIcon",
}));

vi.mock("@hugeicons/react", () => ({
  HugeiconsIcon: (props: Record<string, unknown>) => (
    <span data-testid="hugeicon" {...props} />
  ),
}));

const FIELD_TYPE_LABELS = [
  "Text",
  "Textarea",
  "Number",
  "Boolean",
  "Date/Time",
  "URL",
  "Image",
  "Gallery",
  "Select",
  "Shopify Product",
  "Shopify Collection",
  "Object Group",
  "Repeater",
  "Fragment Reference",
];

describe("ContentTypeForm", () => {
  const defaultProps = {
    onSubmit: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders name, slug, and description inputs", () => {
    render(<ContentTypeForm {...defaultProps} />);
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Slug")).toBeInTheDocument();
    expect(screen.getByLabelText("Description (optional)")).toBeInTheDocument();
  });

  it('auto-generates slug from name (type "Blog Post" -> "blog-post")', async () => {
    const user = userEvent.setup();
    render(<ContentTypeForm {...defaultProps} />);

    const nameInput = screen.getByLabelText("Name");
    await user.type(nameInput, "Blog Post");

    const slugInput = screen.getByLabelText("Slug");
    expect(slugInput).toHaveValue("blog-post");
  });

  it("manual slug edit prevents auto-generation", async () => {
    const user = userEvent.setup();
    render(<ContentTypeForm {...defaultProps} />);

    const slugInput = screen.getByLabelText("Slug");
    await user.type(slugInput, "custom-slug");

    const nameInput = screen.getByLabelText("Name");
    await user.type(nameInput, "Blog Post");

    expect(slugInput).toHaveValue("custom-slug");
  });

  it("slug input is editable when isEditing is true", () => {
    render(
      <ContentTypeForm
        {...defaultProps}
        isEditing
        initialData={{
          kind: "template",
          name: "Blog",
          slug: "blog",
          fields: [{ name: "title", type: "text", required: false }],
        }}
      />,
    );
    expect(screen.getByLabelText("Slug")).not.toBeDisabled();
    expect(screen.getByLabelText("Slug")).toHaveValue("blog");
  });

  it("Add Field button adds a new field row", async () => {
    const user = userEvent.setup();
    render(<ContentTypeForm {...defaultProps} />);

    // Starts with 1 default field row
    const initialFieldNames = screen.getAllByPlaceholderText("title");
    expect(initialFieldNames).toHaveLength(1);

    await user.click(screen.getByText("Add Field"));

    const updatedFieldNames = screen.getAllByPlaceholderText("title");
    expect(updatedFieldNames).toHaveLength(2);
  });

  it("remove field button removes a field row", async () => {
    const user = userEvent.setup();
    render(<ContentTypeForm {...defaultProps} />);

    // Start with 1 default field
    expect(screen.getAllByPlaceholderText("title")).toHaveLength(1);

    // Click the trash icon button to remove the field
    const trashButtons = screen.getAllByTestId("trash-icon");
    const removeButton = trashButtons[0].closest("button") as HTMLElement;
    expect(removeButton).toBeTruthy();
    await user.click(removeButton);

    expect(screen.queryByPlaceholderText("title")).not.toBeInTheDocument();
  });

  it('submit button text says "Create Schema" in create mode', () => {
    render(<ContentTypeForm {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: "Create Schema" }),
    ).toBeInTheDocument();
  });

  it('submit button text says "Save Changes" in edit mode', () => {
    render(
      <ContentTypeForm
        {...defaultProps}
        isEditing
        initialData={{
          kind: "template",
          name: "Blog",
          slug: "blog",
          fields: [{ name: "title", type: "text", required: false }],
        }}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Save Changes" }),
    ).toBeInTheDocument();
  });

  it("submit button is disabled when name is empty", () => {
    render(<ContentTypeForm {...defaultProps} />);
    // Name is empty by default, slug is also empty -> disabled
    const submitButton = screen.getByRole("button", { name: "Create Schema" });
    expect(submitButton).toBeDisabled();
  });

  it("submit button is disabled when slug is empty", async () => {
    const user = userEvent.setup();
    render(<ContentTypeForm {...defaultProps} />);

    // Type a name so name is filled, but slug auto-generates, so clear it
    const nameInput = screen.getByLabelText("Name");
    await user.type(nameInput, "Test");

    const slugInput = screen.getByLabelText("Slug");
    await user.clear(slugInput);

    const submitButton = screen.getByRole("button", { name: "Create Schema" });
    expect(submitButton).toBeDisabled();
  });

  it("submit button is disabled when no fields exist", async () => {
    const user = userEvent.setup();
    render(<ContentTypeForm {...defaultProps} />);

    // Fill name (slug auto-generates)
    await user.type(screen.getByLabelText("Name"), "Test");

    // Remove the default field
    const trashButtons = screen.getAllByTestId("trash-icon");
    const removeButton = trashButtons[0].closest("button") as HTMLElement;
    await user.click(removeButton);

    const submitButton = screen.getByRole("button", { name: "Create Schema" });
    expect(submitButton).toBeDisabled();
  });

  it("shows error when submission fails", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error("Server error"));
    render(<ContentTypeForm onSubmit={onSubmit} />);

    // Fill in valid form data
    await user.type(screen.getByLabelText("Name"), "Blog");
    // Fill in field name
    const fieldNameInput = screen.getByPlaceholderText("title");
    await user.type(fieldNameInput, "title");

    await user.click(screen.getByRole("button", { name: "Create Schema" }));

    await screen.findByText("Server error");
  });

  it("calls onSubmit with correct data structure", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ContentTypeForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Name"), "Blog Post");
    await user.type(
      screen.getByLabelText("Description (optional)"),
      "A blog post type",
    );

    // Fill in field name
    const fieldNameInput = screen.getByPlaceholderText("title");
    await user.type(fieldNameInput, "title");

    await user.click(screen.getByRole("button", { name: "Create Schema" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledOnce();
    });

    const submittedData = onSubmit.mock.calls[0][0];
    expect(submittedData.name).toBe("Blog Post");
    expect(submittedData.slug).toBe("blog-post");
    expect(submittedData.kind).toBe("template");
    expect(submittedData.mode).toBe("collection");
    expect(submittedData.description).toBe("A blog post type");
    expect(submittedData.fields).toHaveLength(1);
    expect(submittedData.fields[0]).toEqual(
      expect.objectContaining({
        name: "title",
        type: "text",
        required: false,
      }),
    );
    // _key should be stripped
    expect(submittedData.fields[0]._key).toBeUndefined();
  });

  it("renders initial data when provided", () => {
    render(
      <ContentTypeForm
        {...defaultProps}
        initialData={{
          kind: "template",
          name: "Article",
          slug: "article",
          description: "An article type",
          fields: [
            { name: "headline", type: "text", required: true },
            { name: "body", type: "textarea", required: false },
          ],
        }}
      />,
    );

    expect(screen.getByLabelText("Name")).toHaveValue("Article");
    expect(screen.getByLabelText("Slug")).toHaveValue("article");
    expect(screen.getByLabelText("Description (optional)")).toHaveValue(
      "An article type",
    );

    const fieldNameInputs = screen.getAllByPlaceholderText("title");
    expect(fieldNameInputs).toHaveLength(2);
    expect(fieldNameInputs[0]).toHaveValue("headline");
    expect(fieldNameInputs[1]).toHaveValue("body");
  });

  it("all field type options are available in the select dropdown", async () => {
    const user = userEvent.setup();
    render(<ContentTypeForm {...defaultProps} />);

    const typeSelect = screen.getAllByRole("combobox")[2];

    // Open the select dropdown
    await user.click(typeSelect);

    // Check all field type options are present (async — Base UI renders via portal)
    const options = await screen.findAllByRole("option");
    const optionLabels = options.map((o) => o.textContent);

    for (const label of FIELD_TYPE_LABELS) {
      expect(optionLabels).toContain(label);
    }
  });
});
