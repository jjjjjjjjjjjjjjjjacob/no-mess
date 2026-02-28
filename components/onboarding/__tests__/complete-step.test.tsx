vi.mock("@hugeicons/core-free-icons", () => ({
  CheckmarkCircle02Icon: "CheckmarkCircle02Icon",
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

import { render, screen } from "@testing-library/react";
import { CompleteStep } from "../steps/complete-step";

describe("CompleteStep", () => {
  const defaultProps = {
    siteName: "My Test Site",
    siteSlug: "my-test-site",
    contentTypeName: "Blog Post",
    entryTitle: "Hello World",
  };

  it('renders "You\'re all set!" heading', () => {
    render(<CompleteStep {...defaultProps} />);

    expect(screen.getByText("You're all set!")).toBeInTheDocument();
  });

  it("shows site name in the summary list", () => {
    render(<CompleteStep {...defaultProps} />);

    expect(screen.getByText("My Test Site")).toBeInTheDocument();
  });

  it("shows content type name in the summary list", () => {
    render(<CompleteStep {...defaultProps} />);

    expect(screen.getByText("Blog Post")).toBeInTheDocument();
  });

  it("shows entry title in the summary list", () => {
    render(<CompleteStep {...defaultProps} />);

    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });

  it('has "Go to Site Dashboard" link pointing to /sites/{siteSlug}', () => {
    render(<CompleteStep {...defaultProps} />);

    const dashboardLink = screen.getByText("Go to Site Dashboard").closest("a");
    expect(dashboardLink).toHaveAttribute("href", "/sites/my-test-site");
  });

  it('has "Read the Docs" link pointing to /docs', () => {
    render(<CompleteStep {...defaultProps} />);

    const docsLink = screen.getByText("Read the Docs").closest("a");
    expect(docsLink).toHaveAttribute("href", "/docs");
  });

  it("renders the checkmark icon", () => {
    render(<CompleteStep {...defaultProps} />);

    const icon = screen.getByTestId("hugeicon");
    expect(icon).toHaveAttribute("data-icon", "CheckmarkCircle02Icon");
  });

  it("displays the summary section prompt", () => {
    render(<CompleteStep {...defaultProps} />);

    expect(screen.getByText("Here's what you created:")).toBeInTheDocument();
  });
});
