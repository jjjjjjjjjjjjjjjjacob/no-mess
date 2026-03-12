"use client";

import { useQuery } from "convex/react";
import { ArrowLeft, FileText, MousePointerClick } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { useSite } from "@/hooks/use-site";

export default function LiveEditIndexPage() {
  const { site, siteSlug } = useSite();
  const contentTypes = useQuery(
    api.contentTypes.listBySite,
    site ? { siteId: site._id } : "skip",
  );
  const templates = useMemo(
    () =>
      contentTypes?.filter((contentType) => contentType.kind === "template") ??
      [],
    [contentTypes],
  );

  if (!site) return null;

  if (!site.previewUrl) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <MousePointerClick className="h-10 w-10 text-muted-foreground" />
        <h2 className="text-lg font-medium">Preview URL required</h2>
        <p className="text-sm text-muted-foreground">
          Configure a preview URL in site settings to use Live Edit.
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            render={<Link href={`/sites/${siteSlug}`} />}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button render={<Link href={`/sites/${siteSlug}/settings`} />}>
            Go to Settings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <div className="flex h-12 shrink-0 items-center gap-3 border-b px-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          render={<Link href={`/sites/${siteSlug}`} />}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <MousePointerClick className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Live Edit</span>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <h2 className="mb-4 text-lg font-semibold">
          Choose a content type to edit
        </h2>

        {contentTypes === undefined ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={String(i)} className="h-24 rounded-lg" />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No editable templates yet. Create a template schema first.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((ct) => (
              <Link
                key={ct._id}
                href={`/sites/${siteSlug}/live-edit/${ct.slug}`}
              >
                <Card className="h-full flex-row items-center gap-3 p-4 py-4 transition-colors hover:bg-accent">
                  <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{ct.name}</p>
                      <Badge variant="outline">
                        {ct.mode === "singleton" ? "Singleton" : "Collection"}
                      </Badge>
                    </div>
                    {ct.description && (
                      <p className="text-xs text-muted-foreground">
                        {ct.description}
                      </p>
                    )}
                    {ct.route && (
                      <p className="text-xs text-muted-foreground">
                        {ct.route}
                      </p>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
