"use client";

import { useQuery } from "convex/react";
import { ArrowLeft, FileEdit } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { useSite } from "@/hooks/use-site";

export default function LiveEditEntriesPage() {
  const { site, siteSlug } = useSite();
  const params = useParams<{ typeSlug: string }>();
  const router = useRouter();

  const contentType = useQuery(
    api.contentTypes.getBySlug,
    site ? { siteId: site._id, slug: params.typeSlug } : "skip",
  );
  const entries = useQuery(
    api.contentEntries.listByType,
    contentType ? { contentTypeId: contentType._id } : "skip",
  );

  const isSingletonTemplate =
    contentType?.kind === "template" && contentType.mode === "singleton";

  useEffect(() => {
    if (!site || !contentType || entries === undefined) {
      return;
    }

    if (contentType.kind === "fragment") {
      router.replace(`/sites/${siteSlug}/live-edit`);
      return;
    }

    if (isSingletonTemplate && entries[0]) {
      router.replace(
        `/sites/${siteSlug}/live-edit/${params.typeSlug}/${entries[0].slug}`,
      );
    }
  }, [
    contentType,
    entries,
    isSingletonTemplate,
    params.typeSlug,
    router,
    site,
    siteSlug,
  ]);

  if (!site) return null;

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex h-12 shrink-0 items-center gap-3 border-b px-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          render={<Link href={`/sites/${siteSlug}/live-edit`} />}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">
          {contentType?.name ?? "..."}{" "}
          {isSingletonTemplate ? "live edit" : "entries"}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col justify-center p-6 sm:p-8">
          <div className="w-full space-y-8">
            <div className="rounded-3xl border bg-card/40 p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border bg-muted/40">
                    <FileEdit className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                      Live Edit
                    </p>
                    <h2 className="text-2xl font-semibold tracking-tight">
                      {isSingletonTemplate
                        ? "Open the singleton entry"
                        : "Choose an entry to edit"}
                    </h2>
                    <p className="max-w-2xl text-sm text-muted-foreground">
                      {contentType?.description ??
                        "Choose the entry you want to open in the live-edit workspace."}
                    </p>
                  </div>
                </div>
                {entries !== undefined && (
                  <Badge variant="secondary">
                    {entries.length} entr{entries.length === 1 ? "y" : "ies"}
                  </Badge>
                )}
              </div>
            </div>

            {entries === undefined ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={String(i)} className="h-32 rounded-2xl" />
                ))}
              </div>
            ) : contentType?.kind === "fragment" ? (
              <div className="rounded-2xl border border-dashed bg-card/30 p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Fragments are reused inside templates and do not have
                  standalone Live Edit entries.
                </p>
              </div>
            ) : isSingletonTemplate && entries.length === 0 ? (
              <div className="rounded-2xl border bg-card/40 p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  This singleton template does not have content yet. Create it
                  from the content editor first.
                </p>
                <div className="mt-4">
                  <Button
                    variant="outline"
                    render={
                      <Link
                        href={`/sites/${siteSlug}/content/${params.typeSlug}/new`}
                      />
                    }
                  >
                    Create Singleton Content
                  </Button>
                </div>
              </div>
            ) : entries.length === 0 ? (
              <div className="rounded-2xl border border-dashed bg-card/30 p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No entries yet. Create content first.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {entries.map((entry) => (
                  <Link
                    key={entry._id}
                    href={`/sites/${siteSlug}/live-edit/${params.typeSlug}/${entry.slug}`}
                    className="group"
                  >
                    <Card className="h-full border-border/60 bg-card/60 p-0 transition-all group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:bg-card group-hover:shadow-lg">
                      <div className="flex h-full items-center gap-4 p-5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border bg-muted/40">
                          <FileEdit className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="truncate text-sm font-medium">
                            {entry.title}
                          </p>
                          <p className="truncate font-mono text-[11px] text-muted-foreground">
                            {entry.slug}
                          </p>
                        </div>
                        <Badge
                          variant={
                            entry.status === "published"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {entry.status}
                        </Badge>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
