import { render, screen } from "@testing-library/react";

beforeAll(() => {
  global.IntersectionObserver = class IntersectionObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  } as unknown as typeof globalThis.IntersectionObserver;
});

vi.mock("@/hooks/use-beat-reveal", () => ({
  useBeatReveal: () => true,
}));

import { CtaSection } from "../cta-section";

describe("CtaSection", () => {
  it("renders the heading", () => {
    render(<CtaSection />);
    expect(screen.getByText("READY TO")).toBeInTheDocument();
    expect(screen.getByText("SHIP?")).toBeInTheDocument();
  });

  it("renders the subheading", () => {
    render(<CtaSection />);
    expect(screen.getByText(/under a minute/)).toBeInTheDocument();
  });

  it("renders the GET STARTED FREE button text", () => {
    render(<CtaSection />);
    expect(screen.getByText("GET STARTED FREE")).toBeInTheDocument();
  });

  it("links the CTA button to /sign-up", () => {
    render(<CtaSection />);
    const ctaButton = screen.getByText("GET STARTED FREE");
    expect(ctaButton.closest("a")).toHaveAttribute("href", "/sign-up");
  });
});
