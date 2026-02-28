import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

// ---------------------------------------------------------------------------
// Module mocks — must be before any import that touches the mocked modules
// ---------------------------------------------------------------------------

vi.mock("next/navigation", () => ({
  usePathname: vi.fn().mockReturnValue("/dashboard"),
}));

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

vi.mock("convex/react", () => ({
  useQuery: vi.fn().mockReturnValue(undefined),
}));

vi.mock("@clerk/nextjs", () => ({
  UserButton: () => <div data-testid="user-button" />,
}));

vi.mock("@/convex/_generated/api", () => ({
  api: {
    sites: {
      listForCurrentUser: "sites:listForCurrentUser",
    },
  },
}));

// Stub icon libraries so they don't trip up jsdom
vi.mock("lucide-react", () => ({
  Globe: (props: Record<string, unknown>) => (
    <svg data-testid="globe-icon" {...props} />
  ),
  Files: (props: Record<string, unknown>) => <svg {...props} />,
  FileText: (props: Record<string, unknown>) => <svg {...props} />,
  Image: (props: Record<string, unknown>) => <svg {...props} />,
  Settings: (props: Record<string, unknown>) => <svg {...props} />,
  Store: (props: Record<string, unknown>) => <svg {...props} />,
  Monitor: (props: Record<string, unknown>) => <svg {...props} />,
  Moon: (props: Record<string, unknown>) => <svg {...props} />,
  Sun: (props: Record<string, unknown>) => <svg {...props} />,
  BookOpen: (props: Record<string, unknown>) => <svg {...props} />,
  MousePointerClick: (props: Record<string, unknown>) => <svg {...props} />,
}));

vi.mock("next-themes", () => ({
  useTheme: vi.fn().mockReturnValue({ theme: "system", setTheme: vi.fn() }),
}));

vi.mock("@hugeicons/core-free-icons", () => ({
  SidebarLeftIcon: "SidebarLeftIcon",
  Cancel01Icon: "Cancel01Icon",
}));

vi.mock("@hugeicons/react", () => ({
  HugeiconsIcon: (props: Record<string, unknown>) => (
    <svg data-testid="hugeicons-icon" {...props} />
  ),
}));

// Mock useIsMobile to return false (desktop) by default
vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: vi.fn().mockReturnValue(false),
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { useQuery } from "convex/react";
import { usePathname } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "../app-sidebar";

const mockUsePathname = usePathname as ReturnType<typeof vi.fn>;
const mockUseQuery = useQuery as ReturnType<typeof vi.fn>;

/** Render helper that wraps AppSidebar in the required SidebarProvider. */
function renderSidebar() {
  return render(
    <SidebarProvider>
      <AppSidebar />
    </SidebarProvider>,
  );
}

beforeEach(() => {
  mockUsePathname.mockReset().mockReturnValue("/dashboard");
  mockUseQuery.mockReset().mockReturnValue(undefined);
});

describe("AppSidebar", () => {
  it("renders skeleton placeholders while sites are loading", () => {
    // useQuery returns undefined => loading state
    mockUseQuery.mockReturnValue(undefined);

    renderSidebar();

    // The component renders 3 skeleton menu items, each with 2 Skeleton divs
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBe(6); // 3 items x 2 skeletons each
  });

  it("renders empty state when there are no sites", () => {
    mockUseQuery.mockReturnValue([]);

    renderSidebar();

    expect(screen.getByText("No sites yet")).toBeInTheDocument();
  });

  it("renders a list of sites when data is available", () => {
    mockUseQuery.mockReturnValue([
      { _id: "site1", name: "Marketing Site", slug: "marketing-site" },
      { _id: "site2", name: "Blog", slug: "blog" },
    ]);

    renderSidebar();

    expect(screen.getByText("Marketing Site")).toBeInTheDocument();
    expect(screen.getByText("Blog")).toBeInTheDocument();
  });

  it("highlights the active site based on pathname", () => {
    mockUsePathname.mockReturnValue("/sites/blog");
    mockUseQuery.mockReturnValue([
      { _id: "site1", name: "Marketing Site", slug: "marketing-site" },
      { _id: "site2", name: "Blog", slug: "blog" },
    ]);

    renderSidebar();

    // The active menu button will have data-active attribute set by SidebarMenuButton
    const blogButton = screen
      .getByText("Blog")
      .closest("[data-slot='sidebar-menu-button']");
    expect(blogButton).toHaveAttribute("data-active");

    const marketingButton = screen
      .getByText("Marketing Site")
      .closest("[data-slot='sidebar-menu-button']");
    expect(marketingButton).not.toHaveAttribute("data-active");
  });

  it("renders the brand link pointing to /dashboard", () => {
    mockUseQuery.mockReturnValue([]);

    renderSidebar();

    const brandLink = screen.getByText("no-mess").closest("a");
    expect(brandLink).toHaveAttribute("href", "/dashboard");
  });

  it("renders the UserButton from Clerk", () => {
    mockUseQuery.mockReturnValue([]);

    renderSidebar();

    expect(screen.getByTestId("user-button")).toBeInTheDocument();
  });
});
