import { render, screen } from "@testing-library/react";
import { DocsStep } from "../docs-step";

describe("DocsStep", () => {
  it("renders the step number", () => {
    render(
      <DocsStep number={1} title="Install dependencies">
        Run bun install
      </DocsStep>,
    );
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("renders the title", () => {
    render(
      <DocsStep number={1} title="Install dependencies">
        Run bun install
      </DocsStep>,
    );
    expect(
      screen.getByRole("heading", { name: "Install dependencies" }),
    ).toBeInTheDocument();
  });

  it("renders the title as an h3 element", () => {
    render(
      <DocsStep number={1} title="Setup Project">
        Details here
      </DocsStep>,
    );
    const heading = screen.getByRole("heading", { name: "Setup Project" });
    expect(heading.tagName).toBe("H3");
  });

  it("renders children content", () => {
    render(
      <DocsStep number={2} title="Configure">
        <p>Edit the config file</p>
      </DocsStep>,
    );
    expect(screen.getByText("Edit the config file")).toBeInTheDocument();
  });

  it("renders different step numbers", () => {
    const { rerender } = render(
      <DocsStep number={1} title="First">
        Content
      </DocsStep>,
    );
    expect(screen.getByText("1")).toBeInTheDocument();

    rerender(
      <DocsStep number={5} title="Fifth">
        Content
      </DocsStep>,
    );
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renders complex children", () => {
    render(
      <DocsStep number={3} title="Deploy">
        <code>bun run build</code>
        <span>then deploy to production</span>
      </DocsStep>,
    );
    expect(screen.getByText("bun run build")).toBeInTheDocument();
    expect(screen.getByText("then deploy to production")).toBeInTheDocument();
  });

  it("renders step number in a rounded container", () => {
    render(
      <DocsStep number={1} title="Step">
        Content
      </DocsStep>,
    );
    const numberEl = screen.getByText("1");
    expect(numberEl.className).toContain("rounded-full");
  });
});
