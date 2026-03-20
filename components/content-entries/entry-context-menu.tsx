"use client";

import { useConvex, useMutation } from "convex/react";
import {
  ArrowRight,
  Copy,
  MousePointerClick,
  Trash2,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { PublishCascadeDialog } from "@/components/publishing/publish-cascade-dialog";
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
import { hasPendingEntryDraft } from "@/lib/entry-draft-state";

interface EntryContextMenuProps {
  children: React.ReactNode;
  entry: {
    _id: Id<"contentEntries">;
    draft?: unknown;
    hasDraftChanges?: boolean;
    published?: unknown;
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
  const convex = useConvex();
  const { copy } = useCopyToClipboard();
  const publishEntry = useMutation(api.contentEntries.publish);
  const unpublishEntry = useMutation(api.contentEntries.unpublish);
  const removeEntry = useMutation(api.contentEntries.remove);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCascadeDialog, setShowCascadeDialog] = useState(false);
  const [cascadeTargets, setCascadeTargets] = useState<
    {
      kind: "template" | "fragment";
      name: string;
      slug: string;
    }[]
  >([]);
  const [pendingCascadeSlugs, setPendingCascadeSlugs] = useState<string[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPreviewingPublish, setIsPreviewingPublish] = useState(false);
  const publishFlowInFlightRef = useRef(false);

  const editPath = `/sites/${siteSlug}/content/${typeSlug}/${entry.slug}`;
  const hasDraftChanges =
    entry.hasDraftChanges ??
    hasPendingEntryDraft({
      status: entry.status,
      draft: entry.draft,
      published: entry.published,
    });
  const canPublishDraft = entry.status === "draft" || hasDraftChanges;

  const openEntry = () => {
    router.push(editPath);
  };

  const openLiveEdit = () => {
    router.push(`/sites/${siteSlug}/live-edit/${typeSlug}/${entry.slug}`);
  };

  const publishEntryWithOptions = async (options?: {
    cascade?: boolean;
    expectedCascadeSlugs?: string[];
  }) => {
    try {
      setIsPublishing(true);
      if (!canPublishDraft) {
        await unpublishEntry({ entryId: entry._id });
        toast.success("Entry unpublished");
      } else {
        await publishEntry({
          entryId: entry._id,
          cascade: options?.cascade,
          expectedCascadeSlugs: options?.expectedCascadeSlugs,
        });
        toast.success("Entry published");
        setShowCascadeDialog(false);
        setCascadeTargets([]);
        setPendingCascadeSlugs([]);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Failed to ${canPublishDraft ? "publish" : "unpublish"} entry`,
      );
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePublishToggle = async () => {
    if (publishFlowInFlightRef.current || isPreviewingPublish || isPublishing) {
      return;
    }

    publishFlowInFlightRef.current = true;
    setIsPreviewingPublish(true);
    try {
      if (!canPublishDraft) {
        await publishEntryWithOptions();
        return;
      }

      const plan = await convex.query(api.contentEntries.getPublishPlan, {
        entryId: entry._id,
      });

      if (plan.cascadeTargets.length > 0) {
        setCascadeTargets(plan.cascadeTargets);
        setPendingCascadeSlugs(plan.expectedCascadeSlugs);
        setShowCascadeDialog(true);
        return;
      }

      await publishEntryWithOptions();
    } catch (error) {
      console.error("Failed to load entry publish plan", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load entry publish plan",
      );
    } finally {
      publishFlowInFlightRef.current = false;
      setIsPreviewingPublish(false);
    }
  };

  const handleCascadeConfirm = async () => {
    await publishEntryWithOptions({
      cascade: true,
      expectedCascadeSlugs: pendingCascadeSlugs,
    });
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
          <ContextMenuItem
            onClick={handlePublishToggle}
            disabled={isPreviewingPublish || isPublishing}
          >
            <Upload className="h-4 w-4" />
            {entry.status === "draft"
              ? "Publish"
              : hasDraftChanges
                ? "Publish Changes"
                : "Unpublish"}
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

      <PublishCascadeDialog
        open={showCascadeDialog}
        onOpenChange={setShowCascadeDialog}
        targets={cascadeTargets}
        isConfirming={isPublishing}
        onConfirm={handleCascadeConfirm}
      />
    </>
  );
}
