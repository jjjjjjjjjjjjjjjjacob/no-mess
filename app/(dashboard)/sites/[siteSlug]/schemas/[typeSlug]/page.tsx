"use client";

import { useMutation, useQuery } from "convex/react";
import { Code, Save, Trash2, Undo2, Upload } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ContentTypeForm,
  type ContentTypeFormData,
} from "@/components/content-types/content-type-form";
import { SchemaExportPanel } from "@/components/schemas/schema-export-panel";
import { SchemaImportDialog } from "@/components/schemas/schema-import-dialog";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { useAnalytics } from "@/hooks/use-analytics";
import { useAutoSave } from "@/hooks/use-auto-save";
import { useSite } from "@/hooks/use-site";
import { useBeforeUnload, useKeyboardSave } from "@/hooks/use-unsaved-changes";
import { generateContentTypeSource } from "@/packages/no-mess-client/src/schema";

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes === 1) return "1 minute ago";
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return "1 hour ago";
  return `${hours} hours ago`;
}

export default function EditSchemaPage() {
  const router = useRouter();
  const { site, siteSlug } = useSite();
  const params = useParams<{ typeSlug: string }>();
  const contentType = useQuery(
    api.contentTypes.getBySlug,
    site ? { siteId: site._id, slug: params.typeSlug } : "skip",
  );
  const removeContentType = useMutation(api.contentTypes.remove);
  const saveDraftMutation = useMutation(api.contentTypes.saveDraft);
  const publishMutation = useMutation(api.contentTypes.publish);
  const discardDraftMutation = useMutation(api.contentTypes.discardDraft);

  const analytics = useAnalytics();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const formDataRef = useRef<ContentTypeFormData | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Derive status from content type
  const status = useMemo(() => {
    if (!contentType) return null;
    return (contentType.status ?? "published") as "draft" | "published";
  }, [contentType]);

  const hasDraft = contentType?.draft !== undefined;

  // Determine initial data: prefer draft data over published
  const initialData = useMemo(() => {
    if (!contentType) return undefined;
    if (contentType.draft) {
      const draft = contentType.draft as ContentTypeFormData;
      return {
        name: draft.name ?? contentType.name,
        slug: draft.slug ?? contentType.slug,
        description: draft.description ?? contentType.description,
        fields: draft.fields ?? contentType.fields,
      };
    }
    return {
      name: contentType.name,
      slug: contentType.slug,
      description: contentType.description,
      fields: contentType.fields,
    };
  }, [contentType]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: isDirty triggers recomputation so export reflects unsaved form data
  const exportCode = useMemo(() => {
    if (!contentType) return "";
    const source = formDataRef.current ?? contentType;
    return generateContentTypeSource({
      slug: source.slug,
      name: source.name,
      description: source.description,
      fields: source.fields,
    });
  }, [contentType, isDirty]);

  // Track form changes
  const handleFormChange = useCallback(
    (data: ContentTypeFormData) => {
      formDataRef.current = data;
      if (!initialData) return;
      const changed =
        data.name !== initialData.name ||
        data.slug !== initialData.slug ||
        (data.description ?? "") !== (initialData.description ?? "") ||
        JSON.stringify(data.fields) !== JSON.stringify(initialData.fields);
      setIsDirty(changed);
    },
    [initialData],
  );

  // Save draft handler
  const handleSaveDraft = useCallback(async () => {
    if (!contentType || !formDataRef.current) return;
    setIsSavingDraft(true);
    try {
      await saveDraftMutation({
        contentTypeId: contentType._id,
        name: formDataRef.current.name,
        slug: formDataRef.current.slug,
        description: formDataRef.current.description,
        fields: formDataRef.current.fields,
      });
      setIsDirty(false);
      analytics.trackSchemaDraftSaved({
        site_id: site?._id,
        field_count: formDataRef.current.fields.length,
        is_new: false,
      });
      toast.success("Draft saved");
    } catch {
      toast.error("Failed to save draft");
    } finally {
      setIsSavingDraft(false);
    }
  }, [contentType, saveDraftMutation, analytics, site]);

  // Auto-save wiring
  const { lastSavedAt } = useAutoSave({
    onSave: async () => {
      if (!contentType || !formDataRef.current) return;
      await saveDraftMutation({
        contentTypeId: contentType._id,
        name: formDataRef.current.name,
        slug: formDataRef.current.slug,
        description: formDataRef.current.description,
        fields: formDataRef.current.fields,
      });
      setIsDirty(false);
    },
    isDirty,
    enabled: !!contentType,
  });

  // Keyboard save
  useKeyboardSave(handleSaveDraft);
  useBeforeUnload(isDirty);

  // Publish handler
  const handlePublish = async () => {
    if (!contentType || !formDataRef.current) return;
    setIsPublishing(true);
    try {
      // Save draft first, then publish
      await saveDraftMutation({
        contentTypeId: contentType._id,
        name: formDataRef.current.name,
        slug: formDataRef.current.slug,
        description: formDataRef.current.description,
        fields: formDataRef.current.fields,
      });
      await publishMutation({ contentTypeId: contentType._id });
      setIsDirty(false);
      analytics.trackSchemaPublished({
        site_id: site?._id ?? "",
        field_count: formDataRef.current.fields.length,
        field_types: formDataRef.current.fields.map((f) => f.type),
      });
      toast.success("Schema published");
      if (formDataRef.current.slug !== contentType.slug) {
        router.replace(
          `/sites/${siteSlug}/schemas/${formDataRef.current.slug}`,
        );
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to publish schema",
      );
    } finally {
      setIsPublishing(false);
    }
  };

  // Legacy submit handler (used by the form's built-in submit)
  const handleSubmit = async (data: ContentTypeFormData) => {
    formDataRef.current = data;
    await handlePublish();
  };

  // Discard draft handler
  const handleDiscardDraft = async () => {
    if (!contentType) return;
    try {
      await discardDraftMutation({ contentTypeId: contentType._id });
      setIsDirty(false);
      analytics.trackSchemaDraftSaved({ action: "discarded" });
      toast.success("Draft discarded");
    } catch {
      toast.error("Failed to discard draft");
    }
    setShowDiscardDialog(false);
  };

  // Delete handler
  const handleDelete = async () => {
    if (!contentType) return;
    try {
      await removeContentType({ contentTypeId: contentType._id });
      analytics.trackSchemaDeleted({ site_id: site?._id ?? "" });
      toast.success("Schema deleted");
      router.push(`/sites/${siteSlug}/schemas`);
    } catch {
      toast.error("Failed to delete schema");
    }
  };

  if (!site) return null;

  if (contentType === undefined) {
    return (
      <div className="max-w-2xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (contentType === null) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-lg font-medium">Schema not found</h2>
        <p className="text-sm text-muted-foreground">
          The schema &quot;{params.typeSlug}&quot; does not exist.
        </p>
      </div>
    );
  }

  // Status badge
  const statusBadge =
    status === "draft" ? (
      <Badge variant="secondary">Draft</Badge>
    ) : hasDraft ? (
      <Badge variant="outline">Unpublished changes</Badge>
    ) : null;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Edit: {contentType.name}
            </h2>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                {contentType.slug}
              </p>
              {lastSavedAt && (
                <p className="text-xs text-muted-foreground">
                  Draft saved {formatTimeAgo(lastSavedAt)}
                </p>
              )}
            </div>
          </div>
          {statusBadge}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              analytics.trackSchemaExported({
                export_type: "single",
              });
              setShowExportDialog(true);
            }}
          >
            <Code className="mr-2 h-3 w-3" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              analytics.trackSchemaImported({ step: "dialog_opened" });
              setShowImportDialog(true);
            }}
          >
            <Code className="mr-2 h-3 w-3" />
            Import
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveDraft}
            disabled={isSavingDraft || isPublishing || !isDirty}
          >
            <Save className="mr-2 h-3 w-3" />
            {isSavingDraft ? "Saving..." : "Save Draft"}
          </Button>
          <Button
            size="sm"
            onClick={handlePublish}
            disabled={isPublishing || isSavingDraft}
          >
            <Upload className="mr-2 h-3 w-3" />
            {isPublishing ? "Publishing..." : "Publish"}
          </Button>
          {status === "published" && hasDraft && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDiscardDialog(true)}
              disabled={isSavingDraft || isPublishing}
            >
              <Undo2 className="mr-2 h-3 w-3" />
              Discard Draft
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="mr-2 h-3 w-3" />
            Delete
          </Button>
        </div>
      </div>
      <ContentTypeForm
        key={contentType._id + (contentType.draftUpdatedAt ?? "")}
        initialData={initialData}
        onSubmit={handleSubmit}
        onChange={handleFormChange}
        isEditing
        siteId={site._id}
        contentTypeId={contentType._id}
        formId="schema-edit-form"
        hideSubmit
      />

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete schema</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this schema and all its entries. This
              action cannot be undone.
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

      {/* Discard draft confirmation */}
      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard draft changes</AlertDialogTitle>
            <AlertDialogDescription>
              This will discard all unpublished changes and revert to the last
              published version. This action cannot be undone.
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

      {/* Export dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="sm:max-w-[90vw] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Export: {contentType.name}</DialogTitle>
          </DialogHeader>
          <SchemaExportPanel
            code={exportCode}
            filename={`${contentType.slug}.ts`}
          />
        </DialogContent>
      </Dialog>

      {/* Import dialog */}
      {site && (
        <SchemaImportDialog
          open={showImportDialog}
          onOpenChange={setShowImportDialog}
          siteId={site._id}
        />
      )}
    </div>
  );
}
