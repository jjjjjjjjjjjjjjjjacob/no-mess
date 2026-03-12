"use client";

import { useQuery } from "convex/react";
import { ImageIcon } from "lucide-react";
import { UploadDropzone } from "@/components/assets/upload-dropzone";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface AssetPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteId: Id<"sites">;
  onSelect: (assetId: Id<"assets">) => void;
  title?: string;
  description?: string;
  accept?: string;
  uploadLabel?: string;
  uploadDescription?: string;
  emptyStateMessage?: string;
  allowVideos?: boolean;
}

export function AssetPickerDialog({
  open,
  onOpenChange,
  siteId,
  onSelect,
  title = "Choose or Upload Image",
  description = "Upload a new image here or pick one from your library.",
  accept = "image/*",
  uploadLabel = "Drop an image here or click to upload",
  uploadDescription = "PNG, JPG, WebP, GIF, and SVG up to 20MB",
  emptyStateMessage = "Upload your first image above.",
  allowVideos = false,
}: AssetPickerDialogProps) {
  const assets = useQuery(api.assets.listBySite, { siteId });
  const selectableAssets = (assets ?? []).filter((asset) =>
    isSelectableAsset(asset.mimeType, allowVideos),
  );

  const handleSelect = (assetId: Id<"assets">) => {
    onSelect(assetId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <UploadDropzone
          siteId={siteId}
          accept={accept}
          multiple={false}
          label={uploadLabel}
          description={uploadDescription}
          onUploadComplete={handleSelect}
        />

        {assets === undefined ? (
          <div className="flex h-40 items-center justify-center rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground">
              {allowVideos ? "Loading media..." : "Loading images..."}
            </p>
          </div>
        ) : selectableAssets.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{emptyStateMessage}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
              {allowVideos ? "Media Library" : "Image Library"}
            </p>
            <div className="grid max-h-[320px] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
              {selectableAssets.map((asset) => (
                <button
                  key={asset._id}
                  type="button"
                  aria-label={`Select ${asset.filename}`}
                  onClick={() => handleSelect(asset._id)}
                  className={cn(
                    "group relative aspect-square overflow-hidden rounded-lg border border-transparent transition-colors hover:border-muted-foreground/30 hover:ring-2 hover:ring-primary/15",
                  )}
                >
                  {asset.mimeType.startsWith("video/") ? (
                    <video
                      src={asset.url}
                      aria-label={asset.filename}
                      className="h-full w-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <img
                      src={asset.url}
                      alt={asset.filename}
                      className="h-full w-full object-cover"
                    />
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1.5 py-1">
                    <p className="truncate text-xs text-white">
                      {asset.filename}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function isSelectableAsset(mimeType: string, allowVideos: boolean) {
  return (
    mimeType.startsWith("image/") ||
    (allowVideos && mimeType.startsWith("video/"))
  );
}
