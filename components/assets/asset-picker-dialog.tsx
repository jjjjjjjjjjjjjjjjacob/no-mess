"use client";

import { useQuery } from "convex/react";
import { ImageIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
}

export function AssetPickerDialog({
  open,
  onOpenChange,
  siteId,
  onSelect,
}: AssetPickerDialogProps) {
  const assets = useQuery(api.assets.listBySite, { siteId });
  const [selectedId, setSelectedId] = useState<Id<"assets"> | null>(null);

  const handleConfirm = () => {
    if (selectedId) {
      onSelect(selectedId);
      setSelectedId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select an Image</DialogTitle>
        </DialogHeader>

        {assets === undefined ? (
          <div className="flex h-48 items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading assets...</p>
          </div>
        ) : assets.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No assets uploaded yet. Upload images in the Assets section first.
            </p>
          </div>
        ) : (
          <div className="grid max-h-[400px] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
            {assets
              .filter((a) => a.mimeType.startsWith("image/"))
              .map((asset) => (
                <button
                  key={asset._id}
                  type="button"
                  onClick={() => setSelectedId(asset._id)}
                  className={cn(
                    "group relative aspect-square overflow-hidden rounded-lg border-2 transition-colors",
                    selectedId === asset._id
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-transparent hover:border-muted-foreground/30",
                  )}
                >
                  <img
                    src={asset.url}
                    alt={asset.filename}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1.5 py-1">
                    <p className="truncate text-xs text-white">
                      {asset.filename}
                    </p>
                  </div>
                </button>
              ))}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setSelectedId(null);
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedId}>
            Select
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
