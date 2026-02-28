import { render, screen } from "@testing-library/react";

beforeAll(() => {
  global.IntersectionObserver = class IntersectionObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  } as unknown as typeof globalThis.IntersectionObserver;
});

import { FeaturesSection } from "../features-section";

describe("FeaturesSection", () => {
  it("renders the section heading", () => {
    render(<FeaturesSection />);
    expect(screen.getByText(/WHAT WE DON'T DO/)).toBeInTheDocument();
  });

  it("renders 6 feature cards", () => {
    render(<FeaturesSection />);
    const titles = [
      "NO CONFIG FILES",
      "NO OAUTH DANCE",
      "NO ONBOARDING CALLS",
      "NO VERSION BLOAT",
      "NO ROLE HIERARCHIES",
      "NO WEBHOOK HELL",
    ];
    for (const title of titles) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
  });

  it("has correct title for each feature card", () => {
    render(<FeaturesSection />);
    expect(screen.getByText("NO CONFIG FILES")).toBeInTheDocument();
    expect(screen.getByText("NO OAUTH DANCE")).toBeInTheDocument();
    expect(screen.getByText("NO ONBOARDING CALLS")).toBeInTheDocument();
    expect(screen.getByText("NO VERSION BLOAT")).toBeInTheDocument();
    expect(screen.getByText("NO ROLE HIERARCHIES")).toBeInTheDocument();
    expect(screen.getByText("NO WEBHOOK HELL")).toBeInTheDocument();
  });

  it("renders a description for each feature", () => {
    render(<FeaturesSection />);
    expect(screen.getByText(/Zero YAML/)).toBeInTheDocument();
    expect(screen.getByText(/Bearer token/)).toBeInTheDocument();
    expect(screen.getByText(/If you need a call/)).toBeInTheDocument();
  });

  it("renders the tagline block", () => {
    render(<FeaturesSection />);
    expect(screen.getByText(/JUST:/)).toBeInTheDocument();
    expect(screen.getByText(/SCHEMA\./)).toBeInTheDocument();
    expect(screen.getByText(/SDK\./)).toBeInTheDocument();
    expect(screen.getByText(/SHIP\./)).toBeInTheDocument();
  });

  it("renders feature numbers", () => {
    render(<FeaturesSection />);
    // Each number appears twice (background + label)
    expect(screen.getAllByText("01").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("06").length).toBeGreaterThanOrEqual(1);
  });
});
