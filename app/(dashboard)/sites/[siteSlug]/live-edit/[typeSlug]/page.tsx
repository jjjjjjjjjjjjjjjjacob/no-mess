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
    <div className="flex h-screen flex-col">
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

      <div className="flex-1 overflow-auto p-6">
        <h2 className="mb-4 text-lg font-semibold">
          {isSingletonTemplate
            ? "Open the singleton entry"
            : "Choose an entry to edit"}
        </h2>

        {entries === undefined ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={String(i)} className="h-20 rounded-lg" />
            ))}
          </div>
        ) : contentType?.kind === "fragment" ? (
          <p className="text-sm text-muted-foreground">
            Fragments are reused inside templates and do not have standalone
            Live Edit entries.
          </p>
        ) : isSingletonTemplate && entries.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This singleton template does not have content yet. Create it from
              the content editor first.
            </p>
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
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No entries yet. Create content first.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {entries.map((entry) => (
              <Link
                key={entry._id}
                href={`/sites/${siteSlug}/live-edit/${params.typeSlug}/${entry.slug}`}
              >
                <Card className="flex items-center gap-3 p-4 transition-colors hover:bg-accent">
                  <FileEdit className="h-5 w-5 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {entry.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.slug}
                    </p>
                  </div>
                  <Badge
                    variant={
                      entry.status === "published" ? "default" : "secondary"
                    }
                  >
                    {entry.status}
                  </Badge>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
