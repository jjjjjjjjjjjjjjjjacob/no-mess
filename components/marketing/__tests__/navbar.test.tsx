import { render, screen } from "@testing-library/react";

const { mockAuth } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mockAuth,
}));

vi.mock("@/components/palette-switcher", () => ({
  PaletteSwitcher: () => <div data-testid="palette-switcher" />,
}));

vi.mock("../mobile-nav", () => ({
  MobileNav: () => <div data-testid="mobile-nav" />,
}));

import { Navbar } from "../navbar";

// Navbar is an async server component, so we need a helper to render it
async function renderNavbar() {
  const Component = await Navbar();
  render(Component);
}

describe("Navbar", () => {
  beforeEach(() => {
    mockAuth.mockReset();
  });

  describe("brand link", () => {
    it("renders the brand link to home", async () => {
      mockAuth.mockResolvedValue({ userId: null });

      await renderNavbar();
      const brandLink = screen.getByText("NO-MESS");
      expect(brandLink).toBeInTheDocument();
      expect(brandLink.closest("a")).toHaveAttribute("href", "/");
    });
  });

  describe("Docs link", () => {
    it("renders the Docs link", async () => {
      mockAuth.mockResolvedValue({ userId: null });

      await renderNavbar();
      const docsLink = screen.getByText("DOCS");
      expect(docsLink).toBeInTheDocument();
      expect(docsLink.closest("a")).toHaveAttribute("href", "/docs");
    });
  });

  describe("when user is authenticated", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ userId: "user_123" });
    });

    it("renders the Dashboard link", async () => {
      await renderNavbar();
      const dashboardLink = screen.getByText(/DASHBOARD/);
      expect(dashboardLink).toBeInTheDocument();
      expect(dashboardLink.closest("a")).toHaveAttribute("href", "/dashboard");
    });

    it("does not render the Sign In link", async () => {
      await renderNavbar();
      expect(screen.queryByText("SIGN IN")).not.toBeInTheDocument();
    });
  });

  describe("when user is not authenticated", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ userId: null });
    });

    it("renders the Sign In link", async () => {
      await renderNavbar();
      const signInLink = screen.getByText("SIGN IN");
      expect(signInLink).toBeInTheDocument();
      expect(signInLink.closest("a")).toHaveAttribute("href", "/sign-in");
    });

    it("renders the Get Started link", async () => {
      await renderNavbar();
      const getStartedLink = screen.getByText("GET STARTED");
      expect(getStartedLink).toBeInTheDocument();
      expect(getStartedLink.closest("a")).toHaveAttribute("href", "/sign-up");
    });

    it("does not render the Dashboard link", async () => {
      await renderNavbar();
      expect(screen.queryByText(/DASHBOARD/)).not.toBeInTheDocument();
    });
  });
});
