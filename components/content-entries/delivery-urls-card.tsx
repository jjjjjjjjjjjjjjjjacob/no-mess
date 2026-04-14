"use client";

import { useMutation, useQuery } from "convex/react";
import { Globe, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toRelativeSiteRouteUrl } from "@/lib/preview-route";

interface DeliveryUrlsCardProps {
  entryId: Id<"contentEntries">;
  previewUrl?: string;
}

function formatRoute(url: string, previewUrl?: string) {
  if (!previewUrl) return url;

  try {
    return toRelativeSiteRouteUrl(url, previewUrl);
  } catch {
    return url;
  }
}

export function DeliveryUrlsCard({
  entryId,
  previewUrl,
}: DeliveryUrlsCardProps) {
  const routes = useQuery(api.contentEntryRoutes.listForEntry, { entryId });
  const addManualRoute = useMutation(api.contentEntryRoutes.addManual);
  const selectRoute = useMutation(api.contentEntryRoutes.select);
  const removeRoute = useMutation(api.contentEntryRoutes.remove);

  const [newUrl, setNewUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddRoute = async () => {
    if (!newUrl.trim()) return;

    setIsSubmitting(true);
    try {
      await addManualRoute({ entryId, url: newUrl.trim() });
      setNewUrl("");
      toast.success("Page URL created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add URL");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetDefault = async (url: string) => {
    try {
      await selectRoute({ entryId, url });
      toast.success("Page URL updated");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update route",
      );
    }
  };

  const handleRemove = async (routeId: Id<"contentEntryRoutes">) => {
    try {
      await removeRoute({ routeId });
      toast.success("Page URL deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove URL");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Page URLs</CardTitle>
        <CardDescription>
          Reported and manual page routes for this entry. Live Edit opens the
          default page URL first and uses it for draft and production views.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!previewUrl && (
          <p className="text-sm text-muted-foreground">
            Configure the site base URL before adding or using page URLs.
          </p>
        )}

        <div className="flex gap-2">
          <Input
            value={newUrl}
            onChange={(event) => setNewUrl(event.target.value)}
            placeholder="/blog/hello-world or https://example.com/blog/hello-world"
            disabled={isSubmitting || !previewUrl}
          />
          <Button
            onClick={handleAddRoute}
            disabled={isSubmitting || !newUrl.trim() || !previewUrl}
          >
            Add URL
          </Button>
        </div>

        {routes === undefined ? (
          <p className="text-sm text-muted-foreground">Loading URLs...</p>
        ) : routes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No page URLs yet. Once a route is reported from the site, it will
            appear here.
          </p>
        ) : (
          <div className="space-y-3">
            {routes.map((route, index) => (
              <div
                key={route._id}
                className="flex items-start justify-between gap-4 rounded-lg border p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <code className="truncate text-xs">
                      {formatRoute(route.url, previewUrl)}
                    </code>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {index === 0 && <Badge>Default</Badge>}
                    <Badge variant="secondary">
                      {route.source === "manual" ? "Manual" : "Discovered"}
                    </Badge>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSetDefault(route.url)}
                    disabled={index === 0}
                  >
                    Use as Default
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      handleRemove(route._id as Id<"contentEntryRoutes">)
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
