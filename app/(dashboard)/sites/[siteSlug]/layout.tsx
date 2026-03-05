"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalytics } from "@/hooks/use-analytics";
import { useSite } from "@/hooks/use-site";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Overview", href: "" },
  { label: "Content", href: "/content" },
  { label: "Schemas", href: "/schemas" },
  { label: "Live Edit", href: "/live-edit" },
  { label: "Media", href: "/media" },
  { label: "Shopify", href: "/shopify" },
  { label: "Settings", href: "/settings" },
];

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { site, isLoading, siteSlug } = useSite();
  const pathname = usePathname();
  const analytics = useAnalytics();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!site) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-lg font-medium">Site not found</h2>
        <p className="text-sm text-muted-foreground">
          The site &quot;{siteSlug}&quot; does not exist.
        </p>
        <Link
          href="/"
          className="mt-4 text-sm text-primary underline-offset-4 hover:underline"
        >
          Go back to dashboard
        </Link>
      </div>
    );
  }

  const basePath = `/sites/${siteSlug}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{site.name}</h1>
        <p className="text-sm text-muted-foreground">{site.slug}</p>
      </div>
      <nav className="flex gap-1 border-b overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        {tabs.map((tab) => {
          const href = `${basePath}${tab.href}`;
          const isActive =
            tab.href === "" ? pathname === basePath : pathname.startsWith(href);

          return (
            <Link
              key={tab.label}
              href={href}
              onClick={() =>
                analytics.trackTabNavigated({
                  tab: tab.label.toLowerCase().replace(" ", "-"),
                  site_id: site?._id,
                })
              }
              className={cn(
                "px-3 sm:px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap shrink-0",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      <div>{children}</div>
    </div>
  );
}
