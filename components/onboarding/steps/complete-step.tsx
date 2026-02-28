"use client";

import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface CompleteStepProps {
  siteName: string;
  siteSlug: string;
  contentTypeName: string;
  entryTitle: string;
}

export function CompleteStep({
  siteName,
  siteSlug,
  contentTypeName,
  entryTitle,
}: CompleteStepProps) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
        <HugeiconsIcon
          icon={CheckmarkCircle02Icon}
          className="size-8 text-primary"
          strokeWidth={2}
        />
      </div>
      <h3 className="mt-4 text-xl font-semibold">You&apos;re all set!</h3>
      <p className="mt-2 text-muted-foreground">
        Here&apos;s what you created:
      </p>
      <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
        <li>
          Site: <span className="font-medium text-foreground">{siteName}</span>
        </li>
        <li>
          Content type:{" "}
          <span className="font-medium text-foreground">{contentTypeName}</span>
        </li>
        <li>
          First entry:{" "}
          <span className="font-medium text-foreground">{entryTitle}</span>
        </li>
      </ul>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button render={<Link href={`/sites/${siteSlug}`} />}>
          Go to Site Dashboard
        </Button>
        <Button variant="outline" render={<Link href="/docs" />}>
          Read the Docs
        </Button>
      </div>
    </div>
  );
}
