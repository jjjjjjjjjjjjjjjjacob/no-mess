"use client";

import type { FragmentDefinition } from "@no-mess/client/schema";
import { useMutation, useQuery } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DynamicForm } from "@/components/dynamic-form/dynamic-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useSite } from "@/hooks/use-site";
import { slugify } from "@/lib/slugify";

export default function NewEntryPage() {
  const router = useRouter();
  const { site, siteSlug } = useSite();
  const params = useParams<{ typeSlug: string }>();
  const contentType = useQuery(
    api.contentTypes.getBySlug,
    site ? { siteId: site._id, slug: params.typeSlug } : "skip",
  );
  const schemaDefinitions = useQuery(
    api.contentTypes.listBySite,
    site ? { siteId: site._id } : "skip",
  );
  const createEntry = useMutation(api.contentEntries.create);

  const [title, setTitle] = useState("");
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  if (!site) return null;

  if (contentType === undefined) {
    return (
      <div className="max-w-2xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-10 w-28" />
      </div>
    );
  }

  if (contentType === null) {
    return (
      <p className="text-center text-muted-foreground">
        Content type not found.
      </p>
    );
  }

  if (contentType.kind === "fragment") {
    return (
      <p className="text-center text-muted-foreground">
        Fragments do not have standalone entries.
      </p>
    );
  }

  const isSingletonTemplate = contentType.mode === "singleton";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextTitle = isSingletonTemplate ? contentType.name : title.trim();
    if (!nextTitle) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await createEntry({
        contentTypeId: contentType._id as Id<"contentTypes">,
        title: nextTitle,
        draft: formData,
      });
      const nextEntrySlug = isSingletonTemplate
        ? contentType.slug
        : slugify(nextTitle);
      router.push(
        site.previewUrl
          ? `/sites/${siteSlug}/live-edit/${params.typeSlug}/${nextEntrySlug}`
          : isSingletonTemplate
            ? `/sites/${siteSlug}/content/${params.typeSlug}/${contentType.slug}`
            : `/sites/${siteSlug}/content/${params.typeSlug}`,
      );
      toast.success("Entry created successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create entry");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          {isSingletonTemplate ? contentType.name : `New ${contentType.name}`}
        </h2>
        {contentType.description && (
          <p className="text-sm text-muted-foreground">
            {contentType.description}
          </p>
        )}
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        {isSingletonTemplate ? (
          <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
            Singleton templates use the template name as the entry title.
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="entry-title">Title</Label>
            <Input
              id="entry-title"
              placeholder="Entry title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        )}

        <DynamicForm
          fields={contentType.fields}
          values={formData}
          onChange={setFormData}
          disabled={isSubmitting}
          siteId={site._id}
          fragments={fragments}
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={isSubmitting || (!isSingletonTemplate && !title.trim())}
          >
            {isSubmitting ? "Creating..." : "Create Entry"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              router.push(`/sites/${siteSlug}/content/${params.typeSlug}`)
            }
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
