const mockCreateContentType = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => mockCreateContentType),
}));

vi.mock("@/convex/_generated/api", () => ({
  api: {
    contentTypes: { create: "contentTypes.create" },
  },
}));

let capturedOnSubmit: ((data: unknown) => Promise<void>) | null = null;

vi.mock("@/components/content-types/content-type-form", () => ({
  ContentTypeForm: ({
    onSubmit,
  }: {
    onSubmit: (data: unknown) => Promise<void>;
  }) => {
    capturedOnSubmit = onSubmit;
    return <div data-testid="content-type-form" />;
  },
}));

import { render, screen, waitFor } from "@testing-library/react";
import type { Id } from "@/convex/_generated/dataModel";
import { CreateSchemaStep } from "../steps/create-schema-step";

describe("CreateSchemaStep", () => {
  const mockOnComplete = vi.fn();
  const fakeSiteId = "site_123" as Id<"sites">;

  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnSubmit = null;
  });

  it("renders ContentTypeForm component", () => {
    render(
      <CreateSchemaStep siteId={fakeSiteId} onComplete={mockOnComplete} />,
    );

    expect(screen.getByTestId("content-type-form")).toBeInTheDocument();
  });

  it("calls mutation on form submit", async () => {
    mockCreateContentType.mockResolvedValue("ct_456");

    render(
      <CreateSchemaStep siteId={fakeSiteId} onComplete={mockOnComplete} />,
    );

    expect(capturedOnSubmit).not.toBeNull();

    await capturedOnSubmit?.({
      name: "Blog Post",
      slug: "blog-post",
      description: "A blog post",
      fields: [{ name: "body", type: "textarea", required: true }],
    });

    expect(mockCreateContentType).toHaveBeenCalledWith({
      siteId: fakeSiteId,
      name: "Blog Post",
      slug: "blog-post",
      description: "A blog post",
      fields: [{ name: "body", type: "textarea", required: true }],
    });
  });

  it("calls onComplete with content type data on success", async () => {
    mockCreateContentType.mockResolvedValue("ct_456");

    render(
      <CreateSchemaStep siteId={fakeSiteId} onComplete={mockOnComplete} />,
    );

    await capturedOnSubmit?.({
      name: "Blog Post",
      slug: "blog-post",
      description: "A blog post",
      fields: [{ name: "body", type: "textarea", required: true }],
    });

    expect(mockOnComplete).toHaveBeenCalledWith({
      contentTypeId: "ct_456",
      slug: "blog-post",
      name: "Blog Post",
    });
  });

  it("shows error on mutation failure", async () => {
    mockCreateContentType.mockRejectedValue(
      new Error("Content type already exists"),
    );

    render(
      <CreateSchemaStep siteId={fakeSiteId} onComplete={mockOnComplete} />,
    );

    // The handleSubmit re-throws, so we need to catch
    await expect(
      capturedOnSubmit?.({
        name: "Blog Post",
        slug: "blog-post",
        fields: [{ name: "body", type: "textarea", required: true }],
      }),
    ).rejects.toThrow("Content type already exists");

    await waitFor(() => {
      expect(
        screen.getByText("Content type already exists"),
      ).toBeInTheDocument();
    });

    expect(mockOnComplete).not.toHaveBeenCalled();
  });
});
