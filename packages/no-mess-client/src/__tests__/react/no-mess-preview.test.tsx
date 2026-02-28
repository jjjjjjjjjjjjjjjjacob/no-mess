// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UseNoMessPreviewResult } from "../../types.js";

// --- Mock the hook ---

const mockResult: UseNoMessPreviewResult = {
  entry: null,
  error: null,
  isLoading: true,
};

vi.mock("../../react/use-no-mess-preview.js", () => ({
  useNoMessPreview: vi.fn(() => mockResult),
}));

import { NoMessPreview } from "../../react/no-mess-preview.js";
import { useNoMessPreview } from "../../react/use-no-mess-preview.js";

// --- Tests ---

describe("NoMessPreview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResult.entry = null;
    mockResult.error = null;
    mockResult.isLoading = true;
  });

  it("renders loading state", () => {
    render(
      <NoMessPreview apiKey="nm_test">
        {({ isLoading }) => (isLoading ? <p>Loading...</p> : null)}
      </NoMessPreview>,
    );

    expect(screen.getByText("Loading...")).toBeDefined();
  });

  it("renders entry when available", () => {
    mockResult.entry = {
      slug: "test",
      title: "Test Entry",
      _id: "e1",
      _createdAt: 1000,
      _updatedAt: 2000,
    };
    mockResult.isLoading = false;

    render(
      <NoMessPreview apiKey="nm_test">
        {({ entry }) => (entry ? <h1>{entry.title}</h1> : null)}
      </NoMessPreview>,
    );

    expect(screen.getByText("Test Entry")).toBeDefined();
  });

  it("renders error state", () => {
    mockResult.error = new Error("Preview failed");
    mockResult.isLoading = false;

    render(
      <NoMessPreview apiKey="nm_test">
        {({ error }) => (error ? <p>{error.message}</p> : null)}
      </NoMessPreview>,
    );

    expect(screen.getByText("Preview failed")).toBeDefined();
  });

  it("passes config props to hook", () => {
    render(
      <NoMessPreview
        apiKey="nm_key"
        apiUrl="https://custom.api.com"
        adminOrigin="https://custom.admin.com"
      >
        {() => null}
      </NoMessPreview>,
    );

    expect(useNoMessPreview).toHaveBeenCalledWith({
      apiKey: "nm_key",
      apiUrl: "https://custom.api.com",
      adminOrigin: "https://custom.admin.com",
    });
  });
});
