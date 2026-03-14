"use client";

import { useQuery } from "convex/react";
import { ArrowUpDown, Code, FileText, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ContentTypeContextMenu } from "@/components/content-types/content-type-context-menu";
import { SchemaExportPanel } from "@/components/schemas/schema-export-panel";
import { SchemaImportDialog } from "@/components/schemas/schema-import-dialog";
import { SchemaImportDropzone } from "@/components/schemas/schema-import-dropzone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { useAnalytics } from "@/hooks/use-analytics";
import { useSite } from "@/hooks/use-site";
import type { ContentTypeDefinition } from "@/packages/no-mess-client/src/schema";
import { generateSchemaSource } from "@/packages/no-mess-client/src/schema";

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
  const analytics = useAnalytics();
  const contentTypes = useQuery(
    api.contentTypes.listBySite,
    site ? { siteId: site._id } : "skip",
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("alphabetical");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  const exportCode = useMemo(() => {
    if (!contentTypes || contentTypes.length === 0) return "";
    const defs: ContentTypeDefinition[] = contentTypes.map((ct) =>
      ct.kind === "fragment"
        ? {
            kind: "fragment",
            slug: ct.slug,
            name: ct.name,
            description: ct.description,
            fields: ct.fields,
          }
        : {
            kind: "template",
            slug: ct.slug,
            name: ct.name,
            mode: ct.mode === "singleton" ? "singleton" : "collection",
            route: ct.route,
            description: ct.description,
            fields: ct.fields,
          },
    );
    return generateSchemaSource({ contentTypes: defs });
  }, [contentTypes]);

  const handleDropzoneFile = useCallback((_text: string) => {
    setShowImportDialog(true);
  }, []);

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

  // Track search (debounced)
  useEffect(() => {
    if (!searchQuery.trim() || filteredSchemas === undefined) return;
    const timer = setTimeout(() => {
      analytics.trackSearchPerformed({
        query_length: searchQuery.length,
        results_count: filteredSchemas.length,
        context: "schemas",
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, filteredSchemas, analytics]);

  if (!site) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Schemas</h2>
          <p className="text-sm text-muted-foreground">
            Define content types for your site.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              analytics.trackSchemaImported({ step: "dialog_opened" });
              setShowImportDialog(true);
            }}
          >
            <Code className="mr-2 h-4 w-4" />
            Import from Code
          </Button>
          {contentTypes && contentTypes.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                analytics.trackSchemaExported({
                  schema_count: contentTypes.length,
                  export_type: "all",
                });
                setShowExportDialog(true);
              }}
            >
              <Code className="mr-2 h-4 w-4" />
              Export All
            </Button>
          )}
          <Button render={<Link href={`/sites/${siteSlug}/schemas/new`} />}>
            <Plus className="mr-2 h-4 w-4" />
            New Schema
          </Button>
        </div>
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
        <SchemaImportDropzone onFileContent={handleDropzoneFile}>
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
            <FileText className="h-10 w-10 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">No schemas yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first content type schema, or drop a .ts file here to
              import.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <Button render={<Link href={`/sites/${siteSlug}/schemas/new`} />}>
                <Plus className="mr-2 h-4 w-4" />
                New Schema
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowImportDialog(true)}
              >
                <Code className="mr-2 h-4 w-4" />
                Import from Code
              </Button>
            </div>
          </div>
        </SchemaImportDropzone>
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
              onClick={() => {
                const next = sortCycle[sortBy];
                setSortBy(next);
                analytics.trackSortChanged({ sort_by: next });
              }}
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
              {filteredSchemas.map((type) => {
                const badges = [
                  type.kind === "fragment"
                    ? { label: "Fragment", variant: "outline" as const }
                    : type.mode === "singleton"
                      ? { label: "Singleton", variant: "outline" as const }
                      : null,
                  type.status === "draft"
                    ? { label: "Draft", variant: "secondary" as const }
                    : null,
                  type.status === "published" && type.hasDraft
                    ? { label: "Changes", variant: "outline" as const }
                    : null,
                ].filter((badge) => badge !== null);

                return (
                  <ContentTypeContextMenu
                    key={type._id}
                    onImportFromCode={() => {
                      analytics.trackSchemaImported({ step: "dialog_opened" });
                      setShowImportDialog(true);
                    }}
                    siteId={site._id}
                    siteSlug={siteSlug}
                    type={type}
                  >
                    <Link href={`/sites/${siteSlug}/schemas/${type.slug}`}>
                      <Card className="transition-colors hover:bg-muted/50">
                        <CardHeader className="gap-3">
                          <CardTitle className="text-base leading-tight">
                            {type.name}
                          </CardTitle>
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
                          <CardDescription>
                            {type.slug} · {type.fields.length} field
                            {type.fields.length !== 1 ? "s" : ""}
                            {type.kind === "template" && type.route
                              ? ` · ${type.route}`
                              : ""}
                          </CardDescription>
                        </CardHeader>
                      </Card>
                    </Link>
                  </ContentTypeContextMenu>
                );
              })}
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

      {site && (
        <SchemaImportDialog
          open={showImportDialog}
          onOpenChange={setShowImportDialog}
          siteId={site._id}
        />
      )}

      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="sm:max-w-[90vw] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Export All Schemas</DialogTitle>
          </DialogHeader>
          <SchemaExportPanel code={exportCode} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
