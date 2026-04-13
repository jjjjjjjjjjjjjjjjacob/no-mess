import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ChangeEvent, ReactNode } from "react";
import { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { LiveEditPreviewPanel } from "../live-edit-preview-panel";

const mockEntryId = "entry_1" as Id<"contentEntries">;

const { mockCreateSession, mockSelectRoute, mockRoutes } = vi.hoisted(() => ({
  mockCreateSession: vi.fn(),
  mockSelectRoute: vi.fn(),
  mockRoutes: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useMutation: (fnRef: string) => {
    if (fnRef === "previewSessions:create") return mockCreateSession;
    if (fnRef === "contentEntryRoutes:select") return mockSelectRoute;
    return vi.fn();
  },
  useQuery: (fnRef: string) => {
    if (fnRef === "contentEntryRoutes:listForEntry") {
      return mockRoutes();
    }
    return undefined;
  },
}));

vi.mock("@/convex/_generated/api", () => ({
  api: {
    previewSessions: {
      create: "previewSessions:create",
    },
    contentEntryRoutes: {
      listForEntry: "contentEntryRoutes:listForEntry",
      select: "contentEntryRoutes:select",
    },
  },
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    type = "button",
    disabled,
    title,
  }: {
    children: ReactNode;
    onClick?: () => void;
    type?: "button" | "submit";
    disabled?: boolean;
    title?: string;
  }) => (
    <button type={type} onClick={onClick} disabled={disabled} title={title}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/input-group", () => ({
  InputGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  InputGroupInput: ({
    value,
    onChange,
    placeholder,
    className,
  }: {
    value?: string;
    onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    className?: string;
  }) => (
    <input
      className={className}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  ),
  InputGroupButton: ({
    children,
    type = "button",
  }: {
    children: ReactNode;
    type?: "button" | "submit";
  }) => <button type={type}>{children}</button>,
}));

vi.mock("@/components/ui/select", async () => {
  const React = await import("react");

  const SelectContext = React.createContext<(value: string) => void>(() => {});

  return {
    Select: ({
      children,
      onValueChange,
    }: {
      children: ReactNode;
      onValueChange?: (value: string) => void;
    }) => (
      <SelectContext.Provider value={onValueChange ?? (() => {})}>
        <div>{children}</div>
      </SelectContext.Provider>
    ),
    SelectTrigger: ({ children }: { children: ReactNode }) => (
      <div>{children}</div>
    ),
    SelectValue: ({ placeholder }: { placeholder?: string }) => (
      <span>{placeholder}</span>
    ),
    SelectContent: ({ children }: { children: ReactNode }) => (
      <div>{children}</div>
    ),
    SelectGroup: ({ children }: { children: ReactNode }) => (
      <div>{children}</div>
    ),
    SelectLabel: ({ children }: { children: ReactNode }) => (
      <div>{children}</div>
    ),
    SelectSeparator: () => <hr />,
    SelectItem: ({
      children,
      disabled,
      value,
    }: {
      children: ReactNode;
      disabled?: boolean;
      value: string;
    }) => {
      const onValueChange = React.useContext(SelectContext);

      return (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onValueChange(value)}
        >
          {children}
        </button>
      );
    },
  };
});

describe("LiveEditPreviewPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateSession.mockResolvedValue({
      sessionId: "sess_1",
      sessionSecret: "secret_1",
      siteBaseUrl: "http://localhost:3456",
      previewUrl: "http://localhost:3456/no-mess-preview?sid=sess_1",
    });
  });

  it("always exposes the configured preview source and auto-opens the first compatible route", async () => {
    mockRoutes.mockReturnValue([
      {
        _id: "route_1",
        url: "http://localhost:3456/products",
        source: "manual",
      },
      {
        _id: "route_2",
        url: "http://localhost:1111/products",
        source: "manual",
      },
    ]);

    render(
      <LiveEditPreviewPanel
        entryId={mockEntryId}
        previewUrl="http://localhost:3456"
        liveValues={{}}
        viewMode="draft"
        onViewModeChange={() => {}}
      />,
    );

    expect(
      await screen.findByRole("button", { name: "/no-mess-preview" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Unavailable routes")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "http://localhost:1111/products (unavailable)",
      }),
    ).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByTitle("Live edit preview")).toHaveAttribute(
        "src",
        "http://localhost:3456/products?sid=sess_1",
      );
    });
  });

  it("falls back to the configured preview when saved routes are incompatible", async () => {
    mockRoutes.mockReturnValue([
      {
        _id: "route_1",
        url: "http://localhost:9999/outdated",
        source: "manual",
      },
    ]);

    render(
      <LiveEditPreviewPanel
        entryId={mockEntryId}
        previewUrl="http://localhost:3456"
        liveValues={{}}
        viewMode="draft"
        onViewModeChange={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTitle("Live edit preview")).toHaveAttribute(
        "src",
        "http://localhost:3456/no-mess-preview?sid=sess_1",
      );
    });

    expect(
      screen.getByText(
        "1 saved route is unavailable for the current preview base.",
      ),
    ).toBeInTheDocument();
  });

  it("switches back to the configured preview when selected from the dropdown", async () => {
    const user = userEvent.setup();
    mockRoutes.mockReturnValue([
      {
        _id: "route_1",
        url: "http://localhost:3456/products",
        source: "manual",
      },
    ]);

    render(
      <LiveEditPreviewPanel
        entryId={mockEntryId}
        previewUrl="http://localhost:3456"
        liveValues={{}}
        viewMode="draft"
        onViewModeChange={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTitle("Live edit preview")).toHaveAttribute(
        "src",
        "http://localhost:3456/products?sid=sess_1",
      );
    });

    await user.click(screen.getByRole("button", { name: "/no-mess-preview" }));

    await waitFor(() => {
      expect(screen.getByTitle("Live edit preview")).toHaveAttribute(
        "src",
        "http://localhost:3456/no-mess-preview?sid=sess_1",
      );
    });
  });

  it("switches between draft and production on a saved page URL", async () => {
    const user = userEvent.setup();
    mockRoutes.mockReturnValue([
      {
        _id: "route_1",
        url: "http://localhost:3456/products",
        source: "manual",
      },
    ]);

    function Harness() {
      const [viewMode, setViewMode] = useState<"draft" | "production">("draft");

      return (
        <LiveEditPreviewPanel
          entryId={mockEntryId}
          previewUrl="http://localhost:3456"
          liveValues={{}}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      );
    }

    render(<Harness />);

    await waitFor(() => {
      expect(screen.getByTitle("Live edit preview")).toHaveAttribute(
        "src",
        "http://localhost:3456/products?sid=sess_1",
      );
    });

    await user.click(screen.getByRole("button", { name: "Production" }));

    await waitFor(() => {
      expect(screen.getByTitle("Production preview")).toHaveAttribute(
        "src",
        "http://localhost:3456/products",
      );
    });

    await user.click(screen.getByRole("button", { name: "Draft" }));

    await waitFor(() => {
      expect(screen.getByTitle("Live edit preview")).toHaveAttribute(
        "src",
        "http://localhost:3456/products?sid=sess_1",
      );
    });
  });
});
