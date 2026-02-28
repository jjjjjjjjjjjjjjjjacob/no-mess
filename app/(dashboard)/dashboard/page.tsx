"use client";

import { useQuery } from "convex/react";
import { Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { CreateSiteDialog } from "@/components/sites/create-site-dialog";
import { SiteCard } from "@/components/sites/site-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";

export default function DashboardPage() {
  const sites = useQuery(api.sites.listForCurrentUser);
  const [createOpen, setCreateOpen] = useState(false);
  const [showWizard, setShowWizard] = useState<boolean | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSites = useMemo(() => {
    if (!sites || !searchQuery.trim()) return sites;
    const query = searchQuery.toLowerCase();
    return sites.filter(
      (site) =>
        site.name.toLowerCase().includes(query) ||
        site.slug.toLowerCase().includes(query),
    );
  }, [sites, searchQuery]);

  useEffect(() => {
    if (sites !== undefined && showWizard === null) {
      const dismissed =
        localStorage.getItem("no-mess:onboarding-dismissed") === "true";
      setShowWizard(sites.length === 0 && !dismissed);
    }
  }, [sites, showWizard]);

  if (showWizard) {
    return (
      <OnboardingWizard
        onComplete={() => setShowWizard(false)}
        onDismiss={() => {
          localStorage.setItem("no-mess:onboarding-dismissed", "true");
          setShowWizard(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your Sites</h1>
          <p className="text-muted-foreground">
            Manage your content across all your sites.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Site
        </Button>
      </div>

      {sites === undefined ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton
              key={`skeleton-${String(i)}`}
              className="h-32 rounded-xl"
            />
          ))}
        </div>
      ) : sites.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <h3 className="text-lg font-medium">No sites yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first site to get started.
          </p>
          <Button className="mt-4" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Site
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search sites..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {searchQuery
                ? `${filteredSites?.length} of ${sites.length} sites`
                : `${sites.length} sites`}
            </p>
          </div>
          {filteredSites && filteredSites.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredSites.map((site) => (
                <SiteCard key={site._id} site={site} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <h3 className="text-lg font-medium">No matching sites</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                No sites match &ldquo;{searchQuery}&rdquo;. Try a different
                search term.
              </p>
            </div>
          )}
        </>
      )}

      <CreateSiteDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
