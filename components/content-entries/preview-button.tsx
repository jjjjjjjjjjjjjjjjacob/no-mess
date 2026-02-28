"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PreviewButtonProps {
  previewUrl?: string;
  previewSecret: string;
  entrySlug: string;
  contentTypeSlug: string;
}

export function PreviewButton({
  previewUrl,
  previewSecret,
  entrySlug,
  contentTypeSlug,
}: PreviewButtonProps) {
  const handlePreview = () => {
    if (!previewUrl) return;
    const url = new URL(previewUrl);
    url.searchParams.set("preview", "true");
    url.searchParams.set("secret", previewSecret);
    url.searchParams.set("slug", entrySlug);
    url.searchParams.set("type", contentTypeSlug);
    window.open(url.toString(), "_blank");
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handlePreview}
      disabled={!previewUrl}
      title={
        !previewUrl
          ? "Configure a preview URL in site settings"
          : "Open preview in new tab"
      }
    >
      <ExternalLink className="mr-2 h-3 w-3" />
      Preview
    </Button>
  );
}
