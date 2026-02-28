"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { DocsSidebar } from "./docs-sidebar";

export function DocsAppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader className="h-14 shrink-0 flex-row items-center px-4 border-b">
        <Link
          href="/"
          className="flex items-center gap-2 font-display font-semibold text-lg"
        >
          <span>no-mess</span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-4 py-6">
        <DocsSidebar />
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          render={<Link href="/dashboard" />}
        >
          Back to Dashboard
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
