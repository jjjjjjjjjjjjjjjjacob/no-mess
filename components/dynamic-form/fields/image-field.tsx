"use client";

import { useQuery } from "convex/react";
import { ImageIcon, X } from "lucide-react";
import { useState } from "react";
import { AssetPickerDialog } from "@/components/assets/asset-picker-dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useFormContext } from "../form-context";

interface ImageFieldProps {
  value: string;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

export function ImageField({ value, onChange, disabled }: ImageFieldProps) {
  const { siteId } = useFormContext();
  const [pickerOpen, setPickerOpen] = useState(false);

  // Try to fetch asset details if we have a value
  const asset = useQuery(
    api.assets.get,
    value ? { assetId: value as Id<"assets"> } : "skip",
  );

  if (!siteId) {
    return (
      <p className="text-sm text-muted-foreground">
        Image picker not available (missing site context).
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {value ? (
        <div className="flex items-center gap-3 rounded-lg border p-3">
          {asset?.mimeType.startsWith("image/") ? (
            <img
              src={asset.url}
              alt={asset.filename}
              className="h-16 w-16 rounded object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded bg-muted">
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {asset?.filename ?? "Loading image..."}
            </p>
            <p className="text-xs text-muted-foreground">
              {asset
                ? asset.width && asset.height
                  ? `${asset.width}x${asset.height} \u00b7 `
                  : ""
                : ""}
              {asset
                ? `${(asset.size / 1024).toFixed(1)} KB`
                : "Fetching image details..."}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPickerOpen(true)}
            disabled={disabled}
          >
            Change
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange("")}
            disabled={disabled}
            aria-label="Clear image"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => setPickerOpen(true)}
          disabled={disabled}
        >
          <ImageIcon className="mr-2 h-4 w-4" />
          Add Image
        </Button>
      )}

      <AssetPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        siteId={siteId}
        onSelect={(assetId) => {
          onChange(assetId);
          setPickerOpen(false);
        }}
      />
    </div>
  );
}
