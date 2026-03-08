"use client";

import { useMutation } from "convex/react";
import {
  ArrowRight,
  Copy,
  MousePointerClick,
  Trash2,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

interface EntryContextMenuProps {
  children: React.ReactNode;
  entry: {
    _id: Id<"contentEntries">;
    slug: string;
    status: "draft" | "published";
    title: string;
  };
  previewUrl?: string;
  siteSlug: string;
  typeSlug: string;
}

export function EntryContextMenu({
  children,
  entry,
  previewUrl,
  siteSlug,
  typeSlug,
}: EntryContextMenuProps) {
  const router = useRouter();
  const { copy } = useCopyToClipboard();
  const publishEntry = useMutation(api.contentEntries.publish);
  const unpublishEntry = useMutation(api.contentEntries.unpublish);
  const removeEntry = useMutation(api.contentEntries.remove);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const editPath = `/sites/${siteSlug}/content/${typeSlug}/${entry.slug}`;

  const openEntry = () => {
    router.push(editPath);
  };

  const openLiveEdit = () => {
    router.push(`/sites/${siteSlug}/live-edit/${typeSlug}/${entry.slug}`);
  };

  const handlePublishToggle = async () => {
    try {
      if (entry.status === "published") {
        await unpublishEntry({ entryId: entry._id });
        toast.success("Entry unpublished");
      } else {
        await publishEntry({ entryId: entry._id });
        toast.success("Entry published");
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Failed to ${entry.status === "published" ? "unpublish" : "publish"} entry`,
      );
    }
  };

  const handleCopySlug = async () => {
    await copy(entry.slug);
    toast.success("Entry slug copied");
  };

  const handleCopyUrl = async () => {
    await copy(`${window.location.origin}${editPath}`);
    toast.success("Entry URL copied");
  };

  const handleDelete = async () => {
    try {
      await removeEntry({ entryId: entry._id });
      toast.success("Entry deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete entry",
      );
    } finally {
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger className="block">{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          <ContextMenuItem onClick={openEntry}>
            <ArrowRight className="h-4 w-4" />
            Open Entry
          </ContextMenuItem>
          {previewUrl && (
            <ContextMenuItem onClick={openLiveEdit}>
              <MousePointerClick className="h-4 w-4" />
              Open Live Edit
            </ContextMenuItem>
          )}
          <ContextMenuItem onClick={handlePublishToggle}>
            <Upload className="h-4 w-4" />
            {entry.status === "published" ? "Unpublish" : "Publish"}
          </ContextMenuItem>

          <ContextMenuSeparator />

          <ContextMenuItem onClick={handleCopySlug}>
            <Copy className="h-4 w-4" />
            Copy Slug
          </ContextMenuItem>
          <ContextMenuItem onClick={handleCopyUrl}>
            <Copy className="h-4 w-4" />
            Copy Entry URL
          </ContextMenuItem>

          <ContextMenuSeparator />

          <ContextMenuItem
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete Entry
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete entry</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {entry.title}. This action cannot be
              undone.
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
    </>
  );
}
