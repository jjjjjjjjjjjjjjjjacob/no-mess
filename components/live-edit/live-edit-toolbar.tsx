"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface LiveEditToolbarProps {
  backHref: string;
  entryTitle: string;
  entryStatus: string;
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => void;
  onPublish: () => void;
}

export function LiveEditToolbar({
  backHref,
  entryTitle,
  entryStatus,
  isDirty,
  isSaving,
  onSave,
  onPublish,
}: LiveEditToolbarProps) {
  return (
    <div className="flex h-12 shrink-0 items-center gap-3 border-b bg-background px-3">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        render={<Link href={backHref} />}
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-5" />

      <span className="truncate text-sm font-medium">{entryTitle}</span>

      <Badge
        variant={entryStatus === "published" ? "default" : "secondary"}
        className="shrink-0"
      >
        {entryStatus}
      </Badge>

      {isDirty && (
        <span className="shrink-0 text-xs text-muted-foreground">
          Unsaved changes
        </span>
      )}

      <div className="ml-auto flex items-center gap-2">
        <Button size="sm" onClick={onSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Draft"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onPublish}
          disabled={isSaving}
        >
          Save & Publish
        </Button>
      </div>
    </div>
  );
}
