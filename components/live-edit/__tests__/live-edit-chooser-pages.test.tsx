import { render, screen } from "@testing-library/react";
import LiveEditEntriesPage from "@/app/(dashboard)/sites/[siteSlug]/live-edit/[typeSlug]/page";
import LiveEditIndexPage from "@/app/(dashboard)/sites/[siteSlug]/live-edit/page";

const { mockUseQuery, mockReplace } = vi.hoisted(() => ({
  mockUseQuery: vi.fn(),
  mockReplace: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useQuery: (fnRef: string, args: unknown) => mockUseQuery(fnRef, args),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ typeSlug: "pages" }),
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock("@/hooks/use-site", () => ({
  useSite: () => ({
    site: {
      _id: "site_1",
      previewUrl: "http://localhost:3456",
    },
    siteSlug: "test-site",
  }),
}));

vi.mock("@/convex/_generated/api", () => ({
  api: {
    contentTypes: {
      listBySite: "contentTypes:listBySite",
      getBySlug: "contentTypes:getBySlug",
    },
    contentEntries: {
      listByType: "contentEntries:listByType",
    },
  },
}));

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

describe("Live Edit chooser pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the site-level chooser as a full-height workspace", () => {
    mockUseQuery.mockImplementation((fnRef: string) => {
      if (fnRef === "contentTypes:listBySite") {
        return [
          {
            _id: "ct_1",
            slug: "home",
            name: "Home Page",
            kind: "template",
            mode: "singleton",
            status: "published",
            hasDraft: false,
            description: "Homepage content",
            route: "/",
          },
        ];
      }
      return undefined;
    });

    const { container } = render(<LiveEditIndexPage />);
    const root = container.firstElementChild;
    if (!root) throw new Error("Missing root element");

    expect(root).toHaveClass("flex", "h-full", "min-h-0");
    expect(
      screen.getByText("Choose a content type to edit"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Live Edit")).toHaveLength(2);
  });

  it("renders the entry chooser as a full-height workspace", () => {
    mockUseQuery.mockImplementation((fnRef: string) => {
      if (fnRef === "contentTypes:getBySlug") {
        return {
          _id: "ct_1",
          slug: "pages",
          name: "Pages",
          kind: "template",
          mode: "collection",
          description: "Choose a page",
        };
      }
      if (fnRef === "contentEntries:listByType") {
        return [
          {
            _id: "entry_1",
            slug: "about",
            title: "About",
            status: "published",
          },
        ];
      }
      return undefined;
    });

    const { container } = render(<LiveEditEntriesPage />);
    const root = container.firstElementChild;
    if (!root) throw new Error("Missing root element");

    expect(root).toHaveClass("flex", "h-full", "min-h-0");
    expect(screen.getByText("Choose an entry to edit")).toBeInTheDocument();
    expect(screen.getByText("Pages entries")).toBeInTheDocument();
  });
});
