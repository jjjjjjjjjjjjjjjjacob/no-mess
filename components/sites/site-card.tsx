"use client";

import { Globe } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Doc } from "@/convex/_generated/dataModel";

interface SiteCardProps {
  site: Doc<"sites">;
}

export function SiteCard({ site }: SiteCardProps) {
  return (
    <Link href={`/sites/${site.slug}`}>
      <Card className="transition-colors hover:border-foreground/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
              <Globe className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle>{site.name}</CardTitle>
              <CardDescription className="truncate">
                /{site.slug}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}
