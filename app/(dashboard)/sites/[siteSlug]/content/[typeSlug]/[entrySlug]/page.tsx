"use client";

import { useMutation, useQuery } from "convex/react";
import { Eye, EyeOff, MousePointerClick, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { DeliveryUrlsCard } from "@/components/content-entries/delivery-urls-card";
import {
  PreviewPanel,
  type PreviewPanelRef,
} from "@/components/content-entries/preview-panel";
import { DynamicForm } from "@/components/dynamic-form/dynamic-form";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { usePreviewRefresh } from "@/hooks/use-preview-refresh";
import { useSite } from "@/hooks/use-site";
import { useBeforeUnload, useKeyboardSave } from "@/hooks/use-unsaved-changes";
import type { FragmentDefinition } from "@/packages/no-mess-client/src/schema";

export default function EditEntryPage() {
  const router = useRouter();
  const { site, siteSlug } = useSite();
  const params = useParams<{ typeSlug: string; entrySlug: string }>();

  const contentType = useQuery(
    api.contentTypes.getBySlug,
    site ? { siteId: site._id, slug: params.typeSlug } : "skip",
  );
  const schemaDefinitions = useQuery(
    api.contentTypes.listBySite,
    site ? { siteId: site._id } : "skip",
  );
  const entries = useQuery(
    api.contentEntries.listByType,
    contentType ? { contentTypeId: contentType._id } : "skip",
  );

  const entry = entries?.find((e) => e.slug === params.entrySlug);

  const updateEntry = useMutation(api.contentEntries.update);
  const publishEntry = useMutation(api.contentEntries.publish);
  const unpublishEntry = useMutation(api.contentEntries.unpublish);
  const removeEntry = useMutation(api.contentEntries.remove);

  const [title, setTitle] = useState("");
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [initialized, setInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const fragments = useMemo(
    () =>
      (schemaDefinitions ?? [])
        .filter((definition) => definition.kind === "fragment")
        .map(
          (definition): FragmentDefinition => ({
            kind: "fragment",
            slug: definition.slug,
            name: definition.name,
            description: definition.description,
            fields: definition.fields,
          }),
        ),
    [schemaDefinitions],
  );

  const savedTitle = useRef("");
  const savedFormData = useRef<Record<string, unknown>>({});
  const previewRef = useRef<PreviewPanelRef>(null);

  useEffect(() => {
    if (entry && contentType && !initialized) {
      const initialTitle =
        contentType.kind === "template" && contentType.mode === "singleton"
          ? contentType.name
          : entry.title;
      setTitle(initialTitle);
      setFormData((entry.draft as Record<string, unknown>) ?? {});
      savedTitle.current = initialTitle;
      savedFormData.current = (entry.draft as Record<string, unknown>) ?? {};
      setInitialized(true);
    }
  }, [contentType, entry, initialized]);

  const isDirty =
    initialized &&
    (title !== savedTitle.current ||
      JSON.stringify(formData) !== JSON.stringify(savedFormData.current));

  const handlePreviewRefresh = useCallback(() => {
    previewRef.current?.refresh();
  }, []);

  const handleSave = useCallback(async () => {
    if (!entry || !contentType) return;
    const nextTitle =
      contentType.kind === "template" && contentType.mode === "singleton"
        ? contentType.name
        : title.trim();
    if (!nextTitle) return;
    setIsSaving(true);
    setError(null);
    try {
      await updateEntry({
        entryId: entry._id as Id<"contentEntries">,
        title: nextTitle,
        draft: formData,
      });
      savedTitle.current = nextTitle;
      savedFormData.current = { ...formData };
      toast.success("Draft saved");
      // Refresh preview after save to reflect persisted state
      previewRef.current?.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }, [contentType, entry, formData, title, updateEntry]);

  usePreviewRefresh({
    formData,
    title,
    isPreviewActive: showPreview && (previewRef.current?.isActive ?? false),
    onRefresh: handlePreviewRefresh,
  });

  useBeforeUnload(isDirty);
  useKeyboardSave(handleSave);

  if (!site) return null;

  if (entries === undefined || contentType === undefined) {
    return (
      <div className="max-w-2xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!entry || !contentType) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-lg font-medium">Entry not found</h2>
      </div>
    );
  }

  if (contentType.kind === "fragment") {
    return (
      <div className="py-12 text-center">
        <h2 className="text-lg font-medium">Fragments do not have entries</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This schema is a reusable fragment and can only be edited through
          templates that reference it.
        </p>
      </div>
    );
  }

  const isSingletonTemplate = contentType.mode === "singleton";

  const handlePublish = async () => {
    try {
      await handleSave();
      await publishEntry({ entryId: entry._id as Id<"contentEntries"> });
      toast.success("Entry published");
    } catch {
      toast.error("Failed to publish");
    }
  };

  const handleUnpublish = async () => {
    try {
      await unpublishEntry({ entryId: entry._id as Id<"contentEntries"> });
      toast.success("Entry unpublished");
    } catch {
      toast.error("Failed to unpublish");
    }
  };

  const handleDelete = async () => {
    try {
      await removeEntry({ entryId: entry._id as Id<"contentEntries"> });
      toast.success("Entry deleted");
      router.push(`/sites/${siteSlug}/content/${params.typeSlug}`);
    } catch {
      toast.error("Failed to delete entry");
    }
  };

  const canPreview = !!site.previewUrl;

  const editorContent = (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold tracking-tight">
            Edit: {entry.title}
          </h2>
          <Badge
            variant={entry.status === "published" ? "default" : "secondary"}
          >
            {entry.status}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {canPreview ? (
            <Button
              variant="outline"
              size="sm"
              title="Open live editor"
              render={
                <Link
                  href={`/sites/${siteSlug}/live-edit/${params.typeSlug}/${params.entrySlug}`}
                />
              }
            >
              <MousePointerClick className="mr-2 h-3 w-3" />
              Live Edit
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled
              title="Configure a preview URL in site settings"
            >
              <MousePointerClick className="mr-2 h-3 w-3" />
              Live Edit
            </Button>
          )}
          <Button
            variant={showPreview ? "default" : "outline"}
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            disabled={!canPreview}
            title={
              !canPreview
                ? "Configure a preview URL in site settings"
                : showPreview
                  ? "Close preview"
                  : "Open preview"
            }
          >
            {showPreview ? (
              <EyeOff className="mr-2 h-3 w-3" />
            ) : (
              <Eye className="mr-2 h-3 w-3" />
            )}
            Preview
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {isSingletonTemplate ? (
          <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
            Singleton templates use the template name as the entry title.
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSaving}
            />
          </div>
        )}

        <DynamicForm
          fields={contentType.fields}
          values={formData}
          onChange={setFormData}
          disabled={isSaving}
          siteId={site._id}
          fragments={fragments}
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center gap-3">
          {isDirty && (
            <span className="text-xs text-muted-foreground">
              Unsaved changes
            </span>
          )}
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Draft"}
          </Button>
          {entry.status === "draft" ? (
            <Button
              variant="outline"
              onClick={handlePublish}
              disabled={isSaving}
            >
              Save & Publish
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={handleUnpublish}
              disabled={isSaving}
            >
              Unpublish
            </Button>
          )}
        </div>

        <DeliveryUrlsCard
          entryId={entry._id as Id<"contentEntries">}
          previewUrl={site.previewUrl}
        />
      </div>
    </div>
  );

  return (
    <>
      {showPreview ? (
        <ResizablePanelGroup
          orientation="horizontal"
          className="h-[calc(100vh-8rem)]"
        >
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="h-full overflow-y-auto pr-4">{editorContent}</div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={50} minSize={25}>
            <PreviewPanel
              ref={previewRef}
              entryId={entry._id as Id<"contentEntries">}
              previewUrl={site.previewUrl}
              onClose={() => setShowPreview(false)}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <div className="max-w-2xl">{editorContent}</div>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete entry</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this entry. This action cannot be
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
