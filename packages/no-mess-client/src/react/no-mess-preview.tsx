"use client";

import type { ReactNode } from "react";
import type {
  NoMessEntry,
  UseNoMessPreviewConfig,
  UseNoMessPreviewResult,
} from "../types.js";
import { useNoMessPreview } from "./use-no-mess-preview.js";

export interface NoMessPreviewProps<T extends NoMessEntry = NoMessEntry>
  extends UseNoMessPreviewConfig {
  children: (state: UseNoMessPreviewResult<T>) => ReactNode;
}

export function NoMessPreview<T extends NoMessEntry = NoMessEntry>({
  children,
  ...config
}: NoMessPreviewProps<T>) {
  const state = useNoMessPreview<T>(config);
  return <>{children(state)}</>;
}
