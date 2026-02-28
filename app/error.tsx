"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="text-center">
        <p className="text-6xl font-bold text-muted-foreground">500</p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          An unexpected error occurred. Please try again.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button onClick={reset}>Try Again</Button>
          {/* biome-ignore lint/a11y/useAnchorContent: content provided by Button children */}
          <Button variant="outline" render={<a href="/" />}>
            Back to Home
          </Button>
          {/* biome-ignore lint/a11y/useAnchorContent: content provided by Button children */}
          <Button variant="ghost" render={<a href="/dashboard" />}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
