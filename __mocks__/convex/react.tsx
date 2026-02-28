import type { ReactNode } from "react";
import { vi } from "vitest";

export const useQuery = vi.fn().mockReturnValue(undefined);
export const useMutation = vi.fn().mockReturnValue(vi.fn());
export const useAction = vi.fn().mockReturnValue(vi.fn());
export const useConvex = vi.fn().mockReturnValue({});

export const ConvexProvider = ({ children }: { children: ReactNode }) => (
  <>{children}</>
);
