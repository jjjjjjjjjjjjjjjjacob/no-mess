"use client";

import { ArrowLeft, FolderGit2, RadioTower, Upload } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface LiveEditToolbarProps {
  backHref: string;
  entryTitle: string;
  entryStatus: string;
  saveStateLabel: string;
  savedDraftCount: number;
  isDirty: boolean;
  isProductionView: boolean;
  isPublishing: boolean;
  isSavingDraftVariant: boolean;
  onOpenDrafts: () => void;
  onSaveDraftVariant: () => void;
  onPublish: () => void;
}

export function LiveEditToolbar({
  backHref,
  entryTitle,
  entryStatus,
  saveStateLabel,
  savedDraftCount,
  isDirty,
  isProductionView,
  isPublishing,
  isSavingDraftVariant,
  onOpenDrafts,
  onSaveDraftVariant,
  onPublish,
}: LiveEditToolbarProps) {
  return (
    <div className="border-b bg-background">
      <div className="flex flex-wrap items-center gap-3 px-3 py-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          render={<Link href={backHref} />}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="hidden h-5 sm:block" />

        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium">{entryTitle}</span>
            <Badge
              variant={entryStatus === "published" ? "default" : "secondary"}
              className="shrink-0"
            >
              {entryStatus}
            </Badge>
            <Badge variant="outline" className="shrink-0">
              {savedDraftCount} saved draft{savedDraftCount === 1 ? "" : "s"}
            </Badge>
            {isProductionView && (
              <Badge variant="secondary" className="shrink-0">
                Viewing production
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{saveStateLabel}</span>
            {isDirty && !isProductionView && (
              <span>Working draft pending autosave</span>
            )}
            {isProductionView && (
              <span>Switch back to Draft view to edit fields</span>
            )}
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={onOpenDrafts}>
            <FolderGit2 className="mr-2 h-3.5 w-3.5" />
            Manage Drafts
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onSaveDraftVariant}
            disabled={isPublishing || isSavingDraftVariant}
          >
            <RadioTower className="mr-2 h-3.5 w-3.5" />
            {isSavingDraftVariant ? "Saving..." : "Save As Draft"}
          </Button>
          <Button size="sm" onClick={onPublish} disabled={isPublishing}>
            <Upload className="mr-2 h-3.5 w-3.5" />
            {isPublishing ? "Publishing..." : "Publish"}
          </Button>
        </div>
      </div>
    </div>
  );
}
