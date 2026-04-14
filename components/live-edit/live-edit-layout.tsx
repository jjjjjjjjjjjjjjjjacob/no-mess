"use client";

import type {
  FragmentDefinition,
  NamedFieldDefinition,
} from "@no-mess/client/schema";
import { setValueAtPath } from "@no-mess/client/schema";
import { useConvex, useMutation, useQuery } from "convex/react";
import { CheckCircle2, Circle, Loader2, Pencil, Trash2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GroupImperativeHandle } from "react-resizable-panels";
import { toast } from "sonner";
import { PublishCascadeDialog } from "@/components/publishing/publish-cascade-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useSite } from "@/hooks/use-site";
import { useBeforeUnload, useKeyboardSave } from "@/hooks/use-unsaved-changes";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "../ui/resizable";
import { LiveEditFieldPanel } from "./live-edit-field-panel";
import {
  type LiveEditPreviewMode,
  LiveEditPreviewPanel,
  type LiveEditPreviewPanelHandle,
} from "./live-edit-preview-panel";
import { LiveEditToolbar } from "./live-edit-toolbar";

const WORKING_DRAFT_VALUE = "__working_draft__";

type SavedDraft = Doc<"contentEntryDrafts">;
type PublishTargetValue = typeof WORKING_DRAFT_VALUE | Id<"contentEntryDrafts">;

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

  const entry = entries?.find(
    (candidate) => candidate.slug === params.entrySlug,
  );
  const savedDrafts = useQuery(
    api.contentEntryDrafts.listByEntry,
    entry ? { entryId: entry._id as Id<"contentEntries"> } : "skip",
  );

  const updateEntry = useMutation(api.contentEntries.update);
  const publishEntry = useMutation(api.contentEntries.publish);
  const createSavedDraft = useMutation(api.contentEntryDrafts.create);
  const renameSavedDraft = useMutation(api.contentEntryDrafts.rename);
  const removeSavedDraft = useMutation(api.contentEntryDrafts.remove);
  const loadSavedDraft = useMutation(api.contentEntryDrafts.load);

  const [title, setTitle] = useState("");
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [initialized, setInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingDraftVariant, setIsSavingDraftVariant] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPreviewingPublish, setIsPreviewingPublish] = useState(false);
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
  const [pendingPublishDraftId, setPendingPublishDraftId] = useState<
    Id<"contentEntryDrafts"> | undefined
  >(undefined);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<LiveEditPreviewMode>("draft");
  const [canViewProduction, setCanViewProduction] = useState(false);
  const [showSaveDraftDialog, setShowSaveDraftDialog] = useState(false);
  const [showManageDraftsDialog, setShowManageDraftsDialog] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [newDraftName, setNewDraftName] = useState("");
  const [renamingDraftId, setRenamingDraftId] =
    useState<Id<"contentEntryDrafts"> | null>(null);
  const [renameDraftNameValue, setRenameDraftNameValue] = useState("");
  const [draftActionId, setDraftActionId] = useState<string | null>(null);
  const [selectedPublishTarget, setSelectedPublishTarget] =
    useState<PublishTargetValue>(WORKING_DRAFT_VALUE);

  const savedTitle = useRef("");
  const savedFormData = useRef<Record<string, unknown>>({});
  const initializedEntryId = useRef<string | null>(null);
  const previewPanelRef = useRef<LiveEditPreviewPanelHandle>(null);
  const publishPreviewInFlightRef = useRef(false);
  const panelGroupRef = useRef<GroupImperativeHandle | null>(null);

  const fragments = useMemo(
    () =>
      (contentDefinitions?.filter(
        (definition) => definition.kind === "fragment",
      ) as FragmentDefinition[] | undefined) ?? [],
    [contentDefinitions],
  );

  useEffect(() => {
    if (!site) return;

    try {
      const storedLayout = window.localStorage.getItem(
        `live-edit-layout:${site._id}`,
      );
      if (!storedLayout) return;

      const parsed = JSON.parse(storedLayout) as Record<string, number>;
      if (!parsed || typeof parsed !== "object") return;

      panelGroupRef.current?.setLayout(parsed);
    } catch {
      // Ignore malformed persisted layouts and fall back to defaults.
    }
  }, [site]);

  useEffect(() => {
    if (!entry) return;
    if (initializedEntryId.current === entry._id) return;

    setTitle(entry.title);
    setFormData((entry.draft as Record<string, unknown>) ?? {});
    savedTitle.current = entry.title;
    savedFormData.current = (entry.draft as Record<string, unknown>) ?? {};
    initializedEntryId.current = entry._id;
    setInitialized(true);
    setSaveError(null);
  }, [entry]);

  useEffect(() => {
    if (!canViewProduction && viewMode === "production") {
      setViewMode("draft");
    }
  }, [canViewProduction, viewMode]);

  const isDirty =
    initialized &&
    (title !== savedTitle.current ||
      JSON.stringify(formData) !== JSON.stringify(savedFormData.current));

  const persistWorkingDraft = useCallback(
    async (options?: { notify?: boolean; silent?: boolean }) => {
      if (!entry) return false;

      const nextTitle = title.trim() || entry.title;

      setIsSaving(true);
      try {
        await updateEntry({
          entryId: entry._id as Id<"contentEntries">,
          title: nextTitle,
          draft: formData,
        });
        savedTitle.current = nextTitle;
        savedFormData.current = { ...formData };
        setLastSavedAt(Date.now());
        setSaveError(null);

        if (options?.notify) {
          toast.success("Working draft synced");
        }

        return true;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to save working draft";
        setSaveError(message);
        if (!options?.silent) {
          toast.error(message);
        }
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [entry, formData, title, updateEntry],
  );

  useEffect(() => {
    if (!initialized || !isDirty) return;

    const timeout = window.setTimeout(() => {
      void persistWorkingDraft({ silent: true });
    }, 1200);

    return () => window.clearTimeout(timeout);
  }, [initialized, isDirty, persistWorkingDraft]);

  const publishEntryWithOptions = useCallback(
    async (options?: {
      draftId?: Id<"contentEntryDrafts">;
      cascade?: boolean;
      expectedCascadeSlugs?: string[];
    }) => {
      if (!entry) return;

      setIsPublishing(true);
      try {
        const persisted = await persistWorkingDraft({ silent: true });
        if (!persisted) {
          return;
        }

        await publishEntry({
          entryId: entry._id as Id<"contentEntries">,
          draftId: options?.draftId,
          cascade: options?.cascade,
          expectedCascadeSlugs: options?.expectedCascadeSlugs,
        });

        const publishedSavedDraft =
          options?.draftId && savedDrafts
            ? savedDrafts.find((draft) => draft._id === options.draftId)
            : null;

        if (publishedSavedDraft) {
          setTitle(publishedSavedDraft.title);
          setFormData(
            (publishedSavedDraft.draft as Record<string, unknown>) ?? {},
          );
          savedTitle.current = publishedSavedDraft.title;
          savedFormData.current =
            (publishedSavedDraft.draft as Record<string, unknown>) ?? {};
        }

        setLastSavedAt(Date.now());
        setSaveError(null);
        toast.success("Entry published");
        setShowPublishDialog(false);
        setShowCascadeDialog(false);
        setCascadeTargets([]);
        setPendingCascadeSlugs([]);
        setPendingPublishDraftId(undefined);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to publish entry",
        );
      } finally {
        setIsPublishing(false);
      }
    },
    [entry, persistWorkingDraft, publishEntry, savedDrafts],
  );

  const startPublishFlow = useCallback(
    async (draftId?: Id<"contentEntryDrafts">) => {
      if (
        !entry ||
        publishPreviewInFlightRef.current ||
        isPreviewingPublish ||
        isPublishing
      ) {
        return;
      }

      publishPreviewInFlightRef.current = true;
      setIsPreviewingPublish(true);

      try {
        const persisted = await persistWorkingDraft({ silent: true });
        if (!persisted) {
          return;
        }

        const plan = await convex.query(api.contentEntries.getPublishPlan, {
          entryId: entry._id as Id<"contentEntries">,
        });

        if (plan.cascadeTargets.length > 0) {
          setPendingPublishDraftId(draftId);
          setCascadeTargets(plan.cascadeTargets);
          setPendingCascadeSlugs(plan.expectedCascadeSlugs);
          setShowCascadeDialog(true);
          setShowPublishDialog(false);
          return;
        }
      } catch (error) {
        console.error("Failed to load entry publish plan", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load entry publish plan",
        );
        return;
      } finally {
        publishPreviewInFlightRef.current = false;
        setIsPreviewingPublish(false);
      }

      await publishEntryWithOptions({ draftId });
    },
    [
      convex,
      entry,
      isPreviewingPublish,
      isPublishing,
      persistWorkingDraft,
      publishEntryWithOptions,
    ],
  );

  const handlePublishFromDialog = useCallback(async () => {
    const draftId =
      selectedPublishTarget === WORKING_DRAFT_VALUE
        ? undefined
        : selectedPublishTarget;
    await startPublishFlow(draftId);
  }, [selectedPublishTarget, startPublishFlow]);

  const handleCascadeConfirm = useCallback(async () => {
    await publishEntryWithOptions({
      draftId: pendingPublishDraftId,
      cascade: true,
      expectedCascadeSlugs: pendingCascadeSlugs,
    });
  }, [pendingCascadeSlugs, pendingPublishDraftId, publishEntryWithOptions]);

  useBeforeUnload(isDirty);
  useKeyboardSave(() => {
    void persistWorkingDraft({ notify: true });
  });

  const handleFieldChange = useCallback((fieldName: string, value: unknown) => {
    setFormData((previous) => setValueAtPath(previous, fieldName, value));
    previewPanelRef.current?.sendFieldUpdate(fieldName, value);
  }, []);

  const handleTitleChange = useCallback((nextTitle: string) => {
    setTitle(nextTitle);
    previewPanelRef.current?.sendFieldUpdate("title", nextTitle);
  }, []);

  const handleFieldFocus = useCallback((fieldName: string) => {
    setFocusedField(fieldName);
    previewPanelRef.current?.sendFieldFocus(fieldName);
  }, []);

  const handleFieldBlur = useCallback((fieldName: string) => {
    setFocusedField((previous) => (previous === fieldName ? null : previous));
    previewPanelRef.current?.sendFieldBlur(fieldName);
  }, []);

  const handleFieldMap = useCallback((fields: { fieldName: string }[]) => {
    setMappedFieldNames(fields.map((field) => field.fieldName));
  }, []);

  const handleFieldClicked = useCallback((fieldName: string) => {
    setFocusedField(fieldName);
  }, []);

  const handleLayoutChanged = useCallback(
    (layout: Record<string, number>) => {
      if (!site) return;

      window.localStorage.setItem(
        `live-edit-layout:${site._id}`,
        JSON.stringify(layout),
      );
    },
    [site],
  );

  const handleCreateSavedDraft = useCallback(async () => {
    if (!entry || !newDraftName.trim()) return;

    setIsSavingDraftVariant(true);
    try {
      const persisted = await persistWorkingDraft({ silent: true });
      if (!persisted) {
        return;
      }

      await createSavedDraft({
        entryId: entry._id as Id<"contentEntries">,
        name: newDraftName.trim(),
        title: title.trim() || entry.title,
        draft: formData,
      });
      toast.success("Saved draft created");
      setNewDraftName("");
      setShowSaveDraftDialog(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create saved draft",
      );
    } finally {
      setIsSavingDraftVariant(false);
    }
  }, [
    createSavedDraft,
    entry,
    formData,
    newDraftName,
    persistWorkingDraft,
    title,
  ]);

  const handleLoadSavedDraft = useCallback(
    async (draft: SavedDraft) => {
      setDraftActionId(String(draft._id));
      try {
        await loadSavedDraft({ draftId: draft._id });
        const nextTitle = draft.title;
        const nextDraft = (draft.draft as Record<string, unknown>) ?? {};
        setTitle(nextTitle);
        setFormData(nextDraft);
        savedTitle.current = nextTitle;
        savedFormData.current = nextDraft;
        setLastSavedAt(Date.now());
        setSaveError(null);
        setViewMode("draft");
        setShowManageDraftsDialog(false);
        toast.success("Saved draft loaded into the working draft");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to load saved draft",
        );
      } finally {
        setDraftActionId(null);
      }
    },
    [loadSavedDraft],
  );

  const handleStartRenameDraft = useCallback((draft: SavedDraft) => {
    setRenamingDraftId(draft._id);
    setRenameDraftNameValue(draft.name);
  }, []);

  const handleRenameDraft = useCallback(async () => {
    if (!renamingDraftId || !renameDraftNameValue.trim()) return;

    setDraftActionId(String(renamingDraftId));
    try {
      await renameSavedDraft({
        draftId: renamingDraftId,
        name: renameDraftNameValue.trim(),
      });
      toast.success("Saved draft renamed");
      setRenamingDraftId(null);
      setRenameDraftNameValue("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to rename saved draft",
      );
    } finally {
      setDraftActionId(null);
    }
  }, [renameDraftNameValue, renameSavedDraft, renamingDraftId]);

  const handleDeleteDraft = useCallback(
    async (draftId: Id<"contentEntryDrafts">) => {
      setDraftActionId(String(draftId));
      try {
        await removeSavedDraft({ draftId });
        toast.success("Saved draft removed");
        if (renamingDraftId === draftId) {
          setRenamingDraftId(null);
          setRenameDraftNameValue("");
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to remove saved draft",
        );
      } finally {
        setDraftActionId(null);
      }
    },
    [removeSavedDraft, renamingDraftId],
  );

  const saveStateLabel = useMemo(() => {
    if (isPublishing || isPreviewingPublish) {
      return "Preparing publish";
    }
    if (isSaving) {
      return "Autosaving working draft";
    }
    if (saveError) {
      return "Autosave failed";
    }
    if (isDirty) {
      return "Working draft changed";
    }
    if (lastSavedAt) {
      return "All changes saved";
    }
    return "Working draft autosaves";
  }, [
    isDirty,
    isPreviewingPublish,
    isPublishing,
    isSaving,
    lastSavedAt,
    saveError,
  ]);

  if (!site) return null;

  if (
    entries === undefined ||
    contentType === undefined ||
    (entry !== undefined && savedDrafts === undefined)
  ) {
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
  const entrySavedDrafts = savedDrafts ?? [];
  const publishChoices: Array<{
    value: PublishTargetValue;
    label: string;
    description: string;
    badge: string;
  }> = [
    {
      value: WORKING_DRAFT_VALUE,
      label: "Working draft",
      description: "The autosaved draft currently open in Live Edit.",
      badge: "Current",
    },
    ...entrySavedDrafts.map((draft) => ({
      value: draft._id,
      label: draft.name,
      description: draft.title,
      badge: "Saved draft",
    })),
  ];

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <LiveEditToolbar
        backHref={backHref}
        entryTitle={title || entry.title}
        entryStatus={entry.status}
        saveStateLabel={saveStateLabel}
        savedDraftCount={entrySavedDrafts.length}
        isDirty={isDirty}
        isProductionView={viewMode === "production"}
        isPublishing={isPreviewingPublish || isPublishing}
        isSavingDraftVariant={isSavingDraftVariant}
        onOpenDrafts={() => setShowManageDraftsDialog(true)}
        onSaveDraftVariant={() => {
          setNewDraftName("");
          setShowSaveDraftDialog(true);
        }}
        onPublish={() => {
          setSelectedPublishTarget(WORKING_DRAFT_VALUE);
          setShowPublishDialog(true);
        }}
      />

      <ResizablePanelGroup
        orientation="horizontal"
        className="min-h-0 flex-1"
        groupRef={panelGroupRef}
        onLayoutChanged={handleLayoutChanged}
      >
        <ResizablePanel id="fields" defaultSize={34} minSize={24} maxSize={60}>
          <div className="h-full min-h-0 min-w-0 overflow-hidden">
            <LiveEditFieldPanel
              fields={contentType.fields as NamedFieldDefinition[]}
              fragments={fragments}
              mappedFieldNames={mappedFieldNames}
              title={title}
              values={formData}
              siteId={site._id}
              focusedField={focusedField}
              disabled={isSaving || isPublishing || viewMode === "production"}
              onTitleChange={handleTitleChange}
              onFieldChange={handleFieldChange}
              onFieldFocus={handleFieldFocus}
              onFieldBlur={handleFieldBlur}
            />
          </div>
        </ResizablePanel>
        <ResizableHandle
          withHandle
          className="bg-border/80 transition-colors hover:bg-border"
        />
        <ResizablePanel id="preview" defaultSize={66} minSize={35}>
          <div className="h-full min-h-0 min-w-0 overflow-hidden">
            <LiveEditPreviewPanel
              ref={previewPanelRef}
              entryId={entry._id as Id<"contentEntries">}
              previewUrl={site.previewUrl}
              liveValues={{ title, ...formData }}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onProductionAvailabilityChange={setCanViewProduction}
              onFieldMap={handleFieldMap}
              onFieldClicked={handleFieldClicked}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      <Dialog open={showSaveDraftDialog} onOpenChange={setShowSaveDraftDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save the current working draft</DialogTitle>
            <DialogDescription>
              Create a shared named checkpoint from the draft that is currently
              open in Live Edit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="new-saved-draft-name">Draft name</Label>
              <Input
                id="new-saved-draft-name"
                placeholder="Homepage hero v2"
                value={newDraftName}
                onChange={(event) => setNewDraftName(event.target.value)}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Autosave keeps the working draft current. This creates an
              additional shared checkpoint you can load or publish later.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSaveDraftDialog(false)}
              disabled={isSavingDraftVariant}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleCreateSavedDraft()}
              disabled={isSavingDraftVariant || !newDraftName.trim()}
            >
              {isSavingDraftVariant ? "Saving..." : "Save Draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showManageDraftsDialog}
        onOpenChange={setShowManageDraftsDialog}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Manage saved drafts</DialogTitle>
            <DialogDescription>
              Load, rename, or remove the shared draft checkpoints for this
              entry. Loading a saved draft replaces the current working draft.
            </DialogDescription>
          </DialogHeader>
          {entrySavedDrafts.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              No saved drafts yet. Use <strong>Save As Draft</strong> to create
              named checkpoints from the autosaved working draft.
            </div>
          ) : (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-3 pr-4">
                {entrySavedDrafts.map((draft) => {
                  const isRenaming = renamingDraftId === draft._id;
                  const isActing = draftActionId === String(draft._id);
                  return (
                    <div
                      key={draft._id}
                      className="rounded-xl border bg-card/50 p-4"
                    >
                      {isRenaming ? (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label htmlFor={`rename-${draft._id}`}>
                              Draft name
                            </Label>
                            <Input
                              id={`rename-${draft._id}`}
                              value={renameDraftNameValue}
                              onChange={(event) =>
                                setRenameDraftNameValue(event.target.value)
                              }
                            />
                          </div>
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setRenamingDraftId(null);
                                setRenameDraftNameValue("");
                              }}
                              disabled={isActing}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => void handleRenameDraft()}
                              disabled={
                                isActing || !renameDraftNameValue.trim()
                              }
                            >
                              {isActing ? "Saving..." : "Rename"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div className="min-w-0 space-y-1">
                            <p className="truncate text-sm font-medium">
                              {draft.name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {draft.title}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void handleLoadSavedDraft(draft)}
                              disabled={isActing}
                            >
                              {isActing ? (
                                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                              ) : null}
                              Load Into Working Draft
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStartRenameDraft(draft)}
                              disabled={isActing}
                            >
                              <Pencil className="mr-2 h-3.5 w-3.5" />
                              Rename
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => void handleDeleteDraft(draft._id)}
                              disabled={isActing}
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowManageDraftsDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Choose what to publish</DialogTitle>
            <DialogDescription>
              Pick the draft content that should become production. The current
              working draft is selected by default.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[55vh]">
            <div
              role="radiogroup"
              aria-label="Publish target"
              className="space-y-3 pr-4"
            >
              {publishChoices.map((choice) => {
                const isSelected = selectedPublishTarget === choice.value;
                return (
                  <button
                    key={String(choice.value)}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50",
                    )}
                    onClick={() => setSelectedPublishTarget(choice.value)}
                  >
                    {isSelected ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                    ) : (
                      <Circle className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{choice.label}</p>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                          {choice.badge}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {choice.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPublishDialog(false)}
              disabled={isPreviewingPublish || isPublishing}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handlePublishFromDialog()}
              disabled={isPreviewingPublish || isPublishing}
            >
              {isPreviewingPublish || isPublishing
                ? "Publishing..."
                : "Publish Selected Draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PublishCascadeDialog
        open={showCascadeDialog}
        onOpenChange={setShowCascadeDialog}
        targets={cascadeTargets}
        isConfirming={isPublishing}
        onConfirm={handleCascadeConfirm}
      />
    </div>
  );
}
