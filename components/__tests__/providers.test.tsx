import { render, screen } from "@testing-library/react";

const { mockUseAuth, mockConvexClient } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockConvexClient: { url: "https://test.convex.cloud" },
}));

vi.mock("@clerk/nextjs", () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="clerk-provider">{children}</div>
  ),
  useAuth: mockUseAuth,
}));

vi.mock("convex/react-clerk", () => ({
  ConvexProviderWithClerk: ({
    children,
    client,
    useAuth: useAuthProp,
  }: {
    children: React.ReactNode;
    client: unknown;
    useAuth: unknown;
  }) => (
    <div
      data-testid="convex-provider"
      data-client={JSON.stringify(client)}
      data-use-auth={useAuthProp === mockUseAuth ? "correct" : "incorrect"}
    >
      {children}
    </div>
  ),
}));

vi.mock("@/lib/convex", () => ({
  convex: mockConvexClient,
}));

vi.mock("next-themes", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="theme-provider">{children}</div>
  ),
}));

import { Providers } from "../providers";

describe("Providers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children within providers", () => {
    render(
      <Providers>
        <div data-testid="child">Hello</div>
      </Providers>,
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("passes convex client to ConvexProviderWithClerk", () => {
    render(
      <Providers>
        <span>content</span>
      </Providers>,
    );

    const convexProvider = screen.getByTestId("convex-provider");
    expect(convexProvider).toHaveAttribute(
      "data-client",
      JSON.stringify(mockConvexClient),
    );
  });

  it("passes useAuth to ConvexProviderWithClerk", () => {
    render(
      <Providers>
        <span>content</span>
      </Providers>,
    );

    const convexProvider = screen.getByTestId("convex-provider");
    expect(convexProvider).toHaveAttribute("data-use-auth", "correct");
  });

  it("wraps ConvexProviderWithClerk inside ClerkProvider", () => {
    render(
      <Providers>
        <span>content</span>
      </Providers>,
    );

    const clerkProvider = screen.getByTestId("clerk-provider");
    const convexProvider = screen.getByTestId("convex-provider");

    expect(clerkProvider).toContainElement(convexProvider);
  });

  it("wraps ClerkProvider inside ThemeProvider", () => {
    render(
      <Providers>
        <span>content</span>
      </Providers>,
    );

    const themeProvider = screen.getByTestId("theme-provider");
    const clerkProvider = screen.getByTestId("clerk-provider");

    expect(themeProvider).toContainElement(clerkProvider);
  });
});
