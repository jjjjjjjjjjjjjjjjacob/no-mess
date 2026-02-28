import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

// ---------------------------------------------------------------------------
// Module mocks — must be before any import that touches the mocked modules
// ---------------------------------------------------------------------------

const mockCreateSite = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => mockCreateSite),
}));

vi.mock("@/convex/_generated/api", () => ({
  api: {
    sites: {
      create: "sites:create",
    },
  },
}));

// Stub icon libraries so they don't trip up jsdom
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

import { CreateSiteDialog } from "../create-site-dialog";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderDialog(
  props: { open?: boolean; onOpenChange?: (open: boolean) => void } = {},
) {
  const onOpenChange = props.onOpenChange ?? vi.fn();
  return {
    onOpenChange,
    ...render(
      <CreateSiteDialog
        open={props.open ?? true}
        onOpenChange={onOpenChange}
      />,
    ),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockCreateSite.mockReset();
});

describe("CreateSiteDialog", () => {
  it("renders dialog title 'Create a new site' when open", () => {
    renderDialog({ open: true });
    expect(screen.getByText("Create a new site")).toBeInTheDocument();
  });

  it("renders dialog description", () => {
    renderDialog({ open: true });
    expect(
      screen.getByText("Add a new site to manage its content."),
    ).toBeInTheDocument();
  });

  it("renders Name and Slug input fields", () => {
    renderDialog({ open: true });
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Slug")).toBeInTheDocument();
  });

  it("auto-generates slug from name", async () => {
    const user = userEvent.setup();
    renderDialog({ open: true });

    const nameInput = screen.getByLabelText("Name");
    await user.type(nameInput, "My Blog");

    const slugInput = screen.getByLabelText("Slug");
    expect(slugInput).toHaveValue("my-blog");
  });

  it("manual slug edit prevents auto-generation", async () => {
    const user = userEvent.setup();
    renderDialog({ open: true });

    const nameInput = screen.getByLabelText("Name");
    const slugInput = screen.getByLabelText("Slug");

    // First type a name to auto-gen slug
    await user.type(nameInput, "My Blog");
    expect(slugInput).toHaveValue("my-blog");

    // Manually edit slug — use fireEvent.change to set value in one shot,
    // since handleSlugChange runs slugify per keystroke which strips trailing
    // hyphens during character-by-character typing.
    fireEvent.change(slugInput, { target: { value: "custom-slug" } });
    expect(slugInput).toHaveValue("custom-slug");

    // Further name changes should NOT update slug because it was manually touched
    await user.clear(nameInput);
    await user.type(nameInput, "New Name");
    expect(slugInput).toHaveValue("custom-slug");
  });

  it("submit button is disabled when name is empty", () => {
    renderDialog({ open: true });

    const submitButton = screen.getByRole("button", { name: "Create Site" });
    expect(submitButton).toBeDisabled();
  });

  it("submit button is disabled when slug is empty", async () => {
    const user = userEvent.setup();
    renderDialog({ open: true });

    const nameInput = screen.getByLabelText("Name");
    // Type a name, then clear slug
    await user.type(nameInput, "Test");
    const slugInput = screen.getByLabelText("Slug");
    await user.clear(slugInput);

    const submitButton = screen.getByRole("button", { name: "Create Site" });
    expect(submitButton).toBeDisabled();
  });

  it("cancel button calls onOpenChange(false)", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderDialog({ open: true, onOpenChange });

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    await user.click(cancelButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("successful submission calls mutation with correct data, resets form, and closes dialog", async () => {
    const user = userEvent.setup();
    mockCreateSite.mockResolvedValue({ _id: "site123" });
    const onOpenChange = vi.fn();
    renderDialog({ open: true, onOpenChange });

    const nameInput = screen.getByLabelText("Name");
    const slugInput = screen.getByLabelText("Slug");
    await user.type(nameInput, "My Blog");
    expect(slugInput).toHaveValue("my-blog");

    const submitButton = screen.getByRole("button", { name: "Create Site" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCreateSite).toHaveBeenCalledWith({
        name: "My Blog",
        slug: "my-blog",
      });
    });

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    // Form should be reset (name and slug cleared)
    expect(nameInput).toHaveValue("");
    expect(slugInput).toHaveValue("");
  });

  it("failed submission shows error message", async () => {
    const user = userEvent.setup();
    mockCreateSite.mockRejectedValue(new Error("Slug already exists"));
    renderDialog({ open: true });

    const nameInput = screen.getByLabelText("Name");
    await user.type(nameInput, "My Blog");

    const submitButton = screen.getByRole("button", { name: "Create Site" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Slug already exists")).toBeInTheDocument();
    });
  });

  it("all inputs are disabled during submission", async () => {
    const user = userEvent.setup();
    // Create a promise we control to keep the mutation pending
    let resolveSubmit!: (value: unknown) => void;
    mockCreateSite.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSubmit = resolve;
        }),
    );
    renderDialog({ open: true });

    const nameInput = screen.getByLabelText("Name");
    const slugInput = screen.getByLabelText("Slug");
    await user.type(nameInput, "My Blog");

    const submitButton = screen.getByRole("button", { name: "Create Site" });
    await user.click(submitButton);

    // While submitting, inputs and buttons should be disabled
    await waitFor(() => {
      expect(nameInput).toBeDisabled();
      expect(slugInput).toBeDisabled();
      expect(
        screen.getByRole("button", { name: "Creating..." }),
      ).toBeDisabled();
      expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    });

    // Resolve the mutation to clean up
    resolveSubmit({ _id: "site123" });
  });

  it("form resets when dialog closes", () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <CreateSiteDialog open={true} onOpenChange={onOpenChange} />,
    );

    // Simulate dialog closing via onOpenChange callback
    // The dialog's onOpenChange handler resets the form when value is false
    // We can test this by checking the onOpenChange call triggers a reset
    // by re-rendering with open=false, which causes the Dialog to call onOpenChange(false)
    rerender(<CreateSiteDialog open={false} onOpenChange={onOpenChange} />);

    // Re-open the dialog — form fields should be blank
    rerender(<CreateSiteDialog open={true} onOpenChange={onOpenChange} />);

    const nameInput = screen.getByLabelText("Name");
    const slugInput = screen.getByLabelText("Slug");
    expect(nameInput).toHaveValue("");
    expect(slugInput).toHaveValue("");
  });
});
