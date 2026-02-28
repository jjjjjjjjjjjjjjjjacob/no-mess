const mockCreateSite = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => mockCreateSite),
}));

vi.mock("@/convex/_generated/api", () => ({
  api: {
    sites: { create: "sites.create" },
  },
}));

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CreateSiteStep } from "../steps/create-site-step";

describe("CreateSiteStep", () => {
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders name and slug inputs", () => {
    render(<CreateSiteStep onComplete={mockOnComplete} />);

    expect(screen.getByLabelText("Site Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Slug")).toBeInTheDocument();
  });

  it("auto-generates slug from name", async () => {
    render(<CreateSiteStep onComplete={mockOnComplete} />);

    fireEvent.change(screen.getByLabelText("Site Name"), {
      target: { value: "My Awesome Site" },
    });

    expect(screen.getByLabelText("Slug")).toHaveValue("my-awesome-site");
  });

  it("manual slug editing prevents auto-generation", async () => {
    render(<CreateSiteStep onComplete={mockOnComplete} />);

    // First type a name, auto-slug generated
    fireEvent.change(screen.getByLabelText("Site Name"), {
      target: { value: "First Name" },
    });
    expect(screen.getByLabelText("Slug")).toHaveValue("first-name");

    // Manually edit the slug
    fireEvent.change(screen.getByLabelText("Slug"), {
      target: { value: "custom-slug" },
    });
    expect(screen.getByLabelText("Slug")).toHaveValue("custom-slug");

    // Further name changes should NOT update slug
    fireEvent.change(screen.getByLabelText("Site Name"), {
      target: { value: "Second Name" },
    });
    expect(screen.getByLabelText("Slug")).toHaveValue("custom-slug");
  });

  it("does not submit when name is empty", async () => {
    render(<CreateSiteStep onComplete={mockOnComplete} />);

    const submitButton = screen.getByRole("button", { name: "Create Site" });
    expect(submitButton).toBeDisabled();
  });

  it("does not submit when slug is empty", async () => {
    render(<CreateSiteStep onComplete={mockOnComplete} />);

    fireEvent.change(screen.getByLabelText("Site Name"), {
      target: { value: "   " },
    });

    const submitButton = screen.getByRole("button", { name: "Create Site" });
    expect(submitButton).toBeDisabled();
  });

  it('submit button says "Create Site"', () => {
    render(<CreateSiteStep onComplete={mockOnComplete} />);

    expect(
      screen.getByRole("button", { name: "Create Site" }),
    ).toBeInTheDocument();
  });

  it("calls mutation on submit", async () => {
    mockCreateSite.mockResolvedValue("site_123");

    render(<CreateSiteStep onComplete={mockOnComplete} />);

    fireEvent.change(screen.getByLabelText("Site Name"), {
      target: { value: "My Site" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Site" }));

    await waitFor(() => {
      expect(mockCreateSite).toHaveBeenCalledWith({
        name: "My Site",
        slug: "my-site",
      });
    });
  });

  it("calls onComplete with site data on success", async () => {
    mockCreateSite.mockResolvedValue("site_123");

    render(<CreateSiteStep onComplete={mockOnComplete} />);

    fireEvent.change(screen.getByLabelText("Site Name"), {
      target: { value: "My Site" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Site" }));

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith({
        siteId: "site_123",
        slug: "my-site",
        name: "My Site",
      });
    });
  });

  it("shows error on mutation failure", async () => {
    mockCreateSite.mockRejectedValue(new Error("Slug already taken"));

    render(<CreateSiteStep onComplete={mockOnComplete} />);

    fireEvent.change(screen.getByLabelText("Site Name"), {
      target: { value: "My Site" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Site" }));

    await waitFor(() => {
      expect(screen.getByText("Slug already taken")).toBeInTheDocument();
    });

    expect(mockOnComplete).not.toHaveBeenCalled();
  });

  it("disables inputs while submitting", async () => {
    let resolveCreate: (value: string) => void = () => {};
    mockCreateSite.mockReturnValue(
      new Promise<string>((resolve) => {
        resolveCreate = resolve;
      }),
    );

    render(<CreateSiteStep onComplete={mockOnComplete} />);

    fireEvent.change(screen.getByLabelText("Site Name"), {
      target: { value: "My Site" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Site" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Site Name")).toBeDisabled();
      expect(screen.getByLabelText("Slug")).toBeDisabled();
    });

    // Resolve to allow cleanup
    resolveCreate?.("site_123");
    await waitFor(() => {
      expect(screen.getByLabelText("Site Name")).not.toBeDisabled();
    });
  });
});
