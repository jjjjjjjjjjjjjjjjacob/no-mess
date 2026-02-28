import { render, screen } from "@testing-library/react";
import { DocsCallout } from "../docs-callout";

describe("DocsCallout", () => {
  it("renders children content", () => {
    render(<DocsCallout>Some helpful information</DocsCallout>);
    expect(screen.getByText("Some helpful information")).toBeInTheDocument();
  });

  it("renders default type label when no title is provided", () => {
    render(<DocsCallout>Content here</DocsCallout>);
    expect(screen.getByText("Info")).toBeInTheDocument();
  });

  it("renders custom title when provided", () => {
    render(<DocsCallout title="Custom Title">Content here</DocsCallout>);
    expect(screen.getByText("Custom Title")).toBeInTheDocument();
    expect(screen.queryByText("Info")).not.toBeInTheDocument();
  });

  it("renders info type label by default", () => {
    render(<DocsCallout>Content</DocsCallout>);
    expect(screen.getByText("Info")).toBeInTheDocument();
  });

  it("renders warning type label", () => {
    render(<DocsCallout type="warning">Be careful</DocsCallout>);
    expect(screen.getByText("Warning")).toBeInTheDocument();
  });

  it("renders tip type label", () => {
    render(<DocsCallout type="tip">A useful tip</DocsCallout>);
    expect(screen.getByText("Tip")).toBeInTheDocument();
  });

  it("applies info styles by default", () => {
    const { container } = render(<DocsCallout>Content</DocsCallout>);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain("border-l-primary");
  });

  it("applies warning styles", () => {
    const { container } = render(
      <DocsCallout type="warning">Content</DocsCallout>,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain("border-l-accent");
  });

  it("applies tip styles", () => {
    const { container } = render(<DocsCallout type="tip">Content</DocsCallout>);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain("border-l-muted-foreground");
  });

  it("renders complex children (JSX)", () => {
    render(
      <DocsCallout>
        <strong>Bold text</strong> and <em>italic text</em>
      </DocsCallout>,
    );
    expect(screen.getByText("Bold text")).toBeInTheDocument();
    expect(screen.getByText("italic text")).toBeInTheDocument();
  });

  it("prefers custom title over type label", () => {
    render(
      <DocsCallout type="warning" title="Important Notice">
        Content
      </DocsCallout>,
    );
    expect(screen.getByText("Important Notice")).toBeInTheDocument();
    expect(screen.queryByText("Warning")).not.toBeInTheDocument();
  });
});
