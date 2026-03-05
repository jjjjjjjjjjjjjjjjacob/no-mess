"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { SiteSelectorBreadcrumb } from "@/components/dashboard/site-selector-breadcrumb";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { api } from "@/convex/_generated/api";

const segmentLabels: Record<string, string> = {
  schemas: "Schemas",
  content: "Content",
  media: "Media",
  settings: "Settings",
  shopify: "Shopify",
  "live-edit": "Live Edit",
  new: "New",
};

function getLabel(segment: string): string {
  return segmentLabels[segment] || segment;
}

export function DashboardBreadcrumb() {
  const pathname = usePathname();

  const siteSlugMatch = pathname.match(/^\/sites\/([^/]+)/);
  const activeSiteSlug = siteSlugMatch ? siteSlugMatch[1] : null;

  if (!activeSiteSlug) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Dashboard</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  return <SiteBreadcrumb siteSlug={activeSiteSlug} pathname={pathname} />;
}

function SiteBreadcrumb({
  siteSlug,
  pathname,
}: {
  siteSlug: string;
  pathname: string;
}) {
  const site = useQuery(api.sites.getBySlug, { slug: siteSlug });

  // Get path segments after /sites/[slug]
  const afterSite = pathname
    .replace(`/sites/${siteSlug}`, "")
    .split("/")
    .filter(Boolean);

  const items: { label: string; href: string }[] = [];
  let currentPath = `/sites/${siteSlug}`;
  for (const segment of afterSite) {
    currentPath += `/${segment}`;
    items.push({ label: getLabel(segment), href: currentPath });
  }

  return (
    <div className="min-w-0 overflow-hidden [direction:rtl]">
      <Breadcrumb className="w-max [direction:ltr]">
        <BreadcrumbList>
          <BreadcrumbItem>
            {items.length === 0 ? (
              <BreadcrumbPage>
                <SiteSelectorBreadcrumb
                  currentSiteName={site?.name ?? siteSlug}
                />
              </BreadcrumbPage>
            ) : (
              <SiteSelectorBreadcrumb
                currentSiteName={site?.name ?? siteSlug}
              />
            )}
          </BreadcrumbItem>
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <Fragment key={item.href}>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage>{item.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink render={<Link href={item.href} />}>
                      {item.label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
