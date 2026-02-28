"use client";

import { Suspense } from "react";
import { PaletteSwitcher } from "@/components/palette-switcher";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";

export function DashboardHeader() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      {collapsed && (
        <>
          <Separator orientation="vertical" className="mr-2 !h-4" />
          <h1 className="text-sm font-medium">no-mess</h1>
        </>
      )}
      <div className="ml-auto">
        <Suspense fallback={null}>
          <PaletteSwitcher />
        </Suspense>
      </div>
    </header>
  );
}
