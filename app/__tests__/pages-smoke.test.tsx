import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Hoisted mock values — available before any vi.mock() factory runs
// ---------------------------------------------------------------------------

const {
  mockUseQuery,
  mockUseMutation,
  mockUseAction,
  mockUseParams,
  mockUseRouter,
  mockRedirect,
  mockRouterInstance,
} = vi.hoisted(() => {
  const mockRouterInstance = {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  };
  return {
    mockUseQuery: vi.fn().mockReturnValue(undefined),
    mockUseMutation: vi.fn().mockReturnValue(vi.fn()),
    mockUseAction: vi.fn().mockReturnValue(vi.fn()),
    mockUseParams: vi.fn().mockReturnValue({}),
    mockUseRouter: vi.fn().mockReturnValue(mockRouterInstance),
    mockRedirect: vi.fn(),
    mockRouterInstance,
  };
});

// ---------------------------------------------------------------------------
// Module mocks — must appear before any import that touches mocked modules
// ---------------------------------------------------------------------------

vi.mock("convex/react", () => ({
  useQuery: mockUseQuery,
  useMutation: mockUseMutation,
  useAction: mockUseAction,
  useConvex: vi.fn().mockReturnValue({}),
  ConvexProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("next/navigation", () => ({
  useParams: mockUseParams,
  usePathname: vi.fn().mockReturnValue("/"),
  useRouter: mockUseRouter,
  useSearchParams: vi.fn().mockReturnValue(new URLSearchParams()),
  redirect: mockRedirect,
  notFound: vi.fn(),
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

vi.mock("@clerk/nextjs", () => ({
  SignIn: () => <div data-testid="clerk-sign-in" />,
  SignUp: () => <div data-testid="clerk-sign-up" />,
  SignInButton: ({ children }: { children?: React.ReactNode }) => (
    <>{children ?? <button type="button">Sign In</button>}</>
  ),
  SignUpButton: ({ children }: { children?: React.ReactNode }) => (
    <>{children ?? <button type="button">Sign Up</button>}</>
  ),
  UserButton: () => <div data-testid="user-button" />,
  ClerkProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useUser: vi.fn().mockReturnValue({
    isSignedIn: false,
    isLoaded: true,
    user: null,
  }),
  useAuth: vi.fn().mockReturnValue({
    isSignedIn: false,
    isLoaded: true,
    userId: null,
    getToken: vi.fn().mockResolvedValue(null),
  }),
  SignedIn: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignedOut: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock @clerk/elements/* for auth pages
vi.mock("@clerk/elements/sign-in", () => ({
  Root: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="clerk-sign-in">{children}</div>
  ),
  Step: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Action: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Strategy: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SupportedStrategy: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("@clerk/elements/sign-up", () => ({
  Root: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="clerk-sign-up">{children}</div>
  ),
  Step: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Action: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Strategy: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@clerk/elements/common", () => ({
  GlobalError: () => null,
  Field: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Label: ({ children }: { children: React.ReactNode }) => (
    <label>{children}</label>
  ),
  Input: (props: Record<string, unknown>) => <input {...props} />,
  FieldError: () => null,
  FieldState: ({
    children,
  }: {
    children: (args: { state: null }) => React.ReactNode;
  }) => <>{children({ state: null })}</>,
}));

// Mock auth sub-components
vi.mock("@/components/auth/auth-card", () => ({
  AuthCard: ({
    children,
    title,
    footer,
  }: {
    children: React.ReactNode;
    title?: string;
    footer?: React.ReactNode;
  }) => (
    <div data-testid="auth-card">
      {title && <h2>{title}</h2>}
      {children}
      {footer}
    </div>
  ),
}));

vi.mock("@/components/auth/auth-divider", () => ({
  AuthDivider: () => <hr data-testid="auth-divider" />,
}));

vi.mock("@/components/auth/auth-otp-input", () => ({
  AuthOtpInput: () => <input data-testid="auth-otp-input" />,
}));

vi.mock("@/components/auth/auth-social-button", () => ({
  AuthSocialButton: () => (
    <button type="button" data-testid="auth-social-button" />
  ),
}));

vi.mock("@/components/auth/auth-submit-button", () => ({
  AuthSubmitButton: ({ children }: { children: React.ReactNode }) => (
    <button type="button" data-testid="auth-submit-button">
      {children}
    </button>
  ),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({
    userId: null,
    sessionId: null,
    getToken: vi.fn().mockResolvedValue(null),
  }),
  currentUser: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/convex/_generated/api", () => ({
  api: {
    sites: {
      listForCurrentUser: "sites:listForCurrentUser",
      getBySlug: "sites:getBySlug",
      update: "sites:update",
      remove: "sites:remove",
      regenerateApiKey: "sites:regenerateApiKey",
      regeneratePublishableKey: "sites:regeneratePublishableKey",
      regeneratePreviewSecret: "sites:regeneratePreviewSecret",
    },
    contentTypes: {
      listBySite: "contentTypes:listBySite",
      getBySlug: "contentTypes:getBySlug",
      create: "contentTypes:create",
      update: "contentTypes:update",
      remove: "contentTypes:remove",
    },
    contentEntries: {
      listBySite: "contentEntries:listBySite",
      listByType: "contentEntries:listByType",
      create: "contentEntries:create",
      update: "contentEntries:update",
      publish: "contentEntries:publish",
      unpublish: "contentEntries:unpublish",
      remove: "contentEntries:remove",
    },
    contentEntryRoutes: {
      listForEntry: "contentEntryRoutes:listForEntry",
      addManual: "contentEntryRoutes:addManual",
      select: "contentEntryRoutes:select",
      remove: "contentEntryRoutes:remove",
    },
    assets: {
      listBySite: "assets:listBySite",
      generateUploadUrl: "assets:generateUploadUrl",
      create: "assets:create",
      findByChecksum: "assets:findByChecksum",
    },
    shopify: {
      listProducts: "shopify:listProducts",
      testShopifyConnection: "shopify:testShopifyConnection",
      syncProducts: "shopify:syncProducts",
    },
  },
}));

// Mock lucide-react icons used by dashboard pages
vi.mock("lucide-react", () => {
  const stub = (name: string) => (props: Record<string, unknown>) => (
    <svg data-testid={`icon-${name}`} {...props} />
  );
  return {
    Plus: stub("Plus"),
    ArrowRight: stub("ArrowRight"),
    Files: stub("Files"),
    FileText: stub("FileText"),
    Image: stub("Image"),
    Store: stub("Store"),
    Trash2: stub("Trash2"),
    Globe: stub("Globe"),
    Eye: stub("Eye"),
    EyeOff: stub("EyeOff"),
    Check: stub("Check"),
    Copy: stub("Copy"),
    RefreshCw: stub("RefreshCw"),
    CheckCircle: stub("CheckCircle"),
    XCircle: stub("XCircle"),
    Search: stub("Search"),
    Settings: stub("Settings"),
    ArrowUpDown: stub("ArrowUpDown"),
    GripVertical: stub("GripVertical"),
    Monitor: stub("Monitor"),
    Moon: stub("Moon"),
    Sun: stub("Sun"),
    MousePointerClick: stub("MousePointerClick"),
    Save: stub("Save"),
    Upload: stub("Upload"),
    Terminal: stub("Terminal"),
    Code: stub("Code"),
  };
});

// Mock complex child components that are not under test
vi.mock("@/components/onboarding/onboarding-wizard", () => ({
  OnboardingWizard: (props: Record<string, unknown>) => (
    <div data-testid="onboarding-wizard" {...props} />
  ),
}));

vi.mock("@/components/sites/create-site-dialog", () => ({
  CreateSiteDialog: (props: Record<string, unknown>) => (
    <div data-testid="create-site-dialog" {...props} />
  ),
}));

vi.mock("@/components/sites/site-card", () => ({
  SiteCard: ({ site }: { site: { name: string } }) => (
    <div data-testid="site-card">{site.name}</div>
  ),
}));

vi.mock("@/components/assets/asset-grid", () => ({
  AssetGrid: () => <div data-testid="asset-grid" />,
}));

vi.mock("@/components/assets/upload-dropzone", () => ({
  UploadDropzone: () => <div data-testid="upload-dropzone" />,
}));

vi.mock("@/components/content-entries/preview-panel", () => ({
  PreviewPanel: () => <div data-testid="preview-panel" />,
}));

vi.mock("@/components/dynamic-form/dynamic-form", () => ({
  DynamicForm: () => <div data-testid="dynamic-form" />,
}));

vi.mock("@/components/content-types/content-type-form", () => ({
  ContentTypeForm: () => <div data-testid="content-type-form" />,
}));

// Mock docs components — CodeBlock is an async server component (shiki)
vi.mock("@/components/docs/code-block", () => ({
  CodeBlock: ({ code }: { code: string }) => (
    <pre data-testid="code-block">{code}</pre>
  ),
}));

vi.mock("@/components/docs/docs-callout", () => ({
  DocsCallout: ({
    children,
    title,
  }: {
    children: React.ReactNode;
    title?: string;
  }) => (
    <div data-testid="docs-callout">
      {title && <strong>{title}</strong>}
      {children}
    </div>
  ),
}));

vi.mock("@/components/docs/docs-heading", () => ({
  DocsHeading: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="docs-heading">{children}</h2>
  ),
}));

vi.mock("@/components/docs/docs-step", () => ({
  DocsStep: ({
    children,
    title,
  }: {
    children: React.ReactNode;
    title: string;
  }) => (
    <div data-testid="docs-step">
      <strong>{title}</strong>
      {children}
    </div>
  ),
}));

vi.mock("@/components/docs/field-type-card", () => ({
  FieldTypeCard: ({ name }: { name: string }) => (
    <div data-testid="field-type-card">{name}</div>
  ),
}));

// Mock ScrollSections (wraps all marketing beat sections)
vi.mock("@/components/marketing/scroll-sections", () => ({
  ScrollSections: () => (
    <>
      <div data-testid="hero-section" />
      <div data-testid="features-section" />
      <div data-testid="how-it-works-section" />
      <div data-testid="cta-section" />
    </>
  ),
}));

// Keep individual marketing mocks for any direct imports
vi.mock("@/components/marketing/hero-section", () => ({
  HeroSection: () => <div data-testid="hero-section">Hero</div>,
}));

vi.mock("@/components/marketing/features-section", () => ({
  FeaturesSection: () => <div data-testid="features-section">Features</div>,
}));

vi.mock("@/components/marketing/how-it-works-section", () => ({
  HowItWorksSection: () => (
    <div data-testid="how-it-works-section">How It Works</div>
  ),
}));

vi.mock("@/components/marketing/cta-section", () => ({
  CtaSection: () => <div data-testid="cta-section">CTA</div>,
}));

vi.mock("@/components/marketing/footer", () => ({
  Footer: () => <div data-testid="footer">Footer</div>,
}));

vi.mock("@/components/marketing/navbar", () => ({
  Navbar: () => <div data-testid="navbar">Navbar</div>,
}));

// Mock copy-to-clipboard hook
vi.mock("@/hooks/use-copy-to-clipboard", () => ({
  useCopyToClipboard: () => ({
    copied: false,
    copy: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Common beforeEach
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockUseQuery.mockReturnValue(undefined);
  mockUseMutation.mockReturnValue(vi.fn());
  mockUseAction.mockReturnValue(vi.fn());
  mockUseParams.mockReturnValue({});
  mockUseRouter.mockReturnValue(mockRouterInstance);
});

// ---------------------------------------------------------------------------
// Shared mock data
// ---------------------------------------------------------------------------

const mockSite = {
  _id: "site1",
  name: "Test Site",
  slug: "test-site",
  apiKey: "nm_test_key_123",
  previewSecret: "ps_test_secret_123",
  previewUrl: null,
  shopifyDomain: null,
  shopifyToken: null,
  shopifyLastSyncAt: null,
};

// ===========================================================================
// 1. Landing Page  app/page.tsx
// ===========================================================================

describe("LandingPage (app/page.tsx)", () => {
  it("renders without crashing and shows marketing sections", async () => {
    const { default: LandingPage } = await import("@/app/page");
    render(<LandingPage />);
    expect(screen.getByTestId("navbar")).toBeInTheDocument();
    expect(screen.getByTestId("hero-section")).toBeInTheDocument();
    expect(screen.getByTestId("features-section")).toBeInTheDocument();
    expect(screen.getByTestId("how-it-works-section")).toBeInTheDocument();
    expect(screen.getByTestId("cta-section")).toBeInTheDocument();
  });
});

// ===========================================================================
// 2. Auth Pages
// ===========================================================================

describe("SignInPage (app/(auth)/sign-in)", () => {
  it("renders without crashing and shows the Clerk SignIn component", async () => {
    const { default: SignInPage } = await import(
      "@/app/(auth)/sign-in/[[...sign-in]]/page"
    );
    render(<SignInPage />);
    expect(screen.getByTestId("clerk-sign-in")).toBeInTheDocument();
  });
});

describe("SignUpPage (app/(auth)/sign-up)", () => {
  it("renders without crashing and shows the Clerk SignUp component", async () => {
    const { default: SignUpPage } = await import(
      "@/app/(auth)/sign-up/[[...sign-up]]/page"
    );
    render(<SignUpPage />);
    expect(screen.getByTestId("clerk-sign-up")).toBeInTheDocument();
  });
});

// ===========================================================================
// 3. Dashboard Home  app/(dashboard)/dashboard/page.tsx
// ===========================================================================

describe("DashboardPage (app/(dashboard)/dashboard)", () => {
  it("renders loading state when sites are undefined", async () => {
    const { default: DashboardPage } = await import(
      "@/app/(dashboard)/dashboard/page"
    );
    mockUseQuery.mockReturnValue(undefined);
    const { container } = render(<DashboardPage />);
    // While sites are undefined, showWizard stays null so the component
    // renders skeletons or empty content — key: no crash
    expect(container).toBeTruthy();
  });

  it("renders 'Your Sites' heading when sites list is returned", async () => {
    const { default: DashboardPage } = await import(
      "@/app/(dashboard)/dashboard/page"
    );
    // Dismiss onboarding wizard via localStorage
    Storage.prototype.getItem = vi.fn().mockReturnValue("true");
    mockUseQuery.mockReturnValue([]);
    render(<DashboardPage />);
    expect(screen.getByText("Your Sites")).toBeInTheDocument();
  });

  it("renders site cards when sites exist", async () => {
    const { default: DashboardPage } = await import(
      "@/app/(dashboard)/dashboard/page"
    );
    Storage.prototype.getItem = vi.fn().mockReturnValue("true");
    const mockSites = [
      { _id: "s1", name: "My Site", slug: "my-site" },
      { _id: "s2", name: "Other Site", slug: "other-site" },
    ];
    mockUseQuery.mockReturnValue(mockSites);
    render(<DashboardPage />);
    expect(screen.getByText("Your Sites")).toBeInTheDocument();
    expect(screen.getAllByTestId("site-card")).toHaveLength(2);
  });
});

// ===========================================================================
// 4. Site Overview  app/(dashboard)/sites/[siteSlug]/page.tsx
// ===========================================================================

describe("SiteOverviewPage (app/(dashboard)/sites/[siteSlug])", () => {
  beforeEach(() => {
    mockUseParams.mockReturnValue({ siteSlug: "test-site" });
  });

  it("renders null when site is not yet loaded", async () => {
    const { default: SiteOverviewPage } = await import(
      "@/app/(dashboard)/sites/[siteSlug]/page"
    );
    mockUseQuery.mockReturnValue(undefined);
    const { container } = render(<SiteOverviewPage />);
    expect(container.innerHTML).toBe("");
  });

  it("renders stat cards when site is loaded", async () => {
    const { default: SiteOverviewPage } = await import(
      "@/app/(dashboard)/sites/[siteSlug]/page"
    );
    // useSite -> getBySlug returns site first; then other queries
    mockUseQuery
      .mockReturnValueOnce(mockSite) // useSite -> api.sites.getBySlug
      .mockReturnValueOnce([]) // contentTypes
      .mockReturnValueOnce([]) // entries
      .mockReturnValueOnce([]); // assets
    render(<SiteOverviewPage />);
    expect(screen.getByText("Content Types")).toBeInTheDocument();
    expect(screen.getByText("Entries")).toBeInTheDocument();
    expect(screen.getByText("Assets")).toBeInTheDocument();
    expect(screen.getByText("Quick Actions")).toBeInTheDocument();
  });
});

// ===========================================================================
// 5. Content Page  app/(dashboard)/sites/[siteSlug]/content/page.tsx
// ===========================================================================

describe("ContentPage (app/(dashboard)/sites/[siteSlug]/content)", () => {
  beforeEach(() => {
    mockUseParams.mockReturnValue({ siteSlug: "test-site" });
  });

  it("renders heading", async () => {
    const { default: ContentPage } = await import(
      "@/app/(dashboard)/sites/[siteSlug]/content/page"
    );
    mockUseQuery.mockReturnValueOnce(mockSite).mockReturnValueOnce([]);
    render(<ContentPage />);
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("shows empty state when no content types exist", async () => {
    const { default: ContentPage } = await import(
      "@/app/(dashboard)/sites/[siteSlug]/content/page"
    );
    mockUseQuery.mockReturnValueOnce(mockSite).mockReturnValueOnce([]);
    render(<ContentPage />);
    expect(screen.getByText("No content types")).toBeInTheDocument();
  });

  it("renders uniform-height content tiles with clamped descriptions", async () => {
    const { default: ContentPage } = await import(
      "@/app/(dashboard)/sites/[siteSlug]/content/page"
    );
    const mockContentTypes = [
      {
        _id: "ct1",
        name: "Hero Slideshow",
        slug: "hero-slideshow",
        fields: Array.from({ length: 17 }, (_, index) => ({
          name: `field-${index + 1}`,
        })),
        description:
          "Quick-flashing images that provide vibe, brand identity, and a glimpse into merchant offerings with enough extra copy to force wrapping in the card description.",
      },
      {
        _id: "ct2",
        name: "Featured Products",
        slug: "featured-products",
        fields: Array.from({ length: 3 }, (_, index) => ({
          name: `field-${index + 1}`,
        })),
        description: "Products to feature on homepage.",
      },
    ];
    const mockEntries = [
      {
        _id: "entry-1",
        contentTypeId: "ct1",
        status: "published",
      },
      {
        _id: "entry-2",
        contentTypeId: "ct1",
        status: "draft",
      },
    ];

    mockUseQuery
      .mockReturnValueOnce(mockSite)
      .mockReturnValueOnce(mockContentTypes)
      .mockReturnValueOnce(mockEntries);

    render(<ContentPage />);

    const heroLink = screen.getByRole("link", { name: /Hero Slideshow/i });
    expect(heroLink).toHaveClass("block", "h-full");

    const heroCard = heroLink.querySelector('[data-slot="card"]');
    expect(heroCard).toHaveClass("h-[15rem]");

    const heroDescription = screen.getByText(/Quick-flashing images/i);
    expect(heroDescription).toHaveClass("line-clamp-4");

    const featuredLink = screen.getByRole("link", {
      name: /Featured Products/i,
    });
    expect(featuredLink).toHaveClass("block", "h-full");

    const featuredCard = featuredLink.querySelector('[data-slot="card"]');
    expect(featuredCard).toHaveClass("h-[15rem]");
  });

  it("does not render fragment-only schemas in the content grid", async () => {
    const { default: ContentPage } = await import(
      "@/app/(dashboard)/sites/[siteSlug]/content/page"
    );

    mockUseQuery
      .mockReturnValueOnce(mockSite)
      .mockReturnValueOnce([
        {
          _id: "fragment-1",
          name: "Shared Hero",
          slug: "shared-hero",
          kind: "fragment",
          fields: [],
        },
        {
          _id: "template-1",
          name: "Homepage",
          slug: "homepage",
          kind: "template",
          mode: "collection",
          fields: [],
        },
      ])
      .mockReturnValueOnce([]);

    render(<ContentPage />);

    expect(screen.getByText("Homepage")).toBeInTheDocument();
    expect(screen.queryByText("Shared Hero")).not.toBeInTheDocument();
  });
});

// ===========================================================================
// 6. Entries List  content/[typeSlug]/page.tsx
// ===========================================================================

describe("EntriesListPage (content/[typeSlug])", () => {
  beforeEach(() => {
    mockUseParams.mockReturnValue({
      siteSlug: "test-site",
      typeSlug: "blog-posts",
    });
  });

  it("renders null when site is not loaded", async () => {
    const { default: EntriesListPage } = await import(
      "@/app/(dashboard)/sites/[siteSlug]/content/[typeSlug]/page"
    );
    mockUseQuery.mockReturnValue(undefined);
    const { container } = render(<EntriesListPage />);
    expect(container.innerHTML).toBe("");
  });

  it("shows 'Content type not found' when contentType is null", async () => {
    const { default: EntriesListPage } = await import(
      "@/app/(dashboard)/sites/[siteSlug]/content/[typeSlug]/page"
    );
    mockUseQuery
      .mockReturnValueOnce(mockSite) // useSite
      .mockReturnValueOnce(null) // contentType = null
      .mockReturnValueOnce(undefined); // entries
    render(<EntriesListPage />);
    expect(screen.getByText("Content type not found")).toBeInTheDocument();
  });

  it("renders content type name and New Entry button", async () => {
    const { default: EntriesListPage } = await import(
      "@/app/(dashboard)/sites/[siteSlug]/content/[typeSlug]/page"
    );
    const mockContentType = {
      _id: "ct1",
      name: "Blog Posts",
      slug: "blog-posts",
      fields: [],
    };
    mockUseQuery
      .mockReturnValueOnce(mockSite)
      .mockReturnValueOnce(mockContentType)
      .mockReturnValueOnce([]);
    render(<EntriesListPage />);
    expect(screen.getByText("Blog Posts")).toBeInTheDocument();
    expect(screen.getAllByText("New Entry").length).toBeGreaterThan(0);
  });

  it("redirects singleton templates to the direct authoring view", async () => {
    const { default: EntriesListPage } = await import(
      "@/app/(dashboard)/sites/[siteSlug]/content/[typeSlug]/page"
    );
    const singletonTemplate = {
      _id: "ct1",
      name: "Site Settings",
      slug: "site-settings",
      kind: "template",
      mode: "singleton",
      fields: [],
    };

    mockUseQuery
      .mockReturnValueOnce(mockSite)
      .mockReturnValueOnce(singletonTemplate)
      .mockReturnValueOnce([
        {
          _id: "entry-1",
          slug: "site-settings",
          title: "Site Settings",
          status: "draft",
          updatedAt: Date.now(),
        },
      ]);

    render(<EntriesListPage />);

    expect(mockRouterInstance.replace).toHaveBeenCalledWith(
      "/sites/test-site/content/blog-posts/site-settings",
    );
  });
});

// ===========================================================================
// 7. Edit Entry  content/[typeSlug]/[entrySlug]/page.tsx
// ===========================================================================

describe("EditEntryPage (content/[typeSlug]/[entrySlug])", () => {
  beforeEach(() => {
    mockUseParams.mockReturnValue({
      siteSlug: "test-site",
      typeSlug: "blog-posts",
      entrySlug: "hello-world",
    });
  });

  it("renders null when site is not loaded", async () => {
    const { default: EditEntryPage } = await import(
      "@/app/(dashboard)/sites/[siteSlug]/content/[typeSlug]/[entrySlug]/page"
    );
    mockUseQuery.mockReturnValue(undefined);
    const { container } = render(<EditEntryPage />);
    expect(container.innerHTML).toBe("");
  });

  it("shows 'Entry not found' when entry does not exist", async () => {
    const { default: EditEntryPage } = await import(
      "@/app/(dashboard)/sites/[siteSlug]/content/[typeSlug]/[entrySlug]/page"
    );
    const mockContentType = {
      _id: "ct1",
      name: "Blog Posts",
      slug: "blog-posts",
      fields: [],
    };
    mockUseQuery
      .mockReturnValueOnce(mockSite) // useSite
      .mockReturnValueOnce(mockContentType) // contentType
      .mockReturnValueOnce([]) // schema definitions
      .mockReturnValueOnce([]); // entries (empty = no matching entry)
    render(<EditEntryPage />);
    expect(screen.getByText("Entry not found")).toBeInTheDocument();
  });

  it("renders edit form when entry exists", async () => {
    const { default: EditEntryPage } = await import(
      "@/app/(dashboard)/sites/[siteSlug]/content/[typeSlug]/[entrySlug]/page"
    );
    const mockContentType = {
      _id: "ct1",
      name: "Blog Posts",
      slug: "blog-posts",
      fields: [],
    };
    const mockEntries = [
      {
        _id: "e1",
        title: "Hello World",
        slug: "hello-world",
        status: "draft",
        draft: {},
        updatedAt: Date.now(),
      },
    ];
    // useQuery is called multiple times across re-renders.
    // Use mockImplementation keyed on the query reference string for stability.
    mockUseQuery.mockImplementation((ref: string) => {
      if (ref === "sites:getBySlug") return mockSite;
      if (ref === "contentTypes:getBySlug") return mockContentType;
      if (ref === "contentEntries:listByType") return mockEntries;
      return undefined;
    });
    render(<EditEntryPage />);
    expect(screen.getByText("Edit: Hello World")).toBeInTheDocument();
    expect(screen.getByText("Save Draft")).toBeInTheDocument();
  });

  it("keeps publish actions available for published entries with pending draft changes", async () => {
    const { default: EditEntryPage } = await import(
      "@/app/(dashboard)/sites/[siteSlug]/content/[typeSlug]/[entrySlug]/page"
    );
    const mockContentType = {
      _id: "ct1",
      name: "Blog Posts",
      slug: "blog-posts",
      fields: [],
    };
    const mockEntries = [
      {
        _id: "e1",
        title: "Hello World",
        slug: "hello-world",
        status: "published",
        draft: { body: "Draft body" },
        published: { body: "Published body" },
        updatedAt: Date.now(),
      },
    ];

    mockUseQuery.mockImplementation((ref: string) => {
      if (ref === "sites:getBySlug") return mockSite;
      if (ref === "contentTypes:getBySlug") return mockContentType;
      if (ref === "contentEntries:listByType") return mockEntries;
      return undefined;
    });

    render(<EditEntryPage />);

    expect(
      screen.getByRole("button", { name: "Save & Publish" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Unpublish" }),
    ).not.toBeInTheDocument();
  });
});

// ===========================================================================
// 8. New Entry  content/[typeSlug]/new/page.tsx
// ===========================================================================

describe("NewEntryPage (content/[typeSlug]/new)", () => {
  beforeEach(() => {
    mockUseParams.mockReturnValue({
      siteSlug: "test-site",
      typeSlug: "blog-posts",
    });
  });

  it("renders null when site is not loaded", async () => {
    const { default: NewEntryPage } = await import(
      "@/app/(dashboard)/sites/[siteSlug]/content/[typeSlug]/new/page"
    );
    mockUseQuery.mockReturnValue(undefined);
    const { container } = render(<NewEntryPage />);
    expect(container.innerHTML).toBe("");
  });

  it("shows 'Content type not found.' when contentType is null", async () => {
    const { default: NewEntryPage } = await import(
      "@/app/(dashboard)/sites/[siteSlug]/content/[typeSlug]/new/page"
    );
    mockUseQuery.mockReturnValueOnce(mockSite).mockReturnValueOnce(null);
    render(<NewEntryPage />);
    expect(screen.getByText("Content type not found.")).toBeInTheDocument();
  });

  it("renders form with heading when content type is loaded", async () => {
    const { default: NewEntryPage } = await import(
      "@/app/(dashboard)/sites/[siteSlug]/content/[typeSlug]/new/page"
    );
    const mockContentType = {
      _id: "ct1",
      name: "Blog Posts",
      slug: "blog-posts",
      fields: [],
    };
    mockUseQuery
      .mockReturnValueOnce(mockSite)
      .mockReturnValueOnce(mockContentType);
    render(<NewEntryPage />);
    expect(screen.getByText("New Blog Posts")).toBeInTheDocument();
    expect(screen.getByText("Create Entry")).toBeInTheDocument();
  });
});

// ===========================================================================
// 9. Media Library  media/page.tsx
// ===========================================================================

describe("MediaPage (app/(dashboard)/sites/[siteSlug]/media)", () => {
  beforeEach(() => {
    mockUseParams.mockReturnValue({ siteSlug: "test-site" });
  });

  it("renders null when site is not loaded", async () => {
    const { default: MediaPage } = await import(
      "@/app/(dashboard)/sites/[siteSlug]/media/page"
    );
    mockUseQuery.mockReturnValue(undefined);
    const { container } = render(<MediaPage />);
    expect(container.innerHTML).toBe("");
  });

  it("renders heading when site is loaded", async () => {
    const { default: MediaPage } = await import(
      "@/app/(dashboard)/sites/[siteSlug]/media/page"
    );
    mockUseQuery.mockReturnValueOnce(mockSite).mockReturnValueOnce([]);
    render(<MediaPage />);
    expect(screen.getByText("Media Library")).toBeInTheDocument();
    expect(screen.getByTestId("upload-dropzone")).toBeInTheDocument();
  });
});

// ===========================================================================
// 10. Schemas List  schemas/page.tsx
// ===========================================================================

describe("SchemasPage (app/(dashboard)/sites/[siteSlug]/schemas)", () => {
  beforeEach(() => {
    mockUseParams.mockReturnValue({ siteSlug: "test-site" });
  });

  it("renders heading and New Schema button", async () => {
    const { default: SchemasPage } = await import(
      "@/app/(dashboard)/sites/[siteSlug]/schemas/page"
    );
    mockUseQuery.mockReturnValueOnce(mockSite).mockReturnValueOnce([]);
    render(<SchemasPage />);
    expect(screen.getByText("Schemas")).toBeInTheDocument();
    expect(screen.getAllByText("New Schema").length).toBeGreaterThan(0);
  });

  it("shows empty state when no schemas exist", async () => {
    const { default: SchemasPage } = await import(
      "@/app/(dashboard)/sites/[siteSlug]/schemas/page"
    );
    mockUseQuery.mockReturnValueOnce(mockSite).mockReturnValueOnce([]);
    render(<SchemasPage />);
    expect(screen.getByText("No schemas yet")).toBeInTheDocument();
  });
});

// ===========================================================================
// 11. Edit Schema  schemas/[typeSlug]/page.tsx
// ===========================================================================

describe("EditSchemaPage (schemas/[typeSlug])", () => {
  beforeEach(() => {
    mockUseParams.mockReturnValue({
      siteSlug: "test-site",
      typeSlug: "blog-posts",
    });
  });

  it("renders null when site is not loaded", async () => {
    const { default: EditSchemaPage } = await import(
      "@/app/(dashboard)/sites/[siteSlug]/schemas/[typeSlug]/page"
    );
    mockUseQuery.mockReturnValue(undefined);
    const { container } = render(<EditSchemaPage />);
    expect(container.innerHTML).toBe("");
  });

  it("shows 'Schema not found' when contentType is null", async () => {
    const { default: EditSchemaPage } = await import(
      "@/app/(dashboard)/sites/[siteSlug]/schemas/[typeSlug]/page"
    );
    mockUseQuery.mockReturnValueOnce(mockSite).mockReturnValueOnce(null);
    render(<EditSchemaPage />);
    expect(screen.getByText("Schema not found")).toBeInTheDocument();
  });
});

// ===========================================================================
// 12. New Schema  schemas/new/page.tsx
// ===========================================================================

describe("NewSchemaPage (schemas/new)", () => {
  beforeEach(() => {
    mockUseParams.mockReturnValue({ siteSlug: "test-site" });
  });

  it("renders null when site is not loaded", async () => {
    const { default: NewSchemaPage } = await import(
      "@/app/(dashboard)/sites/[siteSlug]/schemas/new/page"
    );
    mockUseQuery.mockReturnValue(undefined);
    const { container } = render(<NewSchemaPage />);
    expect(container.innerHTML).toBe("");
  });

  it("renders heading when site is loaded", async () => {
    const { default: NewSchemaPage } = await import(
      "@/app/(dashboard)/sites/[siteSlug]/schemas/new/page"
    );
    mockUseQuery.mockReturnValueOnce(mockSite);
    render(<NewSchemaPage />);
    expect(screen.getByText("New Schema")).toBeInTheDocument();
  });
});

// ===========================================================================
// 13. Site Settings  settings/page.tsx
// ===========================================================================

describe("SiteSettingsPage (settings)", () => {
  beforeEach(() => {
    mockUseParams.mockReturnValue({ siteSlug: "test-site" });
  });

  it("renders null when site is not loaded", async () => {
    const { default: SiteSettingsPage } = await import(
      "@/app/(dashboard)/sites/[siteSlug]/settings/page"
    );
    mockUseQuery.mockReturnValue(undefined);
    const { container } = render(<SiteSettingsPage />);
    expect(container.innerHTML).toBe("");
  });

  it("renders settings cards when site is loaded", async () => {
    const { default: SiteSettingsPage } = await import(
      "@/app/(dashboard)/sites/[siteSlug]/settings/page"
    );
    mockUseQuery.mockReturnValue(mockSite);
    render(<SiteSettingsPage />);
    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByText("Secret Key")).toBeInTheDocument();
    expect(screen.getByText("Preview Secret")).toBeInTheDocument();
    expect(screen.getByText("Danger Zone")).toBeInTheDocument();
  });
});

// ===========================================================================
// 14. Shopify  shopify/page.tsx
// ===========================================================================

describe("ShopifyPage (shopify)", () => {
  beforeEach(() => {
    mockUseParams.mockReturnValue({ siteSlug: "test-site" });
  });

  it("renders null when site is not loaded", async () => {
    const { default: ShopifyPage } = await import(
      "@/app/(dashboard)/sites/[siteSlug]/shopify/page"
    );
    mockUseQuery.mockReturnValue(undefined);
    const { container } = render(<ShopifyPage />);
    expect(container.innerHTML).toBe("");
  });

  it("renders Shopify Connection card when site is loaded", async () => {
    const { default: ShopifyPage } = await import(
      "@/app/(dashboard)/sites/[siteSlug]/shopify/page"
    );
    mockUseQuery.mockReturnValue(mockSite);
    render(<ShopifyPage />);
    expect(screen.getByText("Shopify Connection")).toBeInTheDocument();
    expect(screen.getByText("Test Connection")).toBeInTheDocument();
  });
});

// ===========================================================================
// 15. Docs Index  app/(docs)/docs/page.tsx   (redirects)
// ===========================================================================

describe("DocsPage (app/(docs)/docs)", () => {
  it("calls redirect to /docs/getting-started", async () => {
    const { default: DocsPage } = await import("@/app/(docs)/docs/page");
    DocsPage();
    expect(mockRedirect).toHaveBeenCalledWith("/docs/getting-started");
  });
});

// ===========================================================================
// 16. Docs: Getting Started
// ===========================================================================

describe("GettingStartedPage (docs/getting-started)", () => {
  it("renders the heading", async () => {
    const { default: GettingStartedPage } = await import(
      "@/app/(docs)/docs/getting-started/page"
    );
    render(<GettingStartedPage />);
    expect(screen.getByText("Getting Started")).toBeInTheDocument();
  });

  it("renders doc steps", async () => {
    const { default: GettingStartedPage } = await import(
      "@/app/(docs)/docs/getting-started/page"
    );
    render(<GettingStartedPage />);
    expect(screen.getAllByTestId("docs-step").length).toBeGreaterThan(0);
  });
});

// ===========================================================================
// 17. Docs: API Reference
// ===========================================================================

describe("ApiReferencePage (docs/api)", () => {
  it("renders the heading", async () => {
    const { default: ApiReferencePage } = await import(
      "@/app/(docs)/docs/api/page"
    );
    render(<ApiReferencePage />);
    expect(screen.getByText("API Reference")).toBeInTheDocument();
  });

  it("renders code blocks", async () => {
    const { default: ApiReferencePage } = await import(
      "@/app/(docs)/docs/api/page"
    );
    render(<ApiReferencePage />);
    expect(screen.getAllByTestId("code-block").length).toBeGreaterThan(0);
  });
});

// ===========================================================================
// 18. Docs: Field Types
// ===========================================================================

describe("FieldTypesPage (docs/field-types)", () => {
  it("renders the heading", async () => {
    const { default: FieldTypesPage } = await import(
      "@/app/(docs)/docs/field-types/page"
    );
    render(<FieldTypesPage />);
    expect(screen.getByText("Field Types")).toBeInTheDocument();
  });

  it("renders field type cards", async () => {
    const { default: FieldTypesPage } = await import(
      "@/app/(docs)/docs/field-types/page"
    );
    render(<FieldTypesPage />);
    expect(screen.getAllByTestId("field-type-card").length).toBeGreaterThan(0);
  });
});

// ===========================================================================
// 19. Docs: Preview Mode
// ===========================================================================

describe("PreviewPage (docs/preview)", () => {
  it("renders the heading", async () => {
    const { default: PreviewPage } = await import(
      "@/app/(docs)/docs/preview/page"
    );
    render(<PreviewPage />);
    expect(screen.getByText("Preview Mode")).toBeInTheDocument();
  });
});

// ===========================================================================
// 20. Docs: CLI & Schema as Code
// ===========================================================================

describe("CliPage (docs/cli)", () => {
  it("renders the heading", async () => {
    const { default: CliPage } = await import("@/app/(docs)/docs/cli/page");
    render(<CliPage />);
    expect(screen.getByText("CLI & Schema as Code")).toBeInTheDocument();
  });
});

// ===========================================================================
// 21. Docs: SDK Usage
// ===========================================================================

describe("SdkPage (docs/sdk)", () => {
  it("renders the heading", async () => {
    const { default: SdkPage } = await import("@/app/(docs)/docs/sdk/page");
    render(<SdkPage />);
    expect(screen.getByText("SDK Usage")).toBeInTheDocument();
  });
});

// ===========================================================================
// 21. Docs: Shopify Integration
// ===========================================================================

describe("ShopifyDocsPage (docs/shopify)", () => {
  it("renders the heading", async () => {
    const { default: ShopifyDocsPage } = await import(
      "@/app/(docs)/docs/shopify/page"
    );
    render(<ShopifyDocsPage />);
    expect(screen.getByText("Shopify Integration")).toBeInTheDocument();
  });
});
