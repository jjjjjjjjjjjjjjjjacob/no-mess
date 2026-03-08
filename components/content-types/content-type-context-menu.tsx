"use client";

import { useMutation, useQuery } from "convex/react";
import {
  ArrowRight,
  Code,
  Copy,
  FileText,
  Plus,
  Trash2,
  Undo2,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { SchemaExportPanel } from "@/components/schemas/schema-export-panel";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAnalytics } from "@/hooks/use-analytics";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import {
  type FieldDefinition,
  generateContentTypeSource,
} from "@/packages/no-mess-client/src/schema";

interface ContentTypeContextMenuProps {
  children: React.ReactNode;
  onImportFromCode?: () => void;
  siteId: Id<"sites">;
  siteSlug: string;
  type: {
    _id: Id<"contentTypes">;
    description?: string;
    fields: FieldDefinition[];
    hasDraft: boolean;
    name: string;
    slug: string;
    status: "draft" | "published";
  };
}

export function ContentTypeContextMenu({
  children,
  onImportFromCode,
  siteId,
  siteSlug,
  type,
}: ContentTypeContextMenuProps) {
  const router = useRouter();
  const analytics = useAnalytics();
  const { copy } = useCopyToClipboard();
  const contentType = useQuery(api.contentTypes.get, {
    contentTypeId: type._id,
  });
  const publishMutation = useMutation(api.contentTypes.publish);
  const discardDraftMutation = useMutation(api.contentTypes.discardDraft);
  const removeContentType = useMutation(api.contentTypes.remove);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  const source = useMemo(() => {
    if (!contentType) return type;
    if (!contentType.draft) return contentType;

    return {
      ...contentType,
      name: contentType.draft.name ?? contentType.name,
      slug: contentType.draft.slug ?? contentType.slug,
      description: contentType.draft.description ?? contentType.description,
      fields: contentType.draft.fields ?? contentType.fields,
    };
  }, [contentType, type]);

  const exportCode = useMemo(
    () =>
      generateContentTypeSource({
        slug: source.slug,
        name: source.name,
        description: source.description,
        fields: source.fields,
      }),
    [source.description, source.fields, source.name, source.slug],
  );

  const openSchema = () => {
    router.push(`/sites/${siteSlug}/schemas/${type.slug}`);
  };

  const openEntries = () => {
    router.push(`/sites/${siteSlug}/content/${type.slug}`);
  };

  const createEntry = () => {
    router.push(`/sites/${siteSlug}/content/${type.slug}/new`);
  };

  const handleCopySlug = async () => {
    await copy(type.slug);
    toast.success("Schema slug copied");
  };

  const handleCopyCode = async () => {
    await copy(exportCode);
    analytics.trackSchemaExported({
      export_type: "single",
      method: "copy",
    });
    toast.success("Schema code copied");
  };

  const handlePublish = async () => {
    try {
      await publishMutation({ contentTypeId: type._id });
      analytics.trackSchemaPublished({
        site_id: siteId,
        field_count: source.fields.length,
        field_types: source.fields.map((field: FieldDefinition) => field.type),
      });
      toast.success("Schema published");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to publish schema",
      );
    }
  };

  const handleDiscardDraft = async () => {
    try {
      await discardDraftMutation({ contentTypeId: type._id });
      analytics.trackSchemaDraftSaved({ action: "discarded" });
      toast.success("Draft discarded");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to discard draft",
      );
    } finally {
      setShowDiscardDialog(false);
    }
  };

  const handleDelete = async () => {
    try {
      await removeContentType({ contentTypeId: type._id });
      analytics.trackSchemaDeleted({ site_id: siteId });
      toast.success("Schema deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete schema",
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
          <ContextMenuItem onClick={openEntries}>
            <ArrowRight className="h-4 w-4" />
            Open Entries
          </ContextMenuItem>
          <ContextMenuItem onClick={openSchema}>
            <FileText className="h-4 w-4" />
            Edit Schema
          </ContextMenuItem>
          <ContextMenuItem onClick={createEntry}>
            <Plus className="h-4 w-4" />
            New Entry
          </ContextMenuItem>

          {(type.status === "draft" || type.hasDraft || onImportFromCode) && (
            <ContextMenuSeparator />
          )}

          {(type.status === "draft" || type.hasDraft) && (
            <ContextMenuItem onClick={handlePublish}>
              <Upload className="h-4 w-4" />
              {type.status === "draft" ? "Publish Schema" : "Publish Changes"}
            </ContextMenuItem>
          )}

          {type.status === "published" && type.hasDraft && (
            <ContextMenuItem onClick={() => setShowDiscardDialog(true)}>
              <Undo2 className="h-4 w-4" />
              Discard Draft
            </ContextMenuItem>
          )}

          {onImportFromCode && (
            <ContextMenuItem onClick={onImportFromCode}>
              <Code className="h-4 w-4" />
              Import from Code
            </ContextMenuItem>
          )}

          <ContextMenuSeparator />

          <ContextMenuItem onClick={() => setShowExportDialog(true)}>
            <Code className="h-4 w-4" />
            Export Schema
          </ContextMenuItem>
          <ContextMenuItem onClick={handleCopyCode}>
            <Copy className="h-4 w-4" />
            Copy Schema Code
          </ContextMenuItem>
          <ContextMenuItem onClick={handleCopySlug}>
            <Copy className="h-4 w-4" />
            Copy Slug
          </ContextMenuItem>

          <ContextMenuSeparator />

          <ContextMenuItem
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete Schema
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete schema</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {type.name} and all of its entries.
              This action cannot be undone.
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

      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard draft changes</AlertDialogTitle>
            <AlertDialogDescription>
              This will discard unpublished changes for {type.name} and revert
              to the last published version.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDiscardDraft}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="sm:max-w-[90vw] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Export: {type.name}</DialogTitle>
          </DialogHeader>
          <SchemaExportPanel code={exportCode} filename={`${type.slug}.ts`} />
        </DialogContent>
      </Dialog>
    </>
  );
}
