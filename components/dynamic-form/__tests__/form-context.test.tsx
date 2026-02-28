import { render, screen } from "@testing-library/react";
import type { Id } from "@/convex/_generated/dataModel";
import { FormProvider, useFormContext } from "../form-context";

function ConsumerComponent() {
  const { siteId } = useFormContext();
  return <div data-testid="site-id">{siteId ?? "null"}</div>;
}

describe("FormProvider", () => {
  it("provides siteId to children via context", () => {
    const fakeSiteId = "site123" as Id<"sites">;
    render(
      <FormProvider siteId={fakeSiteId}>
        <ConsumerComponent />
      </FormProvider>,
    );
    expect(screen.getByTestId("site-id")).toHaveTextContent("site123");
  });

  it("renders children", () => {
    const fakeSiteId = "site456" as Id<"sites">;
    render(
      <FormProvider siteId={fakeSiteId}>
        <span>child content</span>
      </FormProvider>,
    );
    expect(screen.getByText("child content")).toBeInTheDocument();
  });
});

describe("useFormContext", () => {
  it("returns default siteId of null when used outside provider", () => {
    render(<ConsumerComponent />);
    expect(screen.getByTestId("site-id")).toHaveTextContent("null");
  });
});
