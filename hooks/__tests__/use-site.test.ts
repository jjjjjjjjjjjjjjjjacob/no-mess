import { renderHook } from "@testing-library/react";
import { vi } from "vitest";
import { useSite } from "../use-site";

vi.mock("next/navigation", () => ({
  useParams: vi.fn().mockReturnValue({}),
}));

vi.mock("convex/react", () => ({
  useQuery: vi.fn().mockReturnValue(undefined),
}));

vi.mock("@/convex/_generated/api", () => ({
  api: {
    sites: {
      getBySlug: "sites:getBySlug",
    },
  },
}));

import { useQuery } from "convex/react";
import { useParams } from "next/navigation";

const mockUseParams = useParams as ReturnType<typeof vi.fn>;
const mockUseQuery = useQuery as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockUseParams.mockReset().mockReturnValue({});
  mockUseQuery.mockReset().mockReturnValue(undefined);
});

describe("useSite", () => {
  it("should return loading state when site is undefined", () => {
    mockUseParams.mockReturnValue({ siteSlug: "my-site" });
    mockUseQuery.mockReturnValue(undefined);

    const { result } = renderHook(() => useSite());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.site).toBeUndefined();
  });

  it("should return site when query returns data", () => {
    const mockSite = { _id: "123", name: "My Site", slug: "my-site" };
    mockUseParams.mockReturnValue({ siteSlug: "my-site" });
    mockUseQuery.mockReturnValue(mockSite);

    const { result } = renderHook(() => useSite());

    expect(result.current.site).toEqual(mockSite);
    expect(result.current.isLoading).toBe(false);
  });

  it("should skip query when no siteSlug in params", () => {
    mockUseParams.mockReturnValue({});
    mockUseQuery.mockReturnValue(undefined);

    renderHook(() => useSite());

    expect(mockUseQuery).toHaveBeenCalledWith("sites:getBySlug", "skip");
  });

  it("should return siteSlug from params", () => {
    mockUseParams.mockReturnValue({ siteSlug: "test-slug" });
    mockUseQuery.mockReturnValue(undefined);

    const { result } = renderHook(() => useSite());

    expect(result.current.siteSlug).toBe("test-slug");
  });

  it("should have isLoading as false when site is null (not found)", () => {
    mockUseParams.mockReturnValue({ siteSlug: "missing-site" });
    mockUseQuery.mockReturnValue(null);

    const { result } = renderHook(() => useSite());

    expect(result.current.site).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});
