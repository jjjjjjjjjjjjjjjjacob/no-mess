"use client";

import { UserButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import {
  BookOpen,
  Files,
  FileText,
  Globe,
  Image,
  MousePointerClick,
  Settings,
  Store,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { ThemeToggle } from "./theme-toggle";

const siteSubNav = [
  { label: "Overview", icon: Globe, path: "" },
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

  const siteSlugMatch = pathname.match(/^\/sites\/([^/]+)/);
  const activeSiteSlug = siteSlugMatch ? siteSlugMatch[1] : null;

  return (
    <Sidebar>
      <SidebarHeader className="h-14 shrink-0 flex-row items-center px-4 border-b">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-display font-semibold text-lg"
        >
          <span>no-mess</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
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
              sites.map((site) => {
                const isActiveSite = activeSiteSlug === site.slug;
                return (
                  <SidebarMenuItem key={site._id}>
                    <SidebarMenuButton
                      render={<Link href={`/sites/${site.slug}`} />}
                      isActive={pathname.startsWith(`/sites/${site.slug}`)}
                    >
                      <Globe className="h-4 w-4" />
                      <span>{site.name}</span>
                    </SidebarMenuButton>
                    {isActiveSite && (
                      <SidebarMenuSub>
                        {siteSubNav.map((item) => {
                          const href = `/sites/${site.slug}${item.path}`;
                          const isActiveSubItem =
                            item.path === ""
                              ? pathname === href
                              : pathname.startsWith(href);
                          return (
                            <SidebarMenuSubItem key={item.label}>
                              <SidebarMenuSubButton
                                render={<Link href={href} />}
                                isActive={isActiveSubItem}
                              >
                                <item.icon className="h-4 w-4" />
                                <span>{item.label}</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    )}
                  </SidebarMenuItem>
                );
              })
            )}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Resources</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton render={<Link href="/docs" />}>
                <BookOpen className="h-4 w-4" />
                <span>Documentation</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t">
        <div className="flex items-center gap-3">
          <UserButton afterSignOutUrl="/" />
          <span className="text-sm text-muted-foreground truncate">
            Account
          </span>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
