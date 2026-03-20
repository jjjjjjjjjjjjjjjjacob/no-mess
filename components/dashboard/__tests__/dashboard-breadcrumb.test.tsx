import { render, screen } from "@testing-library/react";
import { useQuery } from "convex/react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { vi } from "vitest";
import { DashboardBreadcrumb } from "../dashboard-breadcrumb";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...props
  }: {
    children?: ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
}));

vi.mock("@/components/dashboard/site-selector-breadcrumb", () => ({
  SiteSelectorBreadcrumb: ({
    currentSiteName,
  }: {
    currentSiteName: string;
  }) => <span>{currentSiteName}</span>,
}));

vi.mock("@/convex/_generated/api", () => ({
  api: {
    sites: {
      getBySlug: "sites:getBySlug",
    },
  },
}));

const mockUsePathname = vi.mocked(usePathname);
const mockUseQuery = vi.mocked(useQuery);

describe("DashboardBreadcrumb", () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    mockUsePathname.mockReset();
    mockUseQuery.mockReturnValue({ name: "mershy" });
  });

  it("collapses breadcrumb items for content routes", () => {
    mockUsePathname.mockReturnValue(
      "/sites/mershy/content/about-page/about-page",
    );

    render(<DashboardBreadcrumb />);

    expect(screen.getByText("mershy")).toBeInTheDocument();
    expect(screen.queryByText("Content")).not.toBeInTheDocument();
    expect(screen.queryByText("about-page")).not.toBeInTheDocument();
  });

  it("keeps breadcrumb items for non-content routes", () => {
    mockUsePathname.mockReturnValue("/sites/mershy/schemas/about-page");

    render(<DashboardBreadcrumb />);

    expect(screen.getByText("mershy")).toBeInTheDocument();
    expect(screen.getByText("Schemas")).toBeInTheDocument();
    expect(screen.getByText("about-page")).toBeInTheDocument();
  });
});
