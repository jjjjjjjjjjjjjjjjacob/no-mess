"use client";

import { CheckmarkCircle02Icon, Copy01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

interface CodeBlockCopyProps {
  code: string;
}

export function CodeBlockCopy({ code }: CodeBlockCopyProps) {
  const { copied, copy } = useCopyToClipboard();

  return (
    <Button
      variant="ghost"
      size="icon-xs"
      onClick={() => copy(code)}
      className="absolute right-2 top-2 opacity-0 transition-opacity group-hover/code:opacity-100"
    >
      <HugeiconsIcon
        icon={copied ? CheckmarkCircle02Icon : Copy01Icon}
        className="size-3.5"
        strokeWidth={2}
      />
    </Button>
  );
}
