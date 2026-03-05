import { render, screen } from "@testing-library/react";

beforeAll(() => {
  global.IntersectionObserver = class IntersectionObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  } as unknown as typeof globalThis.IntersectionObserver;
});

import { HowItWorksSection } from "../how-it-works-section";

describe("HowItWorksSection", () => {
  it("renders the heading text", () => {
    render(<HowItWorksSection />);
    expect(screen.getByText("HOW IT")).toBeInTheDocument();
    expect(screen.getByText("WORKS")).toBeInTheDocument();
  });

  it("renders 3 steps", () => {
    render(<HowItWorksSection />);
    expect(screen.getByText("CREATE SITE")).toBeInTheDocument();
    expect(screen.getByText("DEFINE SCHEMA")).toBeInTheDocument();
    expect(screen.getByText("SHIP IT")).toBeInTheDocument();
  });

  it("displays the correct step numbers", () => {
    render(<HowItWorksSection />);
    // Each number appears twice (large background + small label)
    expect(screen.getAllByText("01").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("02").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("03").length).toBeGreaterThanOrEqual(1);
  });

  it("renders step 1 description", () => {
    render(<HowItWorksSection />);
    expect(
      screen.getByText(/30 seconds\. One form\. API key generated instantly/),
    ).toBeInTheDocument();
  });

  it("renders step 2 description", () => {
    render(<HowItWorksSection />);
    expect(
      screen.getByText(/Drag fields in the dashboard/),
    ).toBeInTheDocument();
  });

  it("renders step 3 description", () => {
    render(<HowItWorksSection />);
    expect(screen.getByText(/Install SDK\. Fetch content/)).toBeInTheDocument();
  });

  it("renders the install command", () => {
    render(<HowItWorksSection />);
    expect(screen.getByText(/bun add @no-mess\/client/)).toBeInTheDocument();
  });
});
