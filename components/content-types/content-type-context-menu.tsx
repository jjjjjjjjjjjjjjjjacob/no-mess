"use client";

import {
  type ContentTypeDefinition,
  generateContentTypeSource,
  type NamedFieldDefinition,
} from "@no-mess/client/schema";
import { useConvex, useMutation, useQuery } from "convex/react";
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
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { PublishCascadeDialog } from "@/components/publishing/publish-cascade-dialog";
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

interface ContentTypeContextMenuProps {
  children: React.ReactNode;
  onImportFromCode?: () => void;
  siteId: Id<"sites">;
  siteSlug: string;
  type: {
    _id: Id<"contentTypes">;
    description?: string;
    fields: NamedFieldDefinition[];
    hasDraft: boolean;
    kind?: ContentTypeDefinition["kind"];
    mode?: "singleton" | "collection";
    name: string;
    route?: string;
    slug: string;
    status: "draft" | "published";
  };
}

function normalizeContentTypeSource(source: {
  description?: string;
  fields: NamedFieldDefinition[];
  kind?: ContentTypeDefinition["kind"];
  mode?: "singleton" | "collection";
  name: string;
  route?: string;
  slug: string;
}): ContentTypeDefinition {
  const kind = source.kind === "fragment" ? "fragment" : "template";

  if (kind === "fragment") {
    return {
      kind,
      slug: source.slug,
      name: source.name,
      description: source.description,
      fields: source.fields,
    };
  }

  return {
    kind,
    slug: source.slug,
    name: source.name,
    mode: source.mode === "singleton" ? "singleton" : "collection",
    route: source.route,
    description: source.description,
    fields: source.fields,
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
  const convex = useConvex();
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
  const publishPlanInFlightRef = useRef(false);

  const source = useMemo<ContentTypeDefinition>(() => {
    if (!contentType) {
      return normalizeContentTypeSource(type);
    }

    if (!contentType.draft) {
      return normalizeContentTypeSource(contentType);
    }

    return normalizeContentTypeSource({
      ...contentType,
      name: contentType.draft.name ?? contentType.name,
      slug: contentType.draft.slug ?? contentType.slug,
      kind: contentType.draft.kind ?? contentType.kind,
      mode: contentType.draft.mode ?? contentType.mode,
      route: contentType.draft.route ?? contentType.route,
      description: contentType.draft.description ?? contentType.description,
      fields: contentType.draft.fields ?? contentType.fields,
    });
  }, [contentType, type]);

  const exportCode = useMemo(
    () =>
      generateContentTypeSource(
        source.kind === "fragment"
          ? {
              kind: "fragment",
              slug: source.slug,
              name: source.name,
              description: source.description,
              fields: source.fields,
            }
          : {
              kind: "template",
              slug: source.slug,
              name: source.name,
              mode: source.mode === "singleton" ? "singleton" : "collection",
              route: source.route,
              description: source.description,
              fields: source.fields,
            },
      ),
    [source],
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

  const publishSchema = async (options?: {
    cascade?: boolean;
    expectedCascadeSlugs?: string[];
  }) => {
    setIsPublishing(true);
    try {
      await publishMutation({
        contentTypeId: type._id,
        cascade: options?.cascade,
        expectedCascadeSlugs: options?.expectedCascadeSlugs,
      });
      analytics.trackSchemaPublished({
        site_id: siteId,
        field_count: source.fields.length,
        field_types: source.fields.map((field) => field.type),
      });
      toast.success("Schema published");
      setShowCascadeDialog(false);
      setCascadeTargets([]);
      setPendingCascadeSlugs([]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to publish schema",
      );
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePublish = async () => {
    if (publishPlanInFlightRef.current || isPreviewingPublish || isPublishing) {
      return;
    }

    publishPlanInFlightRef.current = true;
    setIsPreviewingPublish(true);

    try {
      const plan = await convex.query(api.contentTypes.getPublishPlan, {
        contentTypeId: type._id,
      });

      if (plan.cascadeTargets.length > 0) {
        setCascadeTargets(plan.cascadeTargets);
        setPendingCascadeSlugs(plan.expectedCascadeSlugs);
        setShowCascadeDialog(true);
        return;
      }
    } catch (error) {
      console.error("Failed to load schema publish plan", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load schema publish plan",
      );
      return;
    } finally {
      publishPlanInFlightRef.current = false;
      setIsPreviewingPublish(false);
    }

    await publishSchema();
  };

  const handleCascadeConfirm = async () => {
    await publishSchema({
      cascade: true,
      expectedCascadeSlugs: pendingCascadeSlugs,
    });
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

  const isEntryBearing = source.kind === "template";
  const isSingletonTemplate =
    source.kind === "template" && source.mode === "singleton";

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger className="block">{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          {isEntryBearing && (
            <ContextMenuItem onClick={openEntries}>
              <ArrowRight className="h-4 w-4" />
              {isSingletonTemplate ? "Open Entry" : "Open Entries"}
            </ContextMenuItem>
          )}
          <ContextMenuItem onClick={openSchema}>
            <FileText className="h-4 w-4" />
            Edit Schema
          </ContextMenuItem>
          {isEntryBearing && !isSingletonTemplate && (
            <ContextMenuItem onClick={createEntry}>
              <Plus className="h-4 w-4" />
              New Entry
            </ContextMenuItem>
          )}

          {(type.status === "draft" || type.hasDraft || onImportFromCode) && (
            <ContextMenuSeparator />
          )}

          {(type.status === "draft" || type.hasDraft) && (
            <ContextMenuItem
              onClick={handlePublish}
              disabled={isPreviewingPublish || isPublishing}
            >
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
              This will permanently delete {type.name}
              {isEntryBearing ? " and all of its entries" : ""}. This action
              cannot be undone.
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

      <PublishCascadeDialog
        open={showCascadeDialog}
        onOpenChange={setShowCascadeDialog}
        targets={cascadeTargets}
        isConfirming={isPublishing}
        onConfirm={handleCascadeConfirm}
      />

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
