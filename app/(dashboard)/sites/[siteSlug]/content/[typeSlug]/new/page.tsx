"use client";

import { useMutation, useQuery } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { DynamicForm } from "@/components/dynamic-form/dynamic-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useSite } from "@/hooks/use-site";

export default function NewEntryPage() {
  const router = useRouter();
  const { site, siteSlug } = useSite();
  const params = useParams<{ typeSlug: string }>();
  const contentType = useQuery(
    api.contentTypes.getBySlug,
    site ? { siteId: site._id, slug: params.typeSlug } : "skip",
  );
  const createEntry = useMutation(api.contentEntries.create);

  const [title, setTitle] = useState("");
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await createEntry({
        contentTypeId: contentType._id as Id<"contentTypes">,
        title: title.trim(),
        draft: formData,
      });
      router.push(`/sites/${siteSlug}/content/${params.typeSlug}`);
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
          New {contentType.name}
        </h2>
        {contentType.description && (
          <p className="text-sm text-muted-foreground">
            {contentType.description}
          </p>
        )}
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
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

        <DynamicForm
          fields={contentType.fields}
          values={formData}
          onChange={setFormData}
          disabled={isSubmitting}
          siteId={site._id}
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isSubmitting || !title.trim()}>
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
