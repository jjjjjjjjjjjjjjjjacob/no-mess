import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { LiveEditLayout } from "../live-edit-layout";

const {
  mockConvexQuery,
  mockUpdateEntry,
  mockPublishEntry,
  mockCreateSavedDraft,
  mockRenameSavedDraft,
  mockRemoveSavedDraft,
  mockLoadSavedDraft,
  mockToastError,
  mockToastSuccess,
} = vi.hoisted(() => ({
  mockConvexQuery: vi.fn(),
  mockUpdateEntry: vi.fn(),
  mockPublishEntry: vi.fn(),
  mockCreateSavedDraft: vi.fn(),
  mockRenameSavedDraft: vi.fn(),
  mockRemoveSavedDraft: vi.fn(),
  mockLoadSavedDraft: vi.fn(),
  mockToastError: vi.fn(),
  mockToastSuccess: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useConvex: () => ({ query: mockConvexQuery }),
  useMutation: (fnRef: string) => {
    if (fnRef === "contentEntries:update") return mockUpdateEntry;
    if (fnRef === "contentEntries:publish") return mockPublishEntry;
    if (fnRef === "contentEntryDrafts:create") return mockCreateSavedDraft;
    if (fnRef === "contentEntryDrafts:rename") return mockRenameSavedDraft;
    if (fnRef === "contentEntryDrafts:remove") return mockRemoveSavedDraft;
    if (fnRef === "contentEntryDrafts:load") return mockLoadSavedDraft;
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
    if (fnRef === "contentEntries:listByType") {
      return [
        {
          _id: "entry_1",
          slug: "my-post",
          title: "My Post",
          draft: { body: "Draft content" },
          status: "draft",
        },
      ];
    }
    if (fnRef === "contentTypes:listBySite") {
      return [];
    }
    if (fnRef === "contentEntryDrafts:listByEntry") {
      return [];
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
      getPublishPlan: "contentEntries:getPublishPlan",
    },
    contentEntryDrafts: {
      listByEntry: "contentEntryDrafts:listByEntry",
      create: "contentEntryDrafts:create",
      rename: "contentEntryDrafts:rename",
      remove: "contentEntryDrafts:remove",
      load: "contentEntryDrafts:load",
    },
  },
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ typeSlug: "blog-post", entrySlug: "my-post" }),
}));

vi.mock("@/hooks/use-site", () => ({
  useSite: () => ({
    site: { _id: "site_1", previewUrl: "https://example.com" },
    siteSlug: "test-site",
  }),
}));

vi.mock("@/hooks/use-unsaved-changes", () => ({
  useBeforeUnload: vi.fn(),
  useKeyboardSave: vi.fn(),
}));

vi.mock("@/components/live-edit/live-edit-toolbar", () => ({
  LiveEditToolbar: ({
    onPublish,
  }: {
    onPublish: () => Promise<void> | void;
  }) => (
    <button type="button" onClick={() => void onPublish()}>
      Publish
    </button>
  ),
}));

vi.mock("@/components/live-edit/live-edit-field-panel", () => ({
  LiveEditFieldPanel: () => <div data-testid="field-panel" />,
}));

vi.mock("@/components/live-edit/live-edit-preview-panel", () => ({
  LiveEditPreviewPanel: () => <div data-testid="preview-panel" />,
}));

vi.mock("@/components/ui/resizable", () => ({
  ResizablePanelGroup: ({ children }: { children: ReactNode }) => (
    <div data-testid="resizable-group">{children}</div>
  ),
  ResizablePanel: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  ResizableHandle: () => <div data-testid="resizable-handle" />,
}));

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div />,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    type = "button",
    disabled,
  }: {
    children: ReactNode;
    onClick?: () => void;
    type?: "button" | "submit";
    disabled?: boolean;
  }) => (
    <button type={type} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: ReactNode; open: boolean }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogDescription: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogFooter: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children }: { children: ReactNode }) => <label>{children}</label>,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: ReactNode }) => <div>{children}</div>,
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

vi.mock("sonner", () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

describe("LiveEditLayout publish cascade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the live edit workspace in a resizable split layout", () => {
    render(<LiveEditLayout />);

    expect(screen.getByTestId("resizable-group")).toBeInTheDocument();
    expect(screen.getByTestId("field-panel")).toBeInTheDocument();
    expect(screen.getByTestId("preview-panel")).toBeInTheDocument();
  });

  it("passes expected cascade slugs after confirming from live edit", async () => {
    const user = userEvent.setup();
    mockConvexQuery.mockResolvedValue({
      cascadeTargets: [
        { kind: "fragment", name: "Draft Fragment", slug: "draft-fragment" },
      ],
      expectedCascadeSlugs: ["draft-fragment"],
    });

    render(<LiveEditLayout />);

    await user.click(screen.getByRole("button", { name: "Publish" }));
    await user.click(
      screen.getByRole("button", { name: "Publish Selected Draft" }),
    );

    expect(mockPublishEntry).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Confirm cascade" }));

    await waitFor(() => {
      expect(mockUpdateEntry).toHaveBeenCalledWith({
        entryId: "entry_1",
        title: "My Post",
        draft: { body: "Draft content" },
      });
    });

    await waitFor(() => {
      expect(mockPublishEntry).toHaveBeenCalledWith({
        entryId: "entry_1",
        cascade: true,
        expectedCascadeSlugs: ["draft-fragment"],
      });
    });
  });

  it("shows an error and aborts when the publish plan query fails", async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockConvexQuery.mockRejectedValueOnce(new Error("Plan lookup failed"));

    try {
      render(<LiveEditLayout />);

      await user.click(screen.getByRole("button", { name: "Publish" }));
      await user.click(
        screen.getByRole("button", { name: "Publish Selected Draft" }),
      );

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith("Plan lookup failed");
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to load entry publish plan",
        expect.any(Error),
      );
      expect(mockUpdateEntry).toHaveBeenCalledWith({
        entryId: "entry_1",
        title: "My Post",
        draft: { body: "Draft content" },
      });
      expect(mockPublishEntry).not.toHaveBeenCalled();
      expect(
        screen.queryByRole("button", { name: "Confirm cascade" }),
      ).not.toBeInTheDocument();
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});
