import { vi } from "vitest";

const mockCreateSite = vi.fn();
const mockCreateContentType = vi.fn();
const mockCreateEntry = vi.fn();
const mockUseQuery = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: vi.fn((fnRef: unknown) => {
    if (fnRef === "sites.create") return mockCreateSite;
    if (fnRef === "contentTypes.create") return mockCreateContentType;
    if (fnRef === "contentEntries.create") return mockCreateEntry;
    return vi.fn();
  }),
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock("@/convex/_generated/api", () => ({
  api: {
    sites: { create: "sites.create" },
    contentTypes: { create: "contentTypes.create", get: "contentTypes.get" },
    contentEntries: { create: "contentEntries.create" },
  },
}));

vi.mock("@hugeicons/core-free-icons", () => ({
  ArrowDown01Icon: "ArrowDown01Icon",
  ArrowUp01Icon: "ArrowUp01Icon",
  CheckmarkCircle02Icon: "CheckmarkCircle02Icon",
  Tick02Icon: "Tick02Icon",
  UnfoldMoreIcon: "UnfoldMoreIcon",
}));

vi.mock("@hugeicons/react", () => ({
  HugeiconsIcon: ({ icon, ...props }: Record<string, unknown>) => (
    <span data-testid="hugeicon" data-icon={String(icon)} {...props} />
  ),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children?: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/dynamic-form/dynamic-form", () => ({
  DynamicForm: () => <div data-testid="dynamic-form" />,
}));

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

vi.mock("../onboarding-step-indicator", () => ({
  OnboardingStepIndicator: ({ currentStep }: { currentStep: string }) => (
    <div data-testid="step-indicator" data-step={currentStep} />
  ),
}));

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { OnboardingWizard } from "../onboarding-wizard";

describe("OnboardingWizard", () => {
  const mockOnComplete = vi.fn();
  const mockOnDismiss = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue(undefined);
  });

  it("starts at the create-site step", () => {
    render(
      <OnboardingWizard
        onComplete={mockOnComplete}
        onDismiss={mockOnDismiss}
      />,
    );

    expect(screen.getByText("Create your first site")).toBeInTheDocument();
    expect(
      screen.getByText(
        "A site represents a project or client. Each site gets its own API key and content.",
      ),
    ).toBeInTheDocument();
  });

  it("renders the site name input on the first step", () => {
    render(
      <OnboardingWizard
        onComplete={mockOnComplete}
        onDismiss={mockOnDismiss}
      />,
    );

    expect(screen.getByLabelText("Site Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Slug")).toBeInTheDocument();
  });

  it("renders the Skip setup button on non-complete steps", () => {
    render(
      <OnboardingWizard
        onComplete={mockOnComplete}
        onDismiss={mockOnDismiss}
      />,
    );

    const skipButton = screen.getByText("Skip setup");
    expect(skipButton).toBeInTheDocument();
  });

  it("calls onDismiss when Skip setup is clicked", () => {
    render(
      <OnboardingWizard
        onComplete={mockOnComplete}
        onDismiss={mockOnDismiss}
      />,
    );

    fireEvent.click(screen.getByText("Skip setup"));
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it("transitions from create-site to create-schema step after site creation", async () => {
    mockCreateSite.mockResolvedValue("site_123");

    render(
      <OnboardingWizard
        onComplete={mockOnComplete}
        onDismiss={mockOnDismiss}
      />,
    );

    // Fill in the site name
    fireEvent.change(screen.getByLabelText("Site Name"), {
      target: { value: "My Test Site" },
    });

    // Submit the form
    fireEvent.click(screen.getByRole("button", { name: "Create Site" }));

    await waitFor(() => {
      expect(screen.getByText("Define a content type")).toBeInTheDocument();
    });
  });

  it("auto-generates slug from site name", () => {
    render(
      <OnboardingWizard
        onComplete={mockOnComplete}
        onDismiss={mockOnDismiss}
      />,
    );

    fireEvent.change(screen.getByLabelText("Site Name"), {
      target: { value: "My Test Site" },
    });

    expect(screen.getByLabelText("Slug")).toHaveValue("my-test-site");
  });

  it("persists site data across step transitions", async () => {
    mockCreateSite.mockResolvedValue("site_123");

    render(
      <OnboardingWizard
        onComplete={mockOnComplete}
        onDismiss={mockOnDismiss}
      />,
    );

    // Fill in site step
    fireEvent.change(screen.getByLabelText("Site Name"), {
      target: { value: "My Test Site" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Site" }));

    await waitFor(() => {
      expect(screen.getByText("Define a content type")).toBeInTheDocument();
    });

    // createSite should have been called with the correct data
    expect(mockCreateSite).toHaveBeenCalledWith({
      name: "My Test Site",
      slug: "my-test-site",
    });
  });

  it("does not call onComplete on intermediate steps", async () => {
    mockCreateSite.mockResolvedValue("site_123");

    render(
      <OnboardingWizard
        onComplete={mockOnComplete}
        onDismiss={mockOnDismiss}
      />,
    );

    fireEvent.change(screen.getByLabelText("Site Name"), {
      target: { value: "My Test Site" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Site" }));

    await waitFor(() => {
      expect(screen.getByText("Define a content type")).toBeInTheDocument();
    });

    expect(mockOnComplete).not.toHaveBeenCalled();
  });
});
