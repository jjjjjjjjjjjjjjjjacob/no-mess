"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { DynamicForm } from "@/components/dynamic-form/dynamic-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface CreateEntryStepProps {
  siteId: Id<"sites">;
  contentTypeId: Id<"contentTypes">;
  onComplete: (data: { title: string }) => void;
}

export function CreateEntryStep({
  siteId,
  contentTypeId,
  onComplete,
}: CreateEntryStepProps) {
  const contentType = useQuery(api.contentTypes.get, { contentTypeId });
  const createEntry = useMutation(api.contentEntries.create);
  const [title, setTitle] = useState("");
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (contentType === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await createEntry({
        contentTypeId,
        title: title.trim(),
        draft: formData,
      });
      onComplete({ title: title.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create entry");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="onboarding-entry-title">Title</Label>
        <Input
          id="onboarding-entry-title"
          placeholder="My First Post"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isSubmitting}
        />
      </div>
      {contentType.fields.length > 0 && (
        <DynamicForm
          fields={contentType.fields}
          values={formData}
          onChange={setFormData}
          disabled={isSubmitting}
          siteId={siteId}
        />
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={!title.trim() || isSubmitting}>
        {isSubmitting ? "Creating..." : "Create Entry"}
      </Button>
    </form>
  );
}
