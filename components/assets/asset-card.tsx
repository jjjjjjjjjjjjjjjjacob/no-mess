"use client";

import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface AssetCardProps {
  asset: {
    _id: string;
    filename: string;
    mimeType: string;
    size: number;
    url: string;
  };
  isSelected?: boolean;
  onClick?: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AssetCard({ asset, isSelected, onClick }: AssetCardProps) {
  const isImage = asset.mimeType.startsWith("image/");

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg border transition-colors",
        isSelected && "ring-2 ring-primary",
        onClick && "cursor-pointer hover:bg-muted/50",
      )}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter") onClick();
            }
          : undefined
      }
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
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
      <div className="p-2">
        <p className="truncate text-xs font-medium">{asset.filename}</p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(asset.size)}
        </p>
      </div>
    </div>
  );
}
