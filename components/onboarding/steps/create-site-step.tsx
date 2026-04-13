"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { slugify } from "@/lib/slugify";

interface CreateSiteStepProps {
  onComplete: (data: {
    siteId: Id<"sites">;
    slug: string;
    name: string;
  }) => void;
}

export function CreateSiteStep({ onComplete }: CreateSiteStepProps) {
  const createSite = useMutation(api.sites.create);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlugTouched(true);
    setSlug(slugify(value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const siteId = await createSite({
        name: name.trim(),
        slug: slug.trim(),
      });
      onComplete({ siteId, slug: slug.trim(), name: name.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create site");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="onboarding-site-name">Site Name</Label>
        <Input
          id="onboarding-site-name"
          placeholder="My Site"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          disabled={isSubmitting}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="onboarding-site-slug">Slug</Label>
        <Input
          id="onboarding-site-slug"
          placeholder="my-site"
          value={slug}
          onChange={(e) => handleSlugChange(e.target.value)}
          disabled={isSubmitting}
        />
        <p className="text-xs text-muted-foreground">
          Used in URLs and API endpoints.
        </p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        type="submit"
        disabled={!name.trim() || !slug.trim() || isSubmitting}
      >
        {isSubmitting ? "Creating..." : "Create Site"}
      </Button>
    </form>
  );
}
