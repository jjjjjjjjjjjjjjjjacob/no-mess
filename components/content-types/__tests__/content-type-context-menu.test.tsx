import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { ContentTypeContextMenu } from "../content-type-context-menu";

const {
  mockConvexQuery,
  mockPublishSchema,
  mockDiscardDraft,
  mockRemoveContentType,
  mockToastError,
  mockToastSuccess,
} = vi.hoisted(() => ({
  mockConvexQuery: vi.fn(),
  mockPublishSchema: vi.fn(),
  mockDiscardDraft: vi.fn(),
  mockRemoveContentType: vi.fn(),
  mockToastError: vi.fn(),
  mockToastSuccess: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useConvex: () => ({ query: mockConvexQuery }),
  useMutation: (fnRef: string) => {
    if (fnRef === "contentTypes:publish") return mockPublishSchema;
    if (fnRef === "contentTypes:discardDraft") return mockDiscardDraft;
    if (fnRef === "contentTypes:remove") return mockRemoveContentType;
    return vi.fn();
  },
  useQuery: (fnRef: string) => {
    if (fnRef === "contentTypes:get") {
      return undefined;
    }
    return undefined;
  },
}));

vi.mock("@/convex/_generated/api", () => ({
  api: {
    contentTypes: {
      get: "contentTypes:get",
      publish: "contentTypes:publish",
      discardDraft: "contentTypes:discardDraft",
      remove: "contentTypes:remove",
      getPublishPlan: "contentTypes:getPublishPlan",
    },
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-analytics", () => ({
  useAnalytics: () => ({
    trackSchemaPublished: vi.fn(),
    trackSchemaDraftSaved: vi.fn(),
    trackSchemaExported: vi.fn(),
    trackSchemaDeleted: vi.fn(),
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
    disabled,
    onClick,
  }: {
    children: ReactNode;
    disabled?: boolean;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
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

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: ReactNode }) => <>{children}</>,
  DialogContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
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

vi.mock("@/components/schemas/schema-export-panel", () => ({
  SchemaExportPanel: () => null,
}));

vi.mock("lucide-react", () => {
  const Icon = () => <span />;
  return {
    ArrowRight: Icon,
    Code: Icon,
    Copy: Icon,
    FileText: Icon,
    Plus: Icon,
    Trash2: Icon,
    Undo2: Icon,
    Upload: Icon,
  };
});

vi.mock("sonner", () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

describe("ContentTypeContextMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows an error and aborts when the schema publish plan query fails", async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockConvexQuery.mockRejectedValueOnce(new Error("Plan lookup failed"));

    try {
      render(
        <ContentTypeContextMenu
          siteId={"site_1" as any}
          siteSlug="test-site"
          type={{
            _id: "ct_1" as any,
            name: "Blog Post",
            slug: "blog-post",
            kind: "template",
            mode: "collection",
            fields: [],
            status: "draft",
            hasDraft: true,
          }}
        >
          <div>Trigger</div>
        </ContentTypeContextMenu>,
      );

      await user.click(screen.getByRole("button", { name: /publish schema/i }));

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith("Plan lookup failed");
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to load schema publish plan",
        expect.any(Error),
      );
      expect(mockPublishSchema).not.toHaveBeenCalled();
      expect(
        screen.queryByRole("button", { name: "Confirm cascade" }),
      ).not.toBeInTheDocument();
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});
