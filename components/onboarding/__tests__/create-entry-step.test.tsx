const mockCreateEntry = vi.fn();
const mockUseQuery = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => mockCreateEntry),
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock("@/convex/_generated/api", () => ({
  api: {
    contentTypes: { get: "contentTypes.get" },
    contentEntries: { create: "contentEntries.create" },
  },
}));

vi.mock("@/components/dynamic-form/dynamic-form", () => ({
  DynamicForm: (_props: Record<string, unknown>) => (
    <div data-testid="dynamic-form" />
  ),
}));

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Id } from "@/convex/_generated/dataModel";
import { CreateEntryStep } from "../steps/create-entry-step";

describe("CreateEntryStep", () => {
  const mockOnComplete = vi.fn();
  const fakeSiteId = "site_123" as Id<"sites">;
  const fakeContentTypeId = "ct_456" as Id<"contentTypes">;

  const fakeContentType = {
    _id: fakeContentTypeId,
    name: "Blog Post",
    slug: "blog-post",
    fields: [
      { name: "body", type: "textarea", required: true },
      { name: "author", type: "text", required: false },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue(undefined);
  });

  it("shows loading skeleton when content type is undefined", () => {
    mockUseQuery.mockReturnValue(undefined);

    const { container } = render(
      <CreateEntryStep
        siteId={fakeSiteId}
        contentTypeId={fakeContentTypeId}
        onComplete={mockOnComplete}
      />,
    );

    // Skeleton components are rendered (no title input visible)
    expect(screen.queryByLabelText("Title")).not.toBeInTheDocument();
    // The component renders Skeleton divs
    const skeletons = container.querySelectorAll("[class*='animate-pulse']");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders title input when content type is loaded", () => {
    mockUseQuery.mockReturnValue(fakeContentType);

    render(
      <CreateEntryStep
        siteId={fakeSiteId}
        contentTypeId={fakeContentTypeId}
        onComplete={mockOnComplete}
      />,
    );

    expect(screen.getByLabelText("Title")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("My First Post")).toBeInTheDocument();
  });

  it("renders DynamicForm when content type has fields", () => {
    mockUseQuery.mockReturnValue(fakeContentType);

    render(
      <CreateEntryStep
        siteId={fakeSiteId}
        contentTypeId={fakeContentTypeId}
        onComplete={mockOnComplete}
      />,
    );

    expect(screen.getByTestId("dynamic-form")).toBeInTheDocument();
  });

  it("does not render DynamicForm when content type has no fields", () => {
    mockUseQuery.mockReturnValue({ ...fakeContentType, fields: [] });

    render(
      <CreateEntryStep
        siteId={fakeSiteId}
        contentTypeId={fakeContentTypeId}
        onComplete={mockOnComplete}
      />,
    );

    expect(screen.queryByTestId("dynamic-form")).not.toBeInTheDocument();
  });

  it("calls mutation on submit", async () => {
    mockUseQuery.mockReturnValue(fakeContentType);
    mockCreateEntry.mockResolvedValue("entry_789");

    render(
      <CreateEntryStep
        siteId={fakeSiteId}
        contentTypeId={fakeContentTypeId}
        onComplete={mockOnComplete}
      />,
    );

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "My First Post" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Entry" }));

    await waitFor(() => {
      expect(mockCreateEntry).toHaveBeenCalledWith({
        contentTypeId: fakeContentTypeId,
        title: "My First Post",
        draft: {},
      });
    });
  });

  it("calls onComplete with title on success", async () => {
    mockUseQuery.mockReturnValue(fakeContentType);
    mockCreateEntry.mockResolvedValue("entry_789");

    render(
      <CreateEntryStep
        siteId={fakeSiteId}
        contentTypeId={fakeContentTypeId}
        onComplete={mockOnComplete}
      />,
    );

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "My First Post" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Entry" }));

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith({
        title: "My First Post",
      });
    });
  });

  it("shows error on failure", async () => {
    mockUseQuery.mockReturnValue(fakeContentType);
    mockCreateEntry.mockRejectedValue(new Error("Failed to create entry"));

    render(
      <CreateEntryStep
        siteId={fakeSiteId}
        contentTypeId={fakeContentTypeId}
        onComplete={mockOnComplete}
      />,
    );

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "My First Post" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Entry" }));

    await waitFor(() => {
      expect(screen.getByText("Failed to create entry")).toBeInTheDocument();
    });

    expect(mockOnComplete).not.toHaveBeenCalled();
  });

  it("submit button is disabled when title is empty", () => {
    mockUseQuery.mockReturnValue(fakeContentType);

    render(
      <CreateEntryStep
        siteId={fakeSiteId}
        contentTypeId={fakeContentTypeId}
        onComplete={mockOnComplete}
      />,
    );

    const submitButton = screen.getByRole("button", { name: "Create Entry" });
    expect(submitButton).toBeDisabled();
  });

  it("submit button is enabled when title has value", () => {
    mockUseQuery.mockReturnValue(fakeContentType);

    render(
      <CreateEntryStep
        siteId={fakeSiteId}
        contentTypeId={fakeContentTypeId}
        onComplete={mockOnComplete}
      />,
    );

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "A Post" },
    });

    const submitButton = screen.getByRole("button", { name: "Create Entry" });
    expect(submitButton).not.toBeDisabled();
  });
});
