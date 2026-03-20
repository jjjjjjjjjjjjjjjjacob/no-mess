import { render } from "@testing-library/react";
import { vi } from "vitest";
import ApiPage from "@/app/(docs)/docs/api/page";
import CliPage from "@/app/(docs)/docs/cli/page";
import GettingStartedPage from "@/app/(docs)/docs/getting-started/page";
import LiveEditPage from "@/app/(docs)/docs/live-edit/page";
import PreviewPage from "@/app/(docs)/docs/preview/page";
import SdkPage from "@/app/(docs)/docs/sdk/page";
import ShopifyPage from "@/app/(docs)/docs/shopify/page";

vi.mock("@/components/docs/code-block", () => ({
  CodeBlock: ({ code, filename }: { code: string; filename?: string }) => (
    <div>
      {filename ? <div>{filename}</div> : null}
      <pre>{code}</pre>
    </div>
  ),
}));

describe("docs content", () => {
  it("keeps the CLI page aligned with draft sync behavior and filenames", () => {
    const { container } = render(<CliPage />);
    const text = container.textContent ?? "";

    expect(text).toContain("schema.ts");
    expect(text).toContain("Schemas were synced as drafts.");
    expect(text).toContain(
      "Published delivery APIs only include published schemas and published entries.",
    );
    expect(text).toContain("no-mess codegen");
    expect(text).not.toContain("no-mess.schema.ts");
    expect(text).not.toContain("diff preview");
    expect(text).not.toContain("prompts for confirmation");
  });

  it("keeps getting-started examples on the canonical env vars and runtime Next helper", () => {
    const { container } = render(<GettingStartedPage />);
    const text = container.textContent ?? "";

    expect(text).toContain("createServerNoMessClient");
    expect(text).toContain('cache: "no-store"');
    expect(text).toContain("useNoMessEditableEntry");
    expect(text).toContain("NO_MESS_API_KEY");
    expect(text).not.toContain("NO_MESS_SECRET_KEY");
  });

  it("documents the Next.js helpers, runtime fetching, and live-edit binding in the SDK page", () => {
    const { container } = render(<SdkPage />);
    const text = container.textContent ?? "";

    expect(text).toContain("createServerNoMessClient");
    expect(text).toContain("createBrowserNoMessClient");
    expect(text).toContain('cache: "no-store"');
    expect(text).toContain("useNoMessEditableEntry");
    expect(text).toContain("getShopifyHandle");
  });

  it("documents raw refs, synced data, and expansion on the Shopify page", () => {
    const { container } = render(<ShopifyPage />);
    const text = container.textContent ?? "";

    expect(text).toContain("createServerNoMessClient");
    expect(text).toContain("getShopifyHandle");
    expect(text).toContain('expand: ["shopify"]');
    expect(text).not.toContain("NO_MESS_SECRET_KEY");
  });

  it("documents deployed preview requirements and static-route caveats", () => {
    const { container } = render(<PreviewPage />);
    const text = container.textContent ?? "";

    expect(text).toContain("frame-ancestors");
    expect(text).toContain('cache: "no-store"');
    expect(text).toContain("static export");
  });

  it("documents deployed live-edit requirements for runtime routes", () => {
    const { container } = render(<LiveEditPage />);
    const text = container.textContent ?? "";

    expect(text).toContain("useNoMessEditableEntry");
    expect(text).toContain('cache: "no-store"');
    expect(text).toContain("frame-ancestors");
    expect(text).toContain("Content-Security-Policy");
    expect(text).toContain("append or merge");
  });

  it("documents fresh content reads as uncached runtime requests", () => {
    const { container } = render(<ApiPage />);
    const text = container.textContent ?? "";

    expect(text).toContain("fresh=true");
    expect(text).toContain("no-store, no-cache, must-revalidate");
  });
});
