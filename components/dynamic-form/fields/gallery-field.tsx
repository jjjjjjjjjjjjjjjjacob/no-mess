"use client";

import { useQuery } from "convex/react";
import { ArrowDown, ArrowUp, ImageIcon, Plus, Video, X } from "lucide-react";
import { useState } from "react";
import { AssetPickerDialog } from "@/components/assets/asset-picker-dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useFormContext } from "../form-context";

interface GalleryFieldProps {
  value: string[];
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

export function GalleryField({ value, onChange, disabled }: GalleryFieldProps) {
  const { siteId } = useFormContext();
  const [pickerOpen, setPickerOpen] = useState(false);
  const assets = useQuery(api.assets.listBySite, siteId ? { siteId } : "skip");
  const selectedIds = Array.isArray(value) ? value : [];

  if (!siteId) {
    return (
      <p className="text-sm text-muted-foreground">
        Gallery picker not available (missing site context).
      </p>
    );
  }

  const updateValue = (next: string[]) => {
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {selectedIds.length === 0 ? (
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          No gallery items selected yet.
        </div>
      ) : (
        <div className="space-y-2">
          {selectedIds.map((assetId, index) => {
            const asset = assets?.find((item) => item._id === assetId);
            return (
              <div
                key={`${assetId}-${index}`}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
                  {asset ? (
                    asset.mimeType.startsWith("video/") ? (
                      <video
                        src={asset.url}
                        aria-label={asset.filename}
                        className="h-full w-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : asset.mimeType.startsWith("image/") ? (
                      <img
                        src={asset.url}
                        alt={asset.filename}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Video className="h-6 w-6 text-muted-foreground" />
                    )
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {asset?.filename ?? "Loading asset..."}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {asset?.mimeType.startsWith("video/")
                      ? "Video"
                      : asset?.mimeType.startsWith("image/")
                        ? "Image"
                        : "Asset"}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Move ${asset?.filename ?? "asset"} up`}
                    onClick={() =>
                      updateValue(moveItem(selectedIds, index, -1))
                    }
                    disabled={disabled || index === 0}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Move ${asset?.filename ?? "asset"} down`}
                    onClick={() => updateValue(moveItem(selectedIds, index, 1))}
                    disabled={disabled || index === selectedIds.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${asset?.filename ?? "asset"} from gallery`}
                    onClick={() =>
                      updateValue(removeItemAtIndex(selectedIds, index))
                    }
                    disabled={disabled}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setPickerOpen(true)}
          disabled={disabled}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Media
        </Button>
        {selectedIds.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => updateValue([])}
            disabled={disabled}
          >
            Clear Gallery
          </Button>
        )}
      </div>

      <AssetPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        siteId={siteId}
        title="Add Gallery Item"
        description="Upload an image or video here or pick one from your asset library."
        accept="image/*,video/*"
        uploadLabel="Drop media here or click to upload"
        uploadDescription="Images and videos up to 20MB"
        emptyStateMessage="Upload your first image or video above."
        allowVideos
        onSelect={(assetId) => {
          if (!selectedIds.includes(assetId)) {
            updateValue([...selectedIds, assetId]);
          }
          setPickerOpen(false);
        }}
      />
    </div>
  );
}

function moveItem(items: string[], index: number, delta: number) {
  const nextIndex = index + delta;
  if (nextIndex < 0 || nextIndex >= items.length) {
    return items;
  }

  const next = [...items];
  const [item] = next.splice(index, 1);
  next.splice(nextIndex, 0, item);
  return next;
}

function removeItemAtIndex(items: string[], index: number) {
  return items.filter((_, itemIndex) => itemIndex !== index);
}
