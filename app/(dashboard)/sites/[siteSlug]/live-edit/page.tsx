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
      <div className="flex h-full min-h-0 flex-col bg-background">
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

        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
          <div className="w-full max-w-lg rounded-2xl border bg-card/60 p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border bg-muted/40">
              <MousePointerClick className="h-6 w-6 text-muted-foreground" />
            </div>
            <h2 className="mt-6 text-xl font-semibold">Preview URL required</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Configure a preview URL in site settings before opening Live Edit.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
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
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
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

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col justify-center p-6 sm:p-8">
          <div className="w-full space-y-8">
            <div className="rounded-3xl border bg-card/40 p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border bg-muted/40">
                    <MousePointerClick className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                      Live Edit
                    </p>
                    <h2 className="text-2xl font-semibold tracking-tight">
                      Choose a content type to edit
                    </h2>
                    <p className="max-w-2xl text-sm text-muted-foreground">
                      Pick a template to open the full live-edit workspace with
                      draft fields on the left and the real page preview on the
                      right.
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">
                  {templates.length} template{templates.length === 1 ? "" : "s"}
                </Badge>
              </div>
            </div>

            {contentTypes === undefined ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={String(i)} className="h-40 rounded-2xl" />
                ))}
              </div>
            ) : templates.length === 0 ? (
              <div className="rounded-2xl border border-dashed bg-card/30 p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No editable templates yet. Create a template schema first.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {templates.map((ct) => {
                  const badges = [
                    ct.mode === "singleton"
                      ? { label: "Singleton", variant: "outline" as const }
                      : null,
                    ct.status === "draft"
                      ? { label: "Draft", variant: "secondary" as const }
                      : null,
                    ct.status === "published" && ct.hasDraft
                      ? { label: "Changes", variant: "outline" as const }
                      : null,
                  ].filter((badge) => badge !== null);

                  return (
                    <Link
                      key={ct._id}
                      href={`/sites/${siteSlug}/live-edit/${ct.slug}`}
                      className="group"
                    >
                      <Card className="h-full border-border/60 bg-card/60 p-0 transition-all group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:bg-card group-hover:shadow-lg">
                        <div className="flex h-full gap-4 p-5">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border bg-muted/40">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1 space-y-3">
                            <div className="space-y-1">
                              <p className="text-sm font-medium leading-tight">
                                {ct.name}
                              </p>
                              {ct.description && (
                                <p className="line-clamp-2 text-xs text-muted-foreground">
                                  {ct.description}
                                </p>
                              )}
                            </div>
                            {badges.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {badges.map((badge) => (
                                  <Badge
                                    key={badge.label}
                                    variant={badge.variant}
                                  >
                                    {badge.label}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {ct.route && (
                              <p className="truncate font-mono text-[11px] text-muted-foreground">
                                {ct.route}
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
