import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";

const {
  mockConvexQuery,
  mockCreateDraft,
  mockSaveDraft,
  mockPublishSchema,
  mockRouter,
  mockContentType,
  mockToastError,
  mockToastSuccess,
} = vi.hoisted(() => ({
  mockConvexQuery: vi.fn(),
  mockCreateDraft: vi.fn(),
  mockSaveDraft: vi.fn(),
  mockPublishSchema: vi.fn(),
  mockRouter: {
    push: vi.fn(),
    replace: vi.fn(),
  },
  mockContentType: vi.fn(),
  mockToastError: vi.fn(),
  mockToastSuccess: vi.fn(),
}));

let capturedOnSubmit: ((data: any) => Promise<void>) | null = null;
let capturedOnChange: ((data: any) => void) | null = null;

vi.mock("convex/react", () => ({
  useConvex: () => ({ query: mockConvexQuery }),
  useMutation: (fnRef: string) => {
    if (fnRef === "contentTypes:createDraft") return mockCreateDraft;
    if (fnRef === "contentTypes:saveDraft") return mockSaveDraft;
    if (fnRef === "contentTypes:publish") return mockPublishSchema;
    return vi.fn();
  },
  useQuery: (fnRef: string) => {
    if (fnRef === "contentTypes:getBySlug") {
      return mockContentType();
    }
    return undefined;
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  useParams: () => ({ typeSlug: "blog-post" }),
}));

vi.mock("@/convex/_generated/api", () => ({
  api: {
    contentTypes: {
      createDraft: "contentTypes:createDraft",
      saveDraft: "contentTypes:saveDraft",
      publish: "contentTypes:publish",
      getBySlug: "contentTypes:getBySlug",
      previewPublishPlan: "contentTypes:previewPublishPlan",
      discardDraft: "contentTypes:discardDraft",
      remove: "contentTypes:remove",
    },
  },
}));

vi.mock("@/components/content-types/content-type-form", () => ({
  ContentTypeForm: ({
    onSubmit,
    onChange,
  }: {
    onSubmit: (data: any) => Promise<void>;
    onChange?: (data: any) => void;
  }) => {
    capturedOnSubmit = onSubmit;
    capturedOnChange = onChange ?? null;
    return <div data-testid="content-type-form" />;
  },
}));

vi.mock("@/components/publishing/publish-cascade-dialog", () => ({
  PublishCascadeDialog: ({
    open,
    onConfirm,
    targets,
  }: {
    open: boolean;
    onConfirm: () => Promise<void> | void;
    targets: { slug: string }[];
  }) =>
    open ? (
      <div data-testid="cascade-dialog">
        <div>{targets.map((target) => target.slug).join(",")}</div>
        <button type="button" onClick={() => void onConfirm()}>
          Confirm cascade
        </button>
      </div>
    ) : null,
}));

vi.mock("@/components/schemas/schema-import-dialog", () => ({
  SchemaImportDialog: () => null,
}));

vi.mock("@/components/schemas/schema-export-panel", () => ({
  SchemaExportPanel: () => null,
}));

vi.mock("@/hooks/use-site", () => ({
  useSite: () => ({
    site: { _id: "site_1" },
    siteSlug: "test-site",
  }),
}));

vi.mock("@/hooks/use-analytics", () => ({
  useAnalytics: () => ({
    trackSchemaPublished: vi.fn(),
    trackSchemaDraftSaved: vi.fn(),
    trackSchemaImported: vi.fn(),
    trackSchemaExported: vi.fn(),
    trackSchemaDeleted: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-auto-save", () => ({
  useAutoSave: () => ({ lastSavedAt: null }),
}));

vi.mock("@/hooks/use-unsaved-changes", () => ({
  useBeforeUnload: vi.fn(),
  useKeyboardSave: vi.fn(),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: {
    children: ReactNode;
    [key: string]: unknown;
  }) => <button {...props}>{children}</button>,
}));

vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children }: { children: ReactNode }) => <>{children}</>,
  AlertDialogAction: ({
    children,
    ...props
  }: {
    children: ReactNode;
    [key: string]: unknown;
  }) => <button {...props}>{children}</button>,
  AlertDialogCancel: ({
    children,
    ...props
  }: {
    children: ReactNode;
    [key: string]: unknown;
  }) => <button {...props}>{children}</button>,
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

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div />,
}));

vi.mock("lucide-react", () => {
  const Icon = () => <span />;
  return {
    Code: Icon,
    Save: Icon,
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

describe("schema publish cascade flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnSubmit = null;
    capturedOnChange = null;
    mockContentType.mockReturnValue(undefined);
  });

  it("previews cascade before creating a draft on the new schema page", async () => {
    const user = userEvent.setup();
    mockConvexQuery.mockResolvedValue({
      cascadeTargets: [
        {
          kind: "fragment",
          name: "Draft Fragment",
          slug: "draft-fragment",
        },
      ],
      expectedCascadeSlugs: ["draft-fragment"],
    });
    mockCreateDraft.mockResolvedValue("ct_new");

    const { default: NewSchemaPage } = await import(
      "../(dashboard)/sites/[siteSlug]/schemas/new/page"
    );

    render(<NewSchemaPage />);

    const schemaData = {
      kind: "template",
      mode: "collection",
      name: "Landing Page",
      slug: "landing-page",
      description: "A landing page",
      fields: [{ name: "hero", type: "text", required: false }],
    };

    await act(async () => {
      await capturedOnSubmit?.(schemaData);
    });

    expect(mockCreateDraft).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByTestId("cascade-dialog")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Confirm cascade" }));

    await waitFor(() => {
      expect(mockCreateDraft).toHaveBeenCalledWith({
        siteId: "site_1",
        name: "Landing Page",
        slug: "landing-page",
        kind: "template",
        mode: "collection",
        route: undefined,
        description: "A landing page",
        fields: [{ name: "hero", type: "text", required: false }],
      });
    });

    await waitFor(() => {
      expect(mockPublishSchema).toHaveBeenCalledWith({
        contentTypeId: "ct_new",
        cascade: true,
        expectedCascadeSlugs: ["draft-fragment"],
      });
    });
  });

  it("uses the current unsaved schema form state for publish preflight", async () => {
    mockContentType.mockReturnValue({
      _id: "ct_1",
      name: "Blog Post",
      slug: "blog-post",
      kind: "template",
      mode: "collection",
      fields: [{ name: "title", type: "text", required: false }],
      status: "published",
      draft: undefined,
    });
    mockConvexQuery.mockResolvedValue({
      cascadeTargets: [],
      expectedCascadeSlugs: [],
    });

    const { default: EditSchemaPage } = await import(
      "../(dashboard)/sites/[siteSlug]/schemas/[typeSlug]/page"
    );

    render(<EditSchemaPage />);

    const editedData = {
      kind: "template",
      mode: "collection",
      name: "Renamed Blog Post",
      slug: "renamed-blog-post",
      description: "Edited description",
      fields: [{ name: "headline", type: "text", required: false }],
    };

    act(() => {
      capturedOnChange?.(editedData);
    });
    await act(async () => {
      await capturedOnSubmit?.(editedData);
    });

    expect(mockConvexQuery).toHaveBeenCalledWith(
      "contentTypes:previewPublishPlan",
      {
        siteId: "site_1",
        contentTypeId: "ct_1",
        name: "Renamed Blog Post",
        slug: "renamed-blog-post",
        kind: "template",
        mode: "collection",
        route: undefined,
        description: "Edited description",
        fields: [{ name: "headline", type: "text", required: false }],
      },
    );
  });

  it("shows an error and aborts new schema publish when preview fails", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockConvexQuery.mockRejectedValueOnce(new Error("Plan lookup failed"));

    try {
      const { default: NewSchemaPage } = await import(
        "../(dashboard)/sites/[siteSlug]/schemas/new/page"
      );

      render(<NewSchemaPage />);

      await act(async () => {
        await capturedOnSubmit?.({
          kind: "template",
          mode: "collection",
          name: "Landing Page",
          slug: "landing-page",
          description: "A landing page",
          fields: [{ name: "hero", type: "text", required: false }],
        });
      });

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith("Plan lookup failed");
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to load schema publish plan",
        expect.any(Error),
      );
      expect(mockCreateDraft).not.toHaveBeenCalled();
      expect(mockPublishSchema).not.toHaveBeenCalled();
      expect(screen.queryByTestId("cascade-dialog")).not.toBeInTheDocument();
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it("shows an error and aborts edit schema publish when preview fails", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockContentType.mockReturnValue({
      _id: "ct_1",
      name: "Blog Post",
      slug: "blog-post",
      kind: "template",
      mode: "collection",
      fields: [{ name: "title", type: "text", required: false }],
      status: "published",
      draft: undefined,
    });
    mockConvexQuery.mockRejectedValueOnce(new Error("Plan lookup failed"));

    try {
      const { default: EditSchemaPage } = await import(
        "../(dashboard)/sites/[siteSlug]/schemas/[typeSlug]/page"
      );

      render(<EditSchemaPage />);

      const editedData = {
        kind: "template",
        mode: "collection",
        name: "Renamed Blog Post",
        slug: "renamed-blog-post",
        description: "Edited description",
        fields: [{ name: "headline", type: "text", required: false }],
      };

      act(() => {
        capturedOnChange?.(editedData);
      });
      await act(async () => {
        await capturedOnSubmit?.(editedData);
      });

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith("Plan lookup failed");
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to load schema publish plan",
        expect.any(Error),
      );
      expect(mockSaveDraft).not.toHaveBeenCalled();
      expect(mockPublishSchema).not.toHaveBeenCalled();
      expect(screen.queryByTestId("cascade-dialog")).not.toBeInTheDocument();
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it("prevents duplicate edit schema publish preflights while the first request is pending", async () => {
    mockContentType.mockReturnValue({
      _id: "ct_1",
      name: "Blog Post",
      slug: "blog-post",
      kind: "template",
      mode: "collection",
      fields: [{ name: "title", type: "text", required: false }],
      status: "published",
      draft: undefined,
    });

    let resolvePlan = (_value: {
      cascadeTargets: unknown[];
      expectedCascadeSlugs: string[];
    }) => {};
    mockConvexQuery.mockImplementationOnce(
      () =>
        new Promise<{
          cascadeTargets: unknown[];
          expectedCascadeSlugs: string[];
        }>((resolve) => {
          resolvePlan = resolve;
        }),
    );

    const { default: EditSchemaPage } = await import(
      "../(dashboard)/sites/[siteSlug]/schemas/[typeSlug]/page"
    );

    render(<EditSchemaPage />);

    const editedData = {
      kind: "template",
      mode: "collection",
      name: "Renamed Blog Post",
      slug: "renamed-blog-post",
      description: "Edited description",
      fields: [{ name: "headline", type: "text", required: false }],
    };

    act(() => {
      capturedOnChange?.(editedData);
    });

    let firstSubmit: Promise<void> | null = null;
    let secondSubmit: Promise<void> | null = null;

    await act(async () => {
      firstSubmit = capturedOnSubmit?.(editedData) ?? null;
      secondSubmit = capturedOnSubmit?.(editedData) ?? null;
    });

    expect(mockConvexQuery).toHaveBeenCalledTimes(1);

    resolvePlan({
      cascadeTargets: [],
      expectedCascadeSlugs: [],
    });

    await act(async () => {
      await firstSubmit;
      await secondSubmit;
    });

    await waitFor(() => {
      expect(mockSaveDraft).toHaveBeenCalledTimes(1);
      expect(mockPublishSchema).toHaveBeenCalledTimes(1);
    });
  });
});
