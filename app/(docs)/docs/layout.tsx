import { Suspense } from "react";
import { DocsAppSidebar } from "@/components/docs/docs-app-sidebar";
import { DocsPager } from "@/components/docs/docs-pager";
import { PaletteSwitcher } from "@/components/palette-switcher";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <DocsAppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <span className="text-sm font-medium">docs</span>
          <div className="ml-auto">
            <Suspense fallback={null}>
              <PaletteSwitcher />
            </Suspense>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <article className="mx-auto max-w-3xl px-6 py-10">
            {children}
            <DocsPager />
          </article>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
