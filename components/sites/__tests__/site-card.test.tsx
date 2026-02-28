import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

// ---------------------------------------------------------------------------
// Module mocks — must be before any import that touches the mocked modules
// ---------------------------------------------------------------------------

vi.mock("next/link", () => ({
  __esModule: true,
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

vi.mock("lucide-react", () => ({
  Globe: (props: Record<string, unknown>) => (
    <svg data-testid="globe-icon" {...props} />
  ),
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import type { Doc } from "@/convex/_generated/dataModel";
import { SiteCard } from "../site-card";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createSiteDoc(overrides: Partial<Doc<"sites">> = {}): Doc<"sites"> {
  return {
    _id: "site_123" as Doc<"sites">["_id"],
    _creationTime: Date.now(),
    name: "Test Site",
    slug: "test-site",
    ownerId: "user_123" as Doc<"sites">["ownerId"],
    ...overrides,
  } as Doc<"sites">;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SiteCard", () => {
  it("renders site name", () => {
    const site = createSiteDoc({ name: "My Portfolio" });
    render(<SiteCard site={site} />);

    expect(screen.getByText("My Portfolio")).toBeInTheDocument();
  });

  it("renders site slug with leading slash", () => {
    const site = createSiteDoc({ slug: "my-site" });
    render(<SiteCard site={site} />);

    expect(screen.getByText("/my-site")).toBeInTheDocument();
  });

  it("links to /sites/{slug}", () => {
    const site = createSiteDoc({ slug: "my-site" });
    render(<SiteCard site={site} />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/sites/my-site");
  });

  it("renders Globe icon", () => {
    const site = createSiteDoc();
    render(<SiteCard site={site} />);

    expect(screen.getByTestId("globe-icon")).toBeInTheDocument();
  });

  it("card has hover transition class", () => {
    const site = createSiteDoc();
    render(<SiteCard site={site} />);

    const card = document.querySelector('[data-slot="card"]');
    expect(card).toHaveClass("transition-colors");
  });
});
