import { render, screen } from "@testing-library/react";
import { DocsHeading } from "../docs-heading";

describe("DocsHeading", () => {
  it("renders as h2 by default", () => {
    render(<DocsHeading>Introduction</DocsHeading>);
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent("Introduction");
  });

  it("renders as h3 when specified", () => {
    render(<DocsHeading as="h3">Sub Section</DocsHeading>);
    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent("Sub Section");
  });

  it("generates a slug id for string children", () => {
    render(<DocsHeading>Getting Started</DocsHeading>);
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveAttribute("id", "getting-started");
  });

  it("generates anchor link with hash for string children", () => {
    render(<DocsHeading>Getting Started</DocsHeading>);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "#getting-started");
  });

  it("renders hash symbol in anchor link", () => {
    render(<DocsHeading>My Section</DocsHeading>);
    const link = screen.getByRole("link");
    expect(link.textContent).toContain("#");
  });

  it("does not generate id or anchor for non-string children", () => {
    render(
      <DocsHeading>
        <span>Complex child</span>
      </DocsHeading>,
    );
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).not.toHaveAttribute("id");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(<DocsHeading className="extra-class">Title</DocsHeading>);
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading.className).toContain("extra-class");
  });

  it("applies h2 styles by default", () => {
    render(<DocsHeading>Title</DocsHeading>);
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading.className).toContain("text-2xl");
  });

  it("applies h3 styles when as='h3'", () => {
    render(<DocsHeading as="h3">Title</DocsHeading>);
    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading.className).toContain("text-xl");
  });

  it("slugifies special characters correctly", () => {
    render(<DocsHeading>API Reference & Usage!</DocsHeading>);
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveAttribute("id", "api-reference-usage");
  });

  it("slugifies uppercase to lowercase", () => {
    render(<DocsHeading>Hello World</DocsHeading>);
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveAttribute("id", "hello-world");
  });

  it("strips leading and trailing hyphens from slug", () => {
    render(<DocsHeading>---Test Slug---</DocsHeading>);
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveAttribute("id", "test-slug");
  });
});
