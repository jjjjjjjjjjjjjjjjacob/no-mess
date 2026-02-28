"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// Map known path segments to display labels
const segmentLabels: Record<string, string> = {
  dashboard: "Dashboard",
  sites: "Sites",
  schemas: "Schemas",
  content: "Content",
  media: "Media",
  settings: "Settings",
  shopify: "Shopify",
  new: "New",
};

function getLabel(segment: string): string {
  return segmentLabels[segment] || segment;
}

export function DashboardBreadcrumb() {
  const pathname = usePathname();

  // Don't show breadcrumbs on the dashboard root
  if (pathname === "/dashboard") return null;

  const segments = pathname.split("/").filter(Boolean);

  // Build breadcrumb items: each has a label and href
  const items: { label: string; href: string }[] = [];

  // Always start with Dashboard
  items.push({ label: "Dashboard", href: "/dashboard" });

  // Build cumulative path
  let currentPath = "";
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;

    // Skip "dashboard" (already added) and "sites" (not a page)
    if (segment === "dashboard" || segment === "sites") continue;

    items.push({ label: getLabel(segment), href: currentPath });
  }

  if (items.length <= 1) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <Fragment key={item.href}>
              {index > 0 && <BreadcrumbSeparator />}
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
  );
}
