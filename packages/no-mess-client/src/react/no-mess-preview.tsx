"use client";

import type { ReactNode } from "react";
import type { NoMessEntry, UseNoMessPreviewConfig } from "../types.js";
import { useNoMessPreview } from "./use-no-mess-preview.js";

export interface NoMessPreviewProps<T extends NoMessEntry = NoMessEntry>
  extends UseNoMessPreviewConfig {
  children: (state: {
    entry: T | null;
    error: Error | null;
    isLoading: boolean;
  }) => ReactNode;
}

export function NoMessPreview<T extends NoMessEntry = NoMessEntry>({
  children,
  ...config
}: NoMessPreviewProps<T>) {
  const state = useNoMessPreview<T>(config);
  return <>{children(state)}</>;
}
