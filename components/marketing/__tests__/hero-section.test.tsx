import { render, screen } from "@testing-library/react";
import { HeroSection } from "../hero-section";

describe("HeroSection", () => {
  it("renders the heading text", () => {
    render(<HeroSection />);
    expect(screen.getByText("HEADLESS")).toBeInTheDocument();
    expect(screen.getByText(/CMS/)).toBeInTheDocument();
    expect(screen.getByText("ZERO")).toBeInTheDocument();
    expect(screen.getByText(/BLOAT/)).toBeInTheDocument();
  });

  it("renders the code block with SDK import", () => {
    render(<HeroSection />);
    expect(screen.getByText(/@no-mess\/client/)).toBeInTheDocument();
  });

  it("shows cms.getEntries in the code example", () => {
    render(<HeroSection />);
    expect(screen.getByText("getEntries")).toBeInTheDocument();
  });

  it("does not show apiUrl in the code example", () => {
    render(<HeroSection />);
    expect(screen.queryByText(/apiUrl/)).not.toBeInTheDocument();
  });

  it("renders the START BUILDING CTA link button", () => {
    render(<HeroSection />);
    const getStartedLink = screen.getByText("START BUILDING");
    expect(getStartedLink).toBeInTheDocument();
    expect(getStartedLink.closest("a")).toHaveAttribute("href", "/sign-up");
  });

  it("renders the READ DOCS CTA link button", () => {
    render(<HeroSection />);
    const docsLink = screen.getByText(/READ DOCS/);
    expect(docsLink).toBeInTheDocument();
    expect(docsLink.closest("a")).toHaveAttribute("href", "/docs");
  });

  it("renders the subheading description", () => {
    render(<HeroSection />);
    expect(screen.getByText(/Everyone goes home happy/)).toBeInTheDocument();
  });
});
