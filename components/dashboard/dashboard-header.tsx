"use client";

import { useEffect, useRef } from "react";
import { DashboardBreadcrumb } from "@/components/dashboard/dashboard-breadcrumb";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { useAnalytics } from "@/hooks/use-analytics";

export function DashboardHeader() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const analytics = useAnalytics();
  const isFirstRender = useRef(true);

  // Track sidebar toggle (skip initial render)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    analytics.trackSidebarToggled({ is_collapsed: collapsed });
  }, [collapsed, analytics]);

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background px-4">
      <button
        type="button"
        onClick={toggleSidebar}
        className="flex items-center gap-[3px] md:hidden"
      >
        <span className="h-2.5 w-2.5 rounded-full bg-primary" />
        <span className="h-2.5 w-2.5 rounded-full bg-accent" />
        <span className="h-2.5 w-2.5 rounded-full bg-foreground" />
      </button>
      <SidebarTrigger />
      <DashboardBreadcrumb />
    </header>
  );
}
