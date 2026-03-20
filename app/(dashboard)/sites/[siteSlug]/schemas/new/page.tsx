"use client";

import { useConvex, useMutation } from "convex/react";
import { Code, Save, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  ContentTypeForm,
  type ContentTypeFormData,
} from "@/components/content-types/content-type-form";
import { PublishCascadeDialog } from "@/components/publishing/publish-cascade-dialog";
import { SchemaImportDialog } from "@/components/schemas/schema-import-dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAnalytics } from "@/hooks/use-analytics";
import { useSite } from "@/hooks/use-site";

export default function NewSchemaPage() {
  const router = useRouter();
  const { site, siteSlug } = useSite();
  const convex = useConvex();
  const createDraft = useMutation(api.contentTypes.createDraft);
  const publishMutation = useMutation(api.contentTypes.publish);
  const analytics = useAnalytics();
  const formDataRef = useRef<ContentTypeFormData | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPreviewingPublish, setIsPreviewingPublish] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showCascadeDialog, setShowCascadeDialog] = useState(false);
  const [cascadeTargets, setCascadeTargets] = useState<
    {
      kind: "template" | "fragment";
      name: string;
      slug: string;
    }[]
  >([]);
  const [pendingCascadeSlugs, setPendingCascadeSlugs] = useState<string[]>([]);
  const pendingPublishDataRef = useRef<ContentTypeFormData | null>(null);
  const publishPreviewInFlightRef = useRef(false);

  if (!site) return null;

  const handleFormChange = (data: ContentTypeFormData) => {
    formDataRef.current = data;
  };

  const handleSaveAsDraft = async () => {
    const data = formDataRef.current;
    if (!data) return;
    setIsSavingDraft(true);
    try {
      await createDraft({
        siteId: site._id,
        name: data.name,
        slug: data.slug,
        kind: data.kind,
        mode: data.kind === "template" ? data.mode : undefined,
        route: data.kind === "template" ? data.route : undefined,
        description: data.description,
        fields: data.fields,
      });
      analytics.trackSchemaDraftSaved({
        site_id: site._id,
        field_count: data.fields.length,
        is_new: true,
      });
      toast.success("Draft saved");
      // Redirect to the edit page where auto-save will take over
      if (data.slug) {
        router.push(`/sites/${siteSlug}/schemas/${data.slug}`);
      } else {
        router.push(`/sites/${siteSlug}/schemas`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save draft");
    } finally {
      setIsSavingDraft(false);
    }
  };

  const publishSchema = async (
    data: ContentTypeFormData,
    options?: { cascade?: boolean; expectedCascadeSlugs?: string[] },
  ) => {
    let contentTypeId: Id<"contentTypes"> | null = null;
    setIsPublishing(true);
    try {
      contentTypeId = await createDraft({
        siteId: site._id,
        name: data.name,
        slug: data.slug,
        kind: data.kind,
        mode: data.kind === "template" ? data.mode : undefined,
        route: data.kind === "template" ? data.route : undefined,
        description: data.description,
        fields: data.fields,
      });
      await publishMutation({
        contentTypeId,
        cascade: options?.cascade,
        expectedCascadeSlugs: options?.expectedCascadeSlugs,
      });
      analytics.trackSchemaPublished({
        site_id: site._id,
        field_count: data.fields.length,
        field_types: data.fields.map((f) => f.type),
      });
      toast.success("Schema published");
      setShowCascadeDialog(false);
      setCascadeTargets([]);
      setPendingCascadeSlugs([]);
      pendingPublishDataRef.current = null;
      router.push(`/sites/${siteSlug}/schemas`);
    } catch (err) {
      if (contentTypeId) {
        router.push(
          data.slug
            ? `/sites/${siteSlug}/schemas/${data.slug}`
            : `/sites/${siteSlug}/schemas`,
        );
      }
      throw err;
    } finally {
      setIsPublishing(false);
    }
  };

  const runPublishFlow = async (
    data: ContentTypeFormData,
    options?: { cascade?: boolean; expectedCascadeSlugs?: string[] },
  ) => {
    if (isPublishing) {
      return;
    }

    if (
      !options?.cascade &&
      (publishPreviewInFlightRef.current || isPreviewingPublish)
    ) {
      return;
    }

    if (!options?.cascade) {
      publishPreviewInFlightRef.current = true;
      setIsPreviewingPublish(true);

      try {
        const plan = await convex.query(api.contentTypes.previewPublishPlan, {
          siteId: site._id,
          name: data.name,
          slug: data.slug,
          kind: data.kind,
          mode: data.kind === "template" ? data.mode : undefined,
          route: data.kind === "template" ? data.route : undefined,
          description: data.description,
          fields: data.fields,
        });

        if (plan.cascadeTargets.length > 0) {
          pendingPublishDataRef.current = data;
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
        publishPreviewInFlightRef.current = false;
        setIsPreviewingPublish(false);
      }
    }

    try {
      await publishSchema(data, options);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to publish schema",
      );
    }
  };

  const handlePublish = async (data: ContentTypeFormData) => {
    await runPublishFlow(data);
  };

  const handleCascadeConfirm = async () => {
    if (!pendingPublishDataRef.current) {
      return;
    }

    await runPublishFlow(pendingPublishDataRef.current, {
      cascade: true,
      expectedCascadeSlugs: pendingCascadeSlugs,
    });
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">New Schema</h2>
          <p className="text-sm text-muted-foreground">
            Define a new content type for your site.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              analytics.trackSchemaImported({ step: "dialog_opened" });
              setShowImportDialog(true);
            }}
          >
            <Code className="mr-2 h-3 w-3" />
            Import from Code
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveAsDraft}
            disabled={isSavingDraft || isPublishing || isPreviewingPublish}
          >
            <Save className="mr-2 h-3 w-3" />
            {isSavingDraft ? "Saving..." : "Save as Draft"}
          </Button>
          <Button
            type="submit"
            form="schema-create-form"
            size="sm"
            disabled={isPublishing || isSavingDraft || isPreviewingPublish}
          >
            <Upload className="mr-2 h-3 w-3" />
            {isPublishing ? "Publishing..." : "Publish"}
          </Button>
        </div>
      </div>
      <ContentTypeForm
        onSubmit={handlePublish}
        onChange={handleFormChange}
        siteId={site._id}
        formId="schema-create-form"
        hideSubmit
      />

      <SchemaImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        siteId={site._id}
      />

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
