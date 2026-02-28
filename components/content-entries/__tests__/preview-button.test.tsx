import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PreviewButton } from "../preview-button";

vi.mock("lucide-react", () => ({
  ExternalLink: (props: Record<string, unknown>) => (
    <span data-testid="external-link-icon" {...props} />
  ),
}));

const defaultProps = {
  previewSecret: "test-secret",
  entrySlug: "my-entry",
  contentTypeSlug: "blog-post",
};

describe("PreviewButton", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders "Preview" text', () => {
    render(<PreviewButton {...defaultProps} />);
    expect(screen.getByText("Preview")).toBeInTheDocument();
  });

  it("has an ExternalLink icon", () => {
    render(<PreviewButton {...defaultProps} />);
    expect(screen.getByTestId("external-link-icon")).toBeInTheDocument();
  });

  it("button is disabled when previewUrl is undefined", () => {
    render(<PreviewButton {...defaultProps} />);
    const button = screen.getByRole("button", { name: /preview/i });
    expect(button).toBeDisabled();
  });

  it("button is enabled when previewUrl is provided", () => {
    render(
      <PreviewButton {...defaultProps} previewUrl="https://example.com" />,
    );
    const button = screen.getByRole("button", { name: /preview/i });
    expect(button).not.toBeDisabled();
  });

  it("opens window with correct URL and query params on click", async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(
      <PreviewButton
        {...defaultProps}
        previewUrl="https://example.com/preview"
      />,
    );

    const button = screen.getByRole("button", { name: /preview/i });
    await user.click(button);

    expect(openSpy).toHaveBeenCalledOnce();
    const calledUrl = openSpy.mock.calls[0][0] as string;
    const url = new URL(calledUrl);
    expect(url.origin + url.pathname).toBe("https://example.com/preview");
    expect(url.searchParams.get("preview")).toBe("true");
    expect(url.searchParams.get("secret")).toBe("test-secret");
    expect(url.searchParams.get("slug")).toBe("my-entry");
    expect(url.searchParams.get("type")).toBe("blog-post");
    expect(openSpy.mock.calls[0][1]).toBe("_blank");
  });

  it("URL includes preview=true, secret, slug, and type query parameters", async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(
      <PreviewButton
        previewUrl="https://mysite.com/api/preview"
        previewSecret="s3cret-key"
        entrySlug="hello-world"
        contentTypeSlug="article"
      />,
    );

    await user.click(screen.getByRole("button", { name: /preview/i }));

    const calledUrl = openSpy.mock.calls[0][0] as string;
    const url = new URL(calledUrl);
    expect(url.searchParams.get("preview")).toBe("true");
    expect(url.searchParams.get("secret")).toBe("s3cret-key");
    expect(url.searchParams.get("slug")).toBe("hello-world");
    expect(url.searchParams.get("type")).toBe("article");
  });
});
