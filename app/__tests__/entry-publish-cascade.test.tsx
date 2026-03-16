import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";

const {
  mockConvexQuery,
  mockUpdateEntry,
  mockPublishEntry,
  mockUnpublishEntry,
  mockRemoveEntry,
} = vi.hoisted(() => ({
  mockConvexQuery: vi.fn(),
  mockUpdateEntry: vi.fn(),
  mockPublishEntry: vi.fn(),
  mockUnpublishEntry: vi.fn(),
  mockRemoveEntry: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useConvex: () => ({ query: mockConvexQuery }),
  useMutation: (fnRef: string) => {
    if (fnRef === "contentEntries:update") return mockUpdateEntry;
    if (fnRef === "contentEntries:publish") return mockPublishEntry;
    if (fnRef === "contentEntries:unpublish") return mockUnpublishEntry;
    if (fnRef === "contentEntries:remove") return mockRemoveEntry;
    return vi.fn();
  },
  useQuery: (fnRef: string) => {
    if (fnRef === "contentTypes:getBySlug") {
      return {
        _id: "ct_1",
        name: "Blog Post",
        slug: "blog-post",
        kind: "template",
        mode: "collection",
        fields: [],
      };
    }
    if (fnRef === "contentTypes:listBySite") {
      return [];
    }
    if (fnRef === "contentEntries:listByType") {
      return [
        {
          _id: "entry_1",
          slug: "my-post",
          title: "My Post",
          draft: { body: "Draft content" },
          published: undefined,
          status: "draft",
          updatedAt: 1000,
        },
      ];
    }
    return undefined;
  },
}));

vi.mock("@/convex/_generated/api", () => ({
  api: {
    contentTypes: {
      getBySlug: "contentTypes:getBySlug",
      listBySite: "contentTypes:listBySite",
    },
    contentEntries: {
      listByType: "contentEntries:listByType",
      update: "contentEntries:update",
      publish: "contentEntries:publish",
      unpublish: "contentEntries:unpublish",
      remove: "contentEntries:remove",
      getPublishPlan: "contentEntries:getPublishPlan",
    },
  },
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ typeSlug: "blog-post", entrySlug: "my-post" }),
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-site", () => ({
  useSite: () => ({
    site: { _id: "site_1", previewUrl: undefined },
    siteSlug: "test-site",
  }),
}));

vi.mock("@/hooks/use-preview-refresh", () => ({
  usePreviewRefresh: vi.fn(),
}));

vi.mock("@/hooks/use-unsaved-changes", () => ({
  useBeforeUnload: vi.fn(),
  useKeyboardSave: vi.fn(),
}));

vi.mock("@/components/content-entries/delivery-urls-card", () => ({
  DeliveryUrlsCard: () => null,
}));

vi.mock("@/components/content-entries/preview-panel", () => ({
  PreviewPanel: () => null,
}));

vi.mock("@/components/dynamic-form/dynamic-form", () => ({
  DynamicForm: () => <div data-testid="dynamic-form" />,
}));

vi.mock("@/components/publishing/publish-cascade-dialog", () => ({
  PublishCascadeDialog: ({
    open,
    onConfirm,
  }: {
    open: boolean;
    onConfirm: () => Promise<void> | void;
  }) =>
    open ? (
      <button type="button" onClick={() => void onConfirm()}>
        Confirm cascade
      </button>
    ) : null,
}));

vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children }: { children: ReactNode }) => <>{children}</>,
  AlertDialogAction: ({ children }: { children: ReactNode }) => (
    <button type="button">{children}</button>
  ),
  AlertDialogCancel: ({ children }: { children: ReactNode }) => (
    <button type="button">{children}</button>
  ),
  AlertDialogContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogDescription: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogFooter: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogTitle: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: {
    children: ReactNode;
    [key: string]: unknown;
  }) => <button {...props}>{children}</button>,
  buttonVariants: () => "",
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children }: { children: ReactNode }) => <label>{children}</label>,
}));

vi.mock("@/components/ui/resizable", () => ({
  ResizablePanelGroup: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  ResizablePanel: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  ResizableHandle: () => <div />,
}));

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div />,
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("lucide-react", () => {
  const Icon = () => <span />;
  return {
    Eye: Icon,
    EyeOff: Icon,
    MousePointerClick: Icon,
    Trash2: Icon,
  };
});

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("EditEntryPage publish cascade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes expected cascade slugs after confirming from the entry editor", async () => {
    const user = userEvent.setup();
    mockConvexQuery.mockResolvedValue({
      cascadeTargets: [
        { kind: "fragment", name: "Draft Fragment", slug: "draft-fragment" },
      ],
      expectedCascadeSlugs: ["draft-fragment"],
    });

    const { default: EditEntryPage } = await import(
      "../(dashboard)/sites/[siteSlug]/content/[typeSlug]/[entrySlug]/page"
    );

    render(<EditEntryPage />);

    await user.click(screen.getByRole("button", { name: "Save & Publish" }));

    expect(mockPublishEntry).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Confirm cascade" }));

    await waitFor(() => {
      expect(mockUpdateEntry).toHaveBeenCalledWith({
        entryId: "entry_1",
        title: "My Post",
        draft: { body: "Draft content" },
      });
    });

    expect(mockPublishEntry).toHaveBeenCalledWith({
      entryId: "entry_1",
      cascade: true,
      expectedCascadeSlugs: ["draft-fragment"],
    });
  });
});
