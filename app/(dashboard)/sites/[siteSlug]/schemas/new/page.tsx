"use client";

import { useMutation } from "convex/react";
import { Code, Save, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  ContentTypeForm,
  type ContentTypeFormData,
} from "@/components/content-types/content-type-form";
import { SchemaImportDialog } from "@/components/schemas/schema-import-dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useAnalytics } from "@/hooks/use-analytics";
import { useSite } from "@/hooks/use-site";

export default function NewSchemaPage() {
  const router = useRouter();
  const { site, siteSlug } = useSite();
  const createDraft = useMutation(api.contentTypes.createDraft);
  const publishMutation = useMutation(api.contentTypes.publish);
  const analytics = useAnalytics();
  const formDataRef = useRef<ContentTypeFormData | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

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

  const handlePublish = async (data: ContentTypeFormData) => {
    setIsPublishing(true);
    try {
      const contentTypeId = await createDraft({
        siteId: site._id,
        name: data.name,
        slug: data.slug,
        kind: data.kind,
        mode: data.kind === "template" ? data.mode : undefined,
        route: data.kind === "template" ? data.route : undefined,
        description: data.description,
        fields: data.fields,
      });
      await publishMutation({ contentTypeId });
      analytics.trackSchemaPublished({
        site_id: site._id,
        field_count: data.fields.length,
        field_types: data.fields.map((f) => f.type),
      });
      toast.success("Schema published");
      router.push(`/sites/${siteSlug}/schemas`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to publish schema",
      );
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">New Schema</h2>
          <p className="text-sm text-muted-foreground">
            Define a new content type for your site.
          </p>
        </div>
        <div className="flex items-center gap-2">
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
            disabled={isSavingDraft || isPublishing}
          >
            <Save className="mr-2 h-3 w-3" />
            {isSavingDraft ? "Saving..." : "Save as Draft"}
          </Button>
          <Button
            type="submit"
            form="schema-create-form"
            size="sm"
            disabled={isPublishing || isSavingDraft}
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
    </div>
  );
}
