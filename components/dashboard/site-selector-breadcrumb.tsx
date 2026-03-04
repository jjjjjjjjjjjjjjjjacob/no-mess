"use client";

import { useQuery } from "convex/react";
import { ChevronsUpDown, Globe } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/convex/_generated/api";

interface SiteSelectorBreadcrumbProps {
  currentSiteName: string;
}

export function SiteSelectorBreadcrumb({
  currentSiteName,
}: SiteSelectorBreadcrumbProps) {
  const sites = useQuery(api.sites.listForCurrentUser);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium hover:text-foreground/80 transition-colors cursor-pointer rounded-full border border-border/50 px-2.5 py-0.5 hover:border-border hover:bg-muted/50">
        {currentSiteName}
        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {sites?.map((site) => (
          <DropdownMenuItem
            key={site._id}
            render={<Link href={`/sites/${site.slug}`} />}
          >
            <Globe className="h-4 w-4" />
            {site.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
