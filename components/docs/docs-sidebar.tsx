"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { docsNavigation } from "./docs-nav-config";

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <nav className="space-y-6">
      {docsNavigation.map((group) => (
        <div key={group.title}>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-secondary-foreground/60 font-mono">
            {group.title}
          </h4>
          <ul className="space-y-1">
            {group.items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "block px-3 py-1.5 text-sm transition-all border-l-[3px]",
                      isActive
                        ? "border-primary bg-primary/10 font-medium text-secondary-foreground"
                        : "border-transparent text-secondary-foreground/60 hover:border-primary/50 hover:text-secondary-foreground",
                    )}
                  >
                    {item.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
