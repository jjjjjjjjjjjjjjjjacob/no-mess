import { vi } from "vitest";

export const useParams = vi.fn().mockReturnValue({});
export const usePathname = vi.fn().mockReturnValue("/");
export const useRouter = vi.fn().mockReturnValue({
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
});
export const useSearchParams = vi.fn().mockReturnValue(new URLSearchParams());
export const redirect = vi.fn();
export const notFound = vi.fn();
