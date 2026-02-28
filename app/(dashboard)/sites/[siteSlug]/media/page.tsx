"use client";

import { useMutation, useQuery } from "convex/react";
import {
  ArrowUpDown,
  Copy,
  FileText,
  Image as ImageIcon,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { UploadDropzone } from "@/components/assets/upload-dropzone";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { useSite } from "@/hooks/use-site";

type TypeFilter = "all" | "images" | "documents";
type SortBy = "newest" | "oldest" | "largest" | "smallest";

const sortOptions: { value: SortBy; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "largest", label: "Largest" },
  { value: "smallest", label: "Smallest" },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaPage() {
  const { site } = useSite();
  const assets = useQuery(
    api.assets.listBySite,
    site ? { siteId: site._id } : "skip",
  );
  const removeAsset = useMutation(api.assets.remove);
  const { copy } = useCopyToClipboard();

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [deleteTarget, setDeleteTarget] = useState<{
    assetId: Id<"assets">;
    filename: string;
  } | null>(null);

  const filteredAssets = useMemo(() => {
    if (!assets) return [];

    let result = [...assets];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((asset) =>
        asset.filename.toLowerCase().includes(query),
      );
    }

    // Type filter
    if (typeFilter === "images") {
      result = result.filter((asset) => asset.mimeType.startsWith("image/"));
    } else if (typeFilter === "documents") {
      result = result.filter((asset) => !asset.mimeType.startsWith("image/"));
    }

    // Sort
    switch (sortBy) {
      case "newest":
        result.sort((a, b) => b.uploadedAt - a.uploadedAt);
        break;
      case "oldest":
        result.sort((a, b) => a.uploadedAt - b.uploadedAt);
        break;
      case "largest":
        result.sort((a, b) => b.size - a.size);
        break;
      case "smallest":
        result.sort((a, b) => a.size - b.size);
        break;
    }

    return result;
  }, [assets, searchQuery, typeFilter, sortBy]);

  const isFiltered = searchQuery.trim() !== "" || typeFilter !== "all";

  function handleCopyUrl(url: string) {
    copy(url);
    toast.success("URL copied to clipboard");
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    try {
      await removeAsset({ assetId: deleteTarget.assetId });
      toast.success("Asset deleted");
    } catch {
      toast.error("Failed to delete asset");
    } finally {
      setDeleteTarget(null);
    }
  }

  function cycleSortBy() {
    const currentIndex = sortOptions.findIndex((o) => o.value === sortBy);
    const nextIndex = (currentIndex + 1) % sortOptions.length;
    setSortBy(sortOptions[nextIndex].value);
  }

  if (!site) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Media Library</h2>
        <p className="text-sm text-muted-foreground">
          Upload and manage images and files.
        </p>
      </div>

      <UploadDropzone siteId={site._id} />

      {assets === undefined ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      ) : assets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <h3 className="text-lg font-medium">No assets yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload images or files using the dropzone above.
          </p>
        </div>
      ) : (
        <>
          {/* Toolbar: search, type filter, sort, count */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-2">
              <InputGroup className="max-w-xs">
                <InputGroupAddon align="inline-start">
                  <InputGroupText>
                    <Search />
                  </InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  placeholder="Search assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </InputGroup>

              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant={typeFilter === "all" ? "secondary" : "ghost"}
                  onClick={() => setTypeFilter("all")}
                >
                  All
                </Button>
                <Button
                  size="sm"
                  variant={typeFilter === "images" ? "secondary" : "ghost"}
                  onClick={() => setTypeFilter("images")}
                >
                  <ImageIcon data-icon="inline-start" />
                  Images
                </Button>
                <Button
                  size="sm"
                  variant={typeFilter === "documents" ? "secondary" : "ghost"}
                  onClick={() => setTypeFilter("documents")}
                >
                  <FileText data-icon="inline-start" />
                  Documents
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={cycleSortBy}>
                <ArrowUpDown data-icon="inline-start" />
                {sortOptions.find((o) => o.value === sortBy)?.label}
              </Button>

              <span className="text-sm text-muted-foreground">
                {isFiltered
                  ? `${filteredAssets.length} of ${assets.length} assets`
                  : `${assets.length} assets`}
              </span>
            </div>
          </div>

          {/* Asset grid or filtered empty state */}
          {filteredAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <Search className="mb-3 h-10 w-10 text-muted-foreground" />
              <h3 className="text-lg font-medium">No matching assets</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Try adjusting your search or filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {filteredAssets.map((asset) => {
                const isImage = asset.mimeType.startsWith("image/");
                return (
                  <div
                    key={asset._id}
                    className="group relative flex flex-col overflow-hidden rounded-lg border transition-colors"
                  >
                    <div className="flex aspect-square items-center justify-center bg-muted/30">
                      {isImage ? (
                        <img
                          src={asset.url}
                          alt={asset.filename}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <FileText className="h-10 w-10 text-muted-foreground" />
                      )}
                    </div>

                    {/* Hover overlay with actions */}
                    <div className="absolute inset-0 flex items-start justify-end gap-1 p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        size="icon-xs"
                        variant="secondary"
                        onClick={() => handleCopyUrl(asset.url)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="secondary"
                        onClick={() =>
                          setDeleteTarget({
                            assetId: asset._id as Id<"assets">,
                            filename: asset.filename,
                          })
                        }
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="p-2">
                      <p className="truncate text-xs font-medium">
                        {asset.filename}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(asset.size)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete asset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.filename}
              &quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
