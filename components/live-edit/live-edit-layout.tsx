"use client";

import type {
  FragmentDefinition,
  NamedFieldDefinition,
} from "@no-mess/client/schema";
import { setValueAtPath } from "@no-mess/client/schema";
import { useConvex, useMutation, useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PublishCascadeDialog } from "@/components/publishing/publish-cascade-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useSite } from "@/hooks/use-site";
import { useBeforeUnload, useKeyboardSave } from "@/hooks/use-unsaved-changes";
import { LiveEditFieldPanel } from "./live-edit-field-panel";
import {
  LiveEditPreviewPanel,
  type LiveEditPreviewPanelHandle,
} from "./live-edit-preview-panel";
import { LiveEditToolbar } from "./live-edit-toolbar";

export function LiveEditLayout() {
  const { site, siteSlug } = useSite();
  const convex = useConvex();
  const params = useParams<{ typeSlug: string; entrySlug: string }>();

  const contentType = useQuery(
    api.contentTypes.getBySlug,
    site ? { siteId: site._id, slug: params.typeSlug } : "skip",
  );
  const entries = useQuery(
    api.contentEntries.listByType,
    contentType ? { contentTypeId: contentType._id } : "skip",
  );
  const contentDefinitions = useQuery(
    api.contentTypes.listBySite,
    site ? { siteId: site._id } : "skip",
  );

  const entry = entries?.find((e) => e.slug === params.entrySlug);

  const updateEntry = useMutation(api.contentEntries.update);
  const publishEntry = useMutation(api.contentEntries.publish);

  const [title, setTitle] = useState("");
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [initialized, setInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [mappedFieldNames, setMappedFieldNames] = useState<string[]>([]);
  const [showCascadeDialog, setShowCascadeDialog] = useState(false);
  const [cascadeTargets, setCascadeTargets] = useState<
    {
      kind: "template" | "fragment";
      name: string;
      slug: string;
    }[]
  >([]);
  const [pendingCascadeSlugs, setPendingCascadeSlugs] = useState<string[]>([]);

  const savedTitle = useRef("");
  const savedFormData = useRef<Record<string, unknown>>({});
  const previewPanelRef = useRef<LiveEditPreviewPanelHandle>(null);

  useEffect(() => {
    if (entry && !initialized) {
      setTitle(entry.title);
      setFormData((entry.draft as Record<string, unknown>) ?? {});
      savedTitle.current = entry.title;
      savedFormData.current = (entry.draft as Record<string, unknown>) ?? {};
      setInitialized(true);
    }
  }, [entry, initialized]);

  const isDirty =
    initialized &&
    (title !== savedTitle.current ||
      JSON.stringify(formData) !== JSON.stringify(savedFormData.current));

  const handleSave = useCallback(async () => {
    if (!entry) return;
    setIsSaving(true);
    try {
      await updateEntry({
        entryId: entry._id as Id<"contentEntries">,
        title: title.trim(),
        draft: formData,
      });
      savedTitle.current = title.trim();
      savedFormData.current = { ...formData };
      toast.success("Draft saved");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }, [entry, title, formData, updateEntry]);

  const publishEntryWithOptions = useCallback(
    async (options?: {
      cascade?: boolean;
      expectedCascadeSlugs?: string[];
    }) => {
      if (!entry) return;
      try {
        await handleSave();
        await publishEntry({
          entryId: entry._id as Id<"contentEntries">,
          cascade: options?.cascade,
          expectedCascadeSlugs: options?.expectedCascadeSlugs,
        });
        toast.success("Entry published");
        setShowCascadeDialog(false);
        setCascadeTargets([]);
        setPendingCascadeSlugs([]);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to publish");
      }
    },
    [entry, handleSave, publishEntry],
  );

  const handlePublish = useCallback(async () => {
    if (!entry) return;

    const plan = await convex.query(api.contentEntries.getPublishPlan, {
      entryId: entry._id as Id<"contentEntries">,
    });

    if (plan.cascadeTargets.length > 0) {
      setCascadeTargets(plan.cascadeTargets);
      setPendingCascadeSlugs(plan.expectedCascadeSlugs);
      setShowCascadeDialog(true);
      return;
    }

    await publishEntryWithOptions();
  }, [convex, entry, publishEntryWithOptions]);

  const handleCascadeConfirm = useCallback(async () => {
    await publishEntryWithOptions({
      cascade: true,
      expectedCascadeSlugs: pendingCascadeSlugs,
    });
  }, [pendingCascadeSlugs, publishEntryWithOptions]);

  useBeforeUnload(isDirty);
  useKeyboardSave(handleSave);

  const handleFieldChange = useCallback((fieldName: string, value: unknown) => {
    setFormData((prev) => setValueAtPath(prev, fieldName, value));
    // Send update to iframe for live preview
    previewPanelRef.current?.sendFieldUpdate(fieldName, value);
  }, []);

  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    previewPanelRef.current?.sendFieldUpdate("title", newTitle);
  }, []);

  const handleFieldFocus = useCallback((fieldName: string) => {
    setFocusedField(fieldName);
    previewPanelRef.current?.sendFieldFocus(fieldName);
  }, []);

  const handleFieldBlur = useCallback((fieldName: string) => {
    setFocusedField((prev) => (prev === fieldName ? null : prev));
    previewPanelRef.current?.sendFieldBlur(fieldName);
  }, []);

  const handleFieldMap = useCallback((fields: { fieldName: string }[]) => {
    setMappedFieldNames(fields.map((f) => f.fieldName));
  }, []);

  const handleFieldClicked = useCallback((fieldName: string) => {
    setFocusedField(fieldName);
  }, []);

  if (!site) return null;

  if (entries === undefined || contentType === undefined) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="flex h-12 items-center border-b px-4">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="flex min-h-0 flex-1">
          <Skeleton className="w-[400px]" />
          <Skeleton className="flex-1" />
        </div>
      </div>
    );
  }

  if (!entry || !contentType) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-medium">Entry not found</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This entry may have been deleted.
          </p>
        </div>
      </div>
    );
  }

  const backHref = `/sites/${siteSlug}/content/${params.typeSlug}/${params.entrySlug}`;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <LiveEditToolbar
        backHref={backHref}
        entryTitle={title || entry.title}
        entryStatus={entry.status}
        isDirty={isDirty}
        isSaving={isSaving}
        onSave={handleSave}
        onPublish={handlePublish}
      />

      <div className="grid min-h-0 flex-1 grid-cols-[400px_minmax(0,1fr)] overflow-hidden">
        {/* Field editor */}
        <LiveEditFieldPanel
          fields={contentType.fields as NamedFieldDefinition[]}
          fragments={
            (contentDefinitions?.filter(
              (definition) => definition.kind === "fragment",
            ) as FragmentDefinition[] | undefined) ?? []
          }
          mappedFieldNames={mappedFieldNames}
          title={title}
          values={formData}
          siteId={site._id}
          focusedField={focusedField}
          disabled={isSaving}
          onTitleChange={handleTitleChange}
          onFieldChange={handleFieldChange}
          onFieldFocus={handleFieldFocus}
          onFieldBlur={handleFieldBlur}
        />

        {/* Preview iframe */}
        <LiveEditPreviewPanel
          ref={previewPanelRef}
          entryId={entry._id as Id<"contentEntries">}
          previewUrl={site.previewUrl}
          liveValues={{ title, ...formData }}
          onFieldMap={handleFieldMap}
          onFieldClicked={handleFieldClicked}
        />
      </div>

      <PublishCascadeDialog
        open={showCascadeDialog}
        onOpenChange={setShowCascadeDialog}
        targets={cascadeTargets}
        isConfirming={isSaving}
        onConfirm={handleCascadeConfirm}
      />
    </div>
  );
}
