import { render, screen } from "@testing-library/react";
import { CodeBlock } from "../code-block";

// Mock shiki so we don't need the actual library in tests
vi.mock("shiki", () => ({
  codeToHtml: vi.fn().mockResolvedValue("<pre><code>const x = 1;</code></pre>"),
}));

// Mock the CodeBlockCopy child component
vi.mock("../code-block-copy", () => ({
  CodeBlockCopy: ({ code }: { code: string }) => (
    <button type="button" data-testid="code-block-copy" data-code={code}>
      Copy
    </button>
  ),
}));

describe("CodeBlock", () => {
  it("renders the highlighted code output", async () => {
    const { container } = render(
      await CodeBlock({ code: "const x = 1;", language: "typescript" }),
    );
    expect(container.querySelector("pre")).toBeInTheDocument();
    expect(container.querySelector("code")).toBeInTheDocument();
  });

  it("renders the CodeBlockCopy component with trimmed code", async () => {
    render(await CodeBlock({ code: "  const x = 1;  " }));
    const copyBtn = screen.getByTestId("code-block-copy");
    expect(copyBtn).toHaveAttribute("data-code", "const x = 1;");
  });

  it("renders the filename when provided", async () => {
    render(
      await CodeBlock({
        code: "const x = 1;",
        filename: "example.ts",
      }),
    );
    expect(screen.getByText("example.ts")).toBeInTheDocument();
  });

  it("does not render filename div when filename is not provided", async () => {
    render(await CodeBlock({ code: "const x = 1;" }));
    expect(screen.queryByText("example.ts")).not.toBeInTheDocument();
  });

  it("applies rounded-t-none when filename is present", async () => {
    const { container } = render(
      await CodeBlock({
        code: "const x = 1;",
        filename: "test.ts",
      }),
    );
    // The code container div (second child) should have rounded-t-none
    const codeDiv = container.querySelector(".rounded-t-none");
    expect(codeDiv).toBeInTheDocument();
  });

  it("does not apply rounded-t-none when filename is absent", async () => {
    const { container } = render(await CodeBlock({ code: "const x = 1;" }));
    expect(container.querySelector(".rounded-t-none")).not.toBeInTheDocument();
  });

  it("calls codeToHtml with correct parameters", async () => {
    const { codeToHtml } = await import("shiki");
    const mockedCodeToHtml = codeToHtml as ReturnType<typeof vi.fn>;
    mockedCodeToHtml.mockClear();

    render(await CodeBlock({ code: "let y = 2;", language: "javascript" }));

    expect(mockedCodeToHtml).toHaveBeenCalledWith("let y = 2;", {
      lang: "javascript",
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
    });
  });

  it("defaults to typescript language", async () => {
    const { codeToHtml } = await import("shiki");
    const mockedCodeToHtml = codeToHtml as ReturnType<typeof vi.fn>;
    mockedCodeToHtml.mockClear();

    render(await CodeBlock({ code: "const z = 3;" }));

    expect(mockedCodeToHtml).toHaveBeenCalledWith(
      "const z = 3;",
      expect.objectContaining({ lang: "typescript" }),
    );
  });

  it("trims leading/trailing whitespace from code before processing", async () => {
    const { codeToHtml } = await import("shiki");
    const mockedCodeToHtml = codeToHtml as ReturnType<typeof vi.fn>;
    mockedCodeToHtml.mockClear();

    render(await CodeBlock({ code: "\n  const a = 1;  \n" }));

    expect(mockedCodeToHtml).toHaveBeenCalledWith(
      "const a = 1;",
      expect.objectContaining({}),
    );
  });
});
