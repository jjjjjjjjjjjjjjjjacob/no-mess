import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { EntryContextMenu } from "../entry-context-menu";

const {
  mockConvexQuery,
  mockPublishEntry,
  mockUnpublishEntry,
  mockRemoveEntry,
} = vi.hoisted(() => ({
  mockConvexQuery: vi.fn(),
  mockPublishEntry: vi.fn(),
  mockUnpublishEntry: vi.fn(),
  mockRemoveEntry: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useConvex: () => ({ query: mockConvexQuery }),
  useMutation: (fnRef: string) => {
    if (fnRef === "contentEntries:publish") return mockPublishEntry;
    if (fnRef === "contentEntries:unpublish") return mockUnpublishEntry;
    if (fnRef === "contentEntries:remove") return mockRemoveEntry;
    return vi.fn();
  },
}));

vi.mock("@/convex/_generated/api", () => ({
  api: {
    contentEntries: {
      publish: "contentEntries:publish",
      unpublish: "contentEntries:unpublish",
      remove: "contentEntries:remove",
      getPublishPlan: "contentEntries:getPublishPlan",
    },
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-copy-to-clipboard", () => ({
  useCopyToClipboard: () => ({
    copy: vi.fn(),
  }),
}));

vi.mock("@/components/ui/context-menu", () => ({
  ContextMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ContextMenuTrigger: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  ContextMenuContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  ContextMenuItem: ({
    children,
    onClick,
  }: {
    children: ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  ContextMenuSeparator: () => <div />,
}));

vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children }: { children: ReactNode }) => <>{children}</>,
  AlertDialogAction: ({
    children,
    onClick,
  }: {
    children: ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
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

vi.mock("lucide-react", () => {
  const Icon = () => <span />;
  return {
    ArrowRight: Icon,
    Copy: Icon,
    MousePointerClick: Icon,
    Trash2: Icon,
    Upload: Icon,
  };
});

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("EntryContextMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes expected cascade slugs after confirmation", async () => {
    const user = userEvent.setup();
    mockConvexQuery.mockResolvedValue({
      cascadeTargets: [
        { kind: "fragment", name: "Draft Fragment", slug: "draft-fragment" },
      ],
      expectedCascadeSlugs: ["draft-fragment"],
    });

    render(
      <EntryContextMenu
        entry={{
          _id: "entry_1" as any,
          slug: "my-post",
          status: "draft",
          title: "My Post",
        }}
        siteSlug="test-site"
        typeSlug="blog-post"
      >
        <div>Trigger</div>
      </EntryContextMenu>,
    );

    await user.click(screen.getByRole("button", { name: /publish/i }));

    expect(mockPublishEntry).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Confirm cascade" }));

    await waitFor(() => {
      expect(mockPublishEntry).toHaveBeenCalledWith({
        entryId: "entry_1",
        cascade: true,
        expectedCascadeSlugs: ["draft-fragment"],
      });
    });
  });

  it("publishes pending changes for published entries", async () => {
    const user = userEvent.setup();
    mockConvexQuery.mockResolvedValue({
      cascadeTargets: [],
      expectedCascadeSlugs: [],
    });

    render(
      <EntryContextMenu
        entry={{
          _id: "entry_1" as any,
          slug: "my-post",
          status: "published",
          title: "My Post",
          draft: { body: "New draft" },
          published: { body: "Old published" },
        }}
        siteSlug="test-site"
        typeSlug="blog-post"
      >
        <div>Trigger</div>
      </EntryContextMenu>,
    );

    await user.click(screen.getByRole("button", { name: /publish changes/i }));

    await waitFor(() => {
      expect(mockPublishEntry).toHaveBeenCalledWith({
        entryId: "entry_1",
        cascade: undefined,
        expectedCascadeSlugs: undefined,
      });
    });
    expect(mockUnpublishEntry).not.toHaveBeenCalled();
  });

  it("unpublishes published entries without pending draft changes", async () => {
    const user = userEvent.setup();

    render(
      <EntryContextMenu
        entry={{
          _id: "entry_1" as any,
          slug: "my-post",
          status: "published",
          title: "My Post",
          draft: { body: "Published content" },
          published: { body: "Published content" },
        }}
        siteSlug="test-site"
        typeSlug="blog-post"
      >
        <div>Trigger</div>
      </EntryContextMenu>,
    );

    await user.click(screen.getByRole("button", { name: /unpublish/i }));

    await waitFor(() => {
      expect(mockUnpublishEntry).toHaveBeenCalledWith({
        entryId: "entry_1",
      });
    });
    expect(mockPublishEntry).not.toHaveBeenCalled();
  });
});
