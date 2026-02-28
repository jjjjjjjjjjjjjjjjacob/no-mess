"use client";

import { useQuery } from "convex/react";
import { ArrowUpDown, FileText, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { useSite } from "@/hooks/use-site";

type SortBy = "alphabetical" | "newest" | "most-fields";

const sortLabels: Record<SortBy, string> = {
  alphabetical: "A-Z",
  newest: "Newest",
  "most-fields": "Most Fields",
};

const sortCycle: Record<SortBy, SortBy> = {
  alphabetical: "newest",
  newest: "most-fields",
  "most-fields": "alphabetical",
};

export default function SchemasPage() {
  const { site, siteSlug } = useSite();
  const contentTypes = useQuery(
    api.contentTypes.listBySite,
    site ? { siteId: site._id } : "skip",
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("alphabetical");

  const filteredSchemas = useMemo(() => {
    if (!contentTypes) return undefined;

    const query = searchQuery.toLowerCase().trim();
    const result = contentTypes.filter((type) =>
      type.name.toLowerCase().includes(query),
    );

    result.sort((a, b) => {
      if (sortBy === "alphabetical") return a.name.localeCompare(b.name);
      if (sortBy === "newest") return b._creationTime - a._creationTime;
      return b.fields.length - a.fields.length;
    });

    return result;
  }, [contentTypes, searchQuery, sortBy]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Schemas</h2>
          <p className="text-sm text-muted-foreground">
            Define content types for your site.
          </p>
        </div>
        <Button render={<Link href={`/sites/${siteSlug}/schemas/new`} />}>
          <Plus className="mr-2 h-4 w-4" />
          New Schema
        </Button>
      </div>

      {contentTypes === undefined ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton
              key={`skeleton-${String(i)}`}
              className="h-28 rounded-xl"
            />
          ))}
        </div>
      ) : contentTypes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <FileText className="h-10 w-10 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No schemas yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first content type schema.
          </p>
          <Button
            className="mt-4"
            render={<Link href={`/sites/${siteSlug}/schemas/new`} />}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Schema
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search schemas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortBy(sortCycle[sortBy])}
            >
              <ArrowUpDown className="mr-2 h-4 w-4" />
              {sortLabels[sortBy]}
            </Button>
            <p className="text-sm text-muted-foreground whitespace-nowrap">
              {searchQuery.trim()
                ? `${filteredSchemas?.length ?? 0} of ${contentTypes.length} schema${contentTypes.length !== 1 ? "s" : ""}`
                : `${contentTypes.length} schema${contentTypes.length !== 1 ? "s" : ""}`}
            </p>
          </div>

          {filteredSchemas && filteredSchemas.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredSchemas.map((type) => (
                <Link
                  key={type._id}
                  href={`/sites/${siteSlug}/schemas/${type.slug}`}
                >
                  <Card className="transition-colors hover:bg-muted/50">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{type.name}</CardTitle>
                        {type.status === "draft" && (
                          <Badge variant="secondary">Draft</Badge>
                        )}
                        {type.status === "published" && type.hasDraft && (
                          <Badge variant="outline">Unpublished changes</Badge>
                        )}
                      </div>
                      <CardDescription>
                        {type.slug} · {type.fields.length} field
                        {type.fields.length !== 1 ? "s" : ""}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <Search className="h-10 w-10 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No matching schemas</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Try a different search term.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
