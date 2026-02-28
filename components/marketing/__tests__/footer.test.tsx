import { render, screen } from "@testing-library/react";
import { Footer } from "../footer";

describe("Footer", () => {
  it("renders the copyright text with the current year", () => {
    render(<Footer />);
    const currentYear = new Date().getFullYear().toString();
    expect(
      screen.getByText(new RegExp(`${currentYear} no-mess`)),
    ).toBeInTheDocument();
  });

  it("renders the GitHub link with target=_blank", () => {
    render(<Footer />);
    const githubLink = screen.getByText("GitHub");
    expect(githubLink).toBeInTheDocument();
    expect(githubLink).toHaveAttribute("target", "_blank");
    expect(githubLink).toHaveAttribute("href", "https://github.com/no-mess");
  });

  it("renders the GitHub link with rel=noopener noreferrer", () => {
    render(<Footer />);
    const githubLink = screen.getByText("GitHub");
    expect(githubLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders the Docs link", () => {
    render(<Footer />);
    const docsLink = screen.getByText("Docs");
    expect(docsLink).toBeInTheDocument();
    expect(docsLink.closest("a")).toHaveAttribute("href", "/docs");
  });

  it("renders the 'Built with zero bloat' text", () => {
    render(<Footer />);
    expect(screen.getByText(/Built with zero bloat/)).toBeInTheDocument();
  });
});
