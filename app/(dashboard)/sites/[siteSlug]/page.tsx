"use client";

import { useQuery } from "convex/react";
import { ArrowRight, Files, FileText, Image, Plus, Store } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { useSite } from "@/hooks/use-site";

function getRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export default function SiteOverviewPage() {
  const { site, siteSlug } = useSite();
  const contentTypes = useQuery(
    api.contentTypes.listBySite,
    site ? { siteId: site._id } : "skip",
  );
  const entries = useQuery(
    api.contentEntries.listBySite,
    site ? { siteId: site._id } : "skip",
  );
  const assets = useQuery(
    api.assets.listBySite,
    site ? { siteId: site._id } : "skip",
  );
  const products = useQuery(
    api.shopify.listProducts,
    site?.shopifyDomain ? { siteId: site._id } : "skip",
  );

  const typeSlugMap = useMemo(() => {
    if (!contentTypes) return new Map<string, string>();
    return new Map(contentTypes.map((t) => [t._id, t.slug]));
  }, [contentTypes]);

  const recentEntries = useMemo(() => {
    if (!entries) return [];
    return [...entries].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5);
  }, [entries]);

  if (!site) return null;

  const publishedCount =
    entries?.filter((e) => e.status === "published").length ?? 0;
  const draftCount = entries?.filter((e) => e.status === "draft").length ?? 0;

  const stats = [
    {
      title: "Content Types",
      value: contentTypes?.length,
      icon: FileText,
      href: `/sites/${siteSlug}/schemas`,
    },
    {
      title: "Entries",
      value: entries?.length,
      subtitle: entries
        ? `${publishedCount} published · ${draftCount} drafts`
        : undefined,
      icon: Files,
      href: `/sites/${siteSlug}/content`,
    },
    {
      title: "Assets",
      value: assets?.length,
      icon: Image,
      href: `/sites/${siteSlug}/media`,
    },
  ];

  if (site.shopifyDomain) {
    stats.push({
      title: "Products",
      value: products?.length,
      subtitle: site.shopifyLastSyncAt
        ? `Last sync: ${new Date(site.shopifyLastSyncAt).toLocaleDateString()}`
        : "Not synced",
      icon: Store,
      href: `/sites/${siteSlug}/shopify`,
    });
  }

  const quickLinks = [
    { label: "New schema", href: `/sites/${siteSlug}/schemas/new` },
    { label: "Upload media", href: `/sites/${siteSlug}/media` },
    { label: "Site settings", href: `/sites/${siteSlug}/settings` },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {stat.value === undefined ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <>
                    <p className="text-3xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1 min-h-4">
                      {stat.subtitle ?? "\u00A0"}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          Quick Actions
        </h3>
        <div className="flex flex-wrap gap-2">
          {quickLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-muted/50"
            >
              <Plus className="h-3 w-3" />
              {link.label}
              <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Entries */}
      {entries && entries.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              Recent Entries
            </h3>
            <Link
              href={`/sites/${siteSlug}/content`}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              View all
            </Link>
          </div>
          <div className="divide-y rounded-lg border">
            {recentEntries.map((entry) => {
              const typeSlug = typeSlugMap.get(entry.contentTypeId);
              if (!typeSlug) return null;
              return (
                <Link
                  key={entry._id}
                  href={`/sites/${siteSlug}/content/${typeSlug}/${entry.slug}`}
                  className="flex items-center justify-between p-3 transition-colors hover:bg-muted/50"
                >
                  <div>
                    <p className="text-sm font-medium">{entry.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.slug}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        entry.status === "published" ? "default" : "secondary"
                      }
                    >
                      {entry.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {getRelativeTime(entry.updatedAt)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
