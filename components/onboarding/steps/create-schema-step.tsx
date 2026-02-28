"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import {
  ContentTypeForm,
  type ContentTypeFormData,
} from "@/components/content-types/content-type-form";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface CreateSchemaStepProps {
  siteId: Id<"sites">;
  onComplete: (data: {
    contentTypeId: Id<"contentTypes">;
    slug: string;
    name: string;
  }) => void;
}

export function CreateSchemaStep({
  siteId,
  onComplete,
}: CreateSchemaStepProps) {
  const createContentType = useMutation(api.contentTypes.create);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(data: ContentTypeFormData) {
    setError(null);

    try {
      const contentTypeId = await createContentType({
        siteId,
        name: data.name,
        slug: data.slug,
        description: data.description,
        fields: data.fields,
      });
      onComplete({ contentTypeId, slug: data.slug, name: data.name });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create content type",
      );
      throw err;
    }
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <ContentTypeForm onSubmit={handleSubmit} />
    </div>
  );
}
