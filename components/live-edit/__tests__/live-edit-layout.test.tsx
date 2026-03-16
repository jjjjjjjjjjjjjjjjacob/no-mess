import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LiveEditLayout } from "../live-edit-layout";

const { mockConvexQuery, mockUpdateEntry, mockPublishEntry } = vi.hoisted(
  () => ({
    mockConvexQuery: vi.fn(),
    mockUpdateEntry: vi.fn(),
    mockPublishEntry: vi.fn(),
  }),
);

vi.mock("convex/react", () => ({
  useConvex: () => ({ query: mockConvexQuery }),
  useMutation: (fnRef: string) => {
    if (fnRef === "contentEntries:update") return mockUpdateEntry;
    if (fnRef === "contentEntries:publish") return mockPublishEntry;
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
      Save & Publish
    </button>
  ),
}));

vi.mock("@/components/live-edit/live-edit-field-panel", () => ({
  LiveEditFieldPanel: () => <div data-testid="field-panel" />,
}));

vi.mock("@/components/live-edit/live-edit-preview-panel", () => ({
  LiveEditPreviewPanel: () => <div data-testid="preview-panel" />,
}));

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div />,
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
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("LiveEditLayout publish cascade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
