"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import {
  ArrowLeft,
  BookOpen,
  Files,
  FileText,
  Globe,
  Image,
  LayoutDashboard,
  MousePointerClick,
  Settings,
  Store,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { Suspense, useEffect, useRef } from "react";
import { PaletteSwitcher } from "@/components/palette-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";

const siteSubNav = [
  { label: "Overview", icon: LayoutDashboard, path: "" },
  { label: "Schemas", icon: FileText, path: "/schemas" },
  { label: "Content", icon: Files, path: "/content" },
  { label: "Live Edit", icon: MousePointerClick, path: "/live-edit" },
  { label: "Media", icon: Image, path: "/media" },
  { label: "Shopify", icon: Store, path: "/shopify" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const sites = useQuery(api.sites.listForCurrentUser);
  const { user } = useUser();
  const posthog = usePostHog();
  const identifiedRef = useRef(false);

  // PostHog user identification — connect anonymous events to authenticated user
  useEffect(() => {
    if (!user || !posthog || identifiedRef.current) return;
    identifiedRef.current = true;
    posthog.identify(user.id, {
      email: user.primaryEmailAddress?.emailAddress,
      name: user.fullName,
    });
  }, [user, posthog]);

  // Keep site_count person property updated
  useEffect(() => {
    if (sites === undefined || !posthog) return;
    posthog.setPersonProperties({ site_count: sites.length });
  }, [sites, posthog]);

  const siteSlugMatch = pathname.match(/^\/sites\/([^/]+)/);
  const activeSiteSlug = siteSlugMatch ? siteSlugMatch[1] : null;
  const activeSite = activeSiteSlug
    ? sites?.find((s) => s.slug === activeSiteSlug)
    : null;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 shrink-0 flex-row items-center px-4 border-b group-data-[collapsible=icon]:justify-start group-data-[collapsible=icon]:px-0">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 transition-all duration-200"
        >
          <span className="flex items-center gap-[3px] transition-all duration-200 group-data-[collapsible=icon]:rotate-90 group-data-[collapsible=icon]:scale-75">
            <span className="h-3 w-3 rounded-full bg-primary" />
            <span className="h-3 w-3 rounded-full bg-accent" />
            <span className="h-3 w-3 rounded-full bg-sidebar-foreground" />
          </span>
          <span className="font-display font-semibold text-lg whitespace-nowrap overflow-hidden transition-all duration-200 max-w-40 group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0">
            no-mess
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {activeSiteSlug ? (
          <>
            <SidebarGroup>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link href="/dashboard" />}
                    tooltip="Dashboard"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Dashboard</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>
                {activeSite?.name ?? activeSiteSlug}
              </SidebarGroupLabel>
              <SidebarMenu>
                {siteSubNav.map((item) => {
                  const href = `/sites/${activeSiteSlug}${item.path}`;
                  const isActiveSubItem =
                    item.path === ""
                      ? pathname === `/sites/${activeSiteSlug}`
                      : pathname.startsWith(href);
                  return (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        render={<Link href={href} />}
                        isActive={isActiveSubItem}
                        tooltip={item.label}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          </>
        ) : (
          <SidebarGroup>
            <SidebarGroupLabel>Sites</SidebarGroupLabel>
            <SidebarMenu>
              {sites === undefined ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <SidebarMenuItem key={`skeleton-${String(i)}`}>
                    <SidebarMenuButton>
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 w-24" />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              ) : sites.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">
                  No sites yet
                </p>
              ) : (
                sites.map((site) => (
                  <SidebarMenuItem key={site._id}>
                    <SidebarMenuButton
                      render={<Link href={`/sites/${site.slug}`} />}
                      isActive={pathname.startsWith(`/sites/${site.slug}`)}
                      tooltip={site.name}
                    >
                      <Globe className="h-4 w-4" />
                      <span>{site.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroup>
        )}
        <SidebarGroup>
          <SidebarGroupLabel>Resources</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link href="/docs" />}
                tooltip="Documentation"
              >
                <BookOpen className="h-4 w-4" />
                <span>Documentation</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-2">
        <Suspense fallback={null}>
          <PaletteSwitcher variant="sidebar" />
        </Suspense>
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center px-2 py-1 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-0">
          <UserButton afterSignOutUrl="/" />
          <span className="text-sm text-muted-foreground truncate group-data-[collapsible=icon]:hidden">
            Account
          </span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
