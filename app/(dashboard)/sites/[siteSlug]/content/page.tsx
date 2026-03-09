"use client";

import { useQuery } from "convex/react";
import { FileText } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { ContentTypeContextMenu } from "@/components/content-types/content-type-context-menu";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { useSite } from "@/hooks/use-site";

const contentTileHeightClass = "h-[15rem]";

export default function ContentPage() {
  const { site, siteSlug } = useSite();
  const contentTypes = useQuery(
    api.contentTypes.listBySite,
    site ? { siteId: site._id } : "skip",
  );
  const entries = useQuery(
    api.contentEntries.listBySite,
    site ? { siteId: site._id } : "skip",
  );

  const entryCounts = useMemo(() => {
    if (!entries)
      return new Map<
        string,
        { total: number; published: number; draft: number }
      >();
    const counts = new Map<
      string,
      { total: number; published: number; draft: number }
    >();
    for (const entry of entries) {
      const existing = counts.get(entry.contentTypeId) ?? {
        total: 0,
        published: 0,
        draft: 0,
      };
      existing.total++;
      if (entry.status === "published") existing.published++;
      else existing.draft++;
      counts.set(entry.contentTypeId, existing);
    }
    return counts;
  }, [entries]);

  if (!site) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Content</h2>
        <p className="text-sm text-muted-foreground">
          Select a content type to manage entries.
        </p>
      </div>

      {contentTypes === undefined ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton
              key={i}
              className={`${contentTileHeightClass} rounded-xl`}
            />
          ))}
        </div>
      ) : contentTypes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <FileText className="h-10 w-10 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No content types</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a schema first to start adding content.
          </p>
          <Link
            href={`/sites/${siteSlug}/schemas/new`}
            className="mt-4 text-sm text-primary underline-offset-4 hover:underline"
          >
            Create a schema
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contentTypes.map((type) => (
            <ContentTypeContextMenu
              key={type._id}
              siteId={site._id}
              siteSlug={siteSlug}
              type={type}
            >
              <Link
                href={`/sites/${siteSlug}/content/${type.slug}`}
                className="block h-full"
              >
                <Card
                  className={`${contentTileHeightClass} transition-colors hover:bg-muted/50`}
                >
                  <CardHeader>
                    <CardTitle className="text-base">{type.name}</CardTitle>
                    <CardDescription className="line-clamp-4">
                      {type.fields.length} field
                      {type.fields.length !== 1 ? "s" : ""}
                      {type.description ? ` · ${type.description}` : ""}
                    </CardDescription>
                  </CardHeader>
                  {(() => {
                    const counts = entryCounts.get(type._id);
                    if (!counts || counts.total === 0) return null;
                    return (
                      <CardContent className="mt-auto pt-0">
                        <p className="text-xs text-muted-foreground">
                          {counts.total}{" "}
                          {counts.total === 1 ? "entry" : "entries"}
                          {counts.published > 0 &&
                            ` · ${counts.published} published`}
                          {counts.draft > 0 &&
                            ` · ${counts.draft} draft${counts.draft !== 1 ? "s" : ""}`}
                        </p>
                      </CardContent>
                    );
                  })()}
                </Card>
              </Link>
            </ContentTypeContextMenu>
          ))}
        </div>
      )}
    </div>
  );
}
