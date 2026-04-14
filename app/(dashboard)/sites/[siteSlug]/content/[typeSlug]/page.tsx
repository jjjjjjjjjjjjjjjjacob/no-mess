"use client";

import { useQuery } from "convex/react";
import { ArrowUpDown, FileText, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { EntryContextMenu } from "@/components/content-entries/entry-context-menu";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { useSite } from "@/hooks/use-site";

type StatusFilter = "all" | "published" | "draft";
type SortBy = "newest" | "oldest" | "alphabetical";

const sortLabels: Record<SortBy, string> = {
  newest: "Newest",
  oldest: "Oldest",
  alphabetical: "A-Z",
};

const sortCycle: Record<SortBy, SortBy> = {
  newest: "oldest",
  oldest: "alphabetical",
  alphabetical: "newest",
};

export default function EntriesListPage() {
  const router = useRouter();
  const { site, siteSlug } = useSite();
  const params = useParams<{ typeSlug: string }>();
  const contentType = useQuery(
    api.contentTypes.getBySlug,
    site ? { siteId: site._id, slug: params.typeSlug } : "skip",
  );
  const entries = useQuery(
    api.contentEntries.listByType,
    contentType ? { contentTypeId: contentType._id } : "skip",
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("newest");

  const statusCounts = useMemo(() => {
    if (!entries) return { all: 0, published: 0, draft: 0 };
    return {
      all: entries.length,
      published: entries.filter((e) => e.status === "published").length,
      draft: entries.filter((e) => e.status === "draft").length,
    };
  }, [entries]);

  const filteredEntries = useMemo(() => {
    if (!entries) return [];
    let result = [...entries];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((e) => e.title.toLowerCase().includes(query));
    }

    if (statusFilter !== "all") {
      result = result.filter((e) => e.status === statusFilter);
    }

    result.sort((a, b) => {
      if (sortBy === "newest") return b.updatedAt - a.updatedAt;
      if (sortBy === "oldest") return a.updatedAt - b.updatedAt;
      return a.title.localeCompare(b.title);
    });

    return result;
  }, [entries, searchQuery, statusFilter, sortBy]);

  const isFiltered = searchQuery !== "" || statusFilter !== "all";
  const isSingletonTemplate =
    contentType?.kind === "template" && contentType.mode === "singleton";

  useEffect(() => {
    if (
      !site ||
      !contentType ||
      !isSingletonTemplate ||
      entries === undefined
    ) {
      return;
    }

    const target = entries[0]
      ? `/sites/${siteSlug}/content/${params.typeSlug}/${entries[0].slug}`
      : `/sites/${siteSlug}/content/${params.typeSlug}/new`;
    router.replace(target);
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

  const entryHrefBase = site.previewUrl
    ? `/sites/${siteSlug}/live-edit/${params.typeSlug}`
    : `/sites/${siteSlug}/content/${params.typeSlug}`;

  if (contentType === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (contentType === null) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-lg font-medium">Content type not found</h2>
      </div>
    );
  }

  if (contentType.kind === "fragment") {
    return (
      <div className="py-12 text-center">
        <h2 className="text-lg font-medium">Fragments do not have entries</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This schema is a reusable fragment and can only be edited through
          templates that reference it.
        </p>
      </div>
    );
  }

  if (isSingletonTemplate) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-lg font-medium">Opening singleton entry</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Redirecting to the single authoring view for {contentType.name}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            {contentType.name}
          </h2>
          <p className="text-sm text-muted-foreground">
            {contentType.description ||
              `Manage ${contentType.name.toLowerCase()} entries.`}
          </p>
        </div>
        <Link
          href={`/sites/${siteSlug}/content/${params.typeSlug}/new`}
          className={buttonVariants()}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Entry
        </Link>
      </div>

      {entries === undefined ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <FileText className="h-10 w-10 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No entries yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first {contentType.name.toLowerCase()} entry.
          </p>
          <Link
            href={`/sites/${siteSlug}/content/${params.typeSlug}/new`}
            className={buttonVariants({ className: "mt-4" })}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Entry
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search entries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-1">
              {(["all", "published", "draft"] as const).map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)} (
                  {statusCounts[status]})
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortBy(sortCycle[sortBy])}
            >
              <ArrowUpDown className="mr-1.5 h-3.5 w-3.5" />
              {sortLabels[sortBy]}
            </Button>
          </div>

          <div className="flex items-center">
            <p className="text-sm text-muted-foreground">
              {isFiltered
                ? `${filteredEntries.length} of ${entries.length} entries`
                : `${entries.length} entries`}
            </p>
          </div>

          {filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <Search className="h-10 w-10 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No matching entries</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Try adjusting your search or filters.
              </p>
            </div>
          ) : (
            <div className="divide-y rounded-lg border">
              {filteredEntries.map((entry) => (
                <EntryContextMenu
                  key={entry._id}
                  entry={entry}
                  previewUrl={site.previewUrl}
                  siteSlug={siteSlug}
                  typeSlug={params.typeSlug}
                >
                  <Link
                    href={`${entryHrefBase}/${entry.slug}`}
                    className="flex items-center justify-between p-4 transition-colors hover:bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{entry.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {entry.slug}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          entry.status === "published" ? "default" : "secondary"
                        }
                      >
                        {entry.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </Link>
                </EntryContextMenu>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
