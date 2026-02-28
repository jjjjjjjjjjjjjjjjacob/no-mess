import { render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { docsNavigation } from "../docs-nav-config";
import { DocsSidebar } from "../docs-sidebar";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn().mockReturnValue("/"),
}));

const mockUsePathname = usePathname as ReturnType<typeof vi.fn>;

describe("DocsSidebar", () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue("/");
  });

  it("renders a nav element", () => {
    render(<DocsSidebar />);
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  it("renders all group titles", () => {
    render(<DocsSidebar />);
    for (const group of docsNavigation) {
      expect(screen.getByText(group.title)).toBeInTheDocument();
    }
  });

  it("renders all nav items as links", () => {
    render(<DocsSidebar />);
    const links = screen.getAllByRole("link");
    const allItems = docsNavigation.flatMap((g) => g.items);
    expect(links).toHaveLength(allItems.length);
  });

  it("renders links with correct hrefs", () => {
    render(<DocsSidebar />);
    for (const group of docsNavigation) {
      for (const item of group.items) {
        const link = screen.getByRole("link", { name: item.title });
        expect(link).toHaveAttribute("href", item.href);
      }
    }
  });

  it("applies active styling to the current pathname link", () => {
    mockUsePathname.mockReturnValue("/docs/getting-started");
    render(<DocsSidebar />);
    const activeLink = screen.getByRole("link", { name: "Getting Started" });
    expect(activeLink.className).toContain("bg-primary/10");
    expect(activeLink.className).toContain("font-medium");
  });

  it("does not apply active styling to non-active links", () => {
    mockUsePathname.mockReturnValue("/docs/getting-started");
    render(<DocsSidebar />);
    const inactiveLink = screen.getByRole("link", { name: "Field Types" });
    expect(inactiveLink.className).not.toContain("bg-primary/10");
    expect(inactiveLink.className).toContain("text-secondary-foreground/60");
  });

  it("applies active styling to a different route", () => {
    mockUsePathname.mockReturnValue("/docs/field-types");
    render(<DocsSidebar />);
    const activeLink = screen.getByRole("link", { name: "Field Types" });
    expect(activeLink.className).toContain("bg-primary/10");
  });

  it("applies no active styling when pathname matches nothing", () => {
    mockUsePathname.mockReturnValue("/some/other/page");
    render(<DocsSidebar />);
    const links = screen.getAllByRole("link");
    for (const link of links) {
      expect(link.className).not.toContain("bg-primary/10");
    }
  });

  it("renders group titles as headings with correct styling", () => {
    render(<DocsSidebar />);
    for (const group of docsNavigation) {
      const heading = screen.getByText(group.title);
      expect(heading.tagName).toBe("H4");
      expect(heading.className).toContain("uppercase");
    }
  });

  it("renders items within list elements", () => {
    render(<DocsSidebar />);
    const listItems = screen.getAllByRole("listitem");
    const allItems = docsNavigation.flatMap((g) => g.items);
    expect(listItems).toHaveLength(allItems.length);
  });
});
