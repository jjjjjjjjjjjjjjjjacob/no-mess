"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useAnalytics } from "@/hooks/use-analytics";
import { useHaptics } from "@/hooks/use-haptics";

const footerLinks = [
  { label: "Docs", href: "/docs" },
  { label: "GitHub", href: "https://github.com/no-mess", external: true },
  { label: "Twitter", href: "https://twitter.com/nomesscms", external: true },
];

export function Footer() {
  const haptic = useHaptics();
  const analytics = useAnalytics();
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    haptic("tap");
    analytics.trackNewsletterSubmitted();
  };

  return (
    <footer className="relative border-t-[5px] border-foreground bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 md:py-20">
        <div className="grid gap-10 sm:grid-cols-2 sm:gap-12 lg:grid-cols-4">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2 sm:gap-3">
              <div className="relative flex items-center gap-[3px] sm:gap-1">
                <div className="h-2.5 w-2.5 rounded-full bg-primary sm:h-3 sm:w-3" />
                <div className="h-2.5 w-2.5 rounded-full bg-accent sm:h-3 sm:w-3" />
                <div className="h-2.5 w-2.5 rounded-full bg-foreground sm:h-3 sm:w-3" />
              </div>
              <span className="font-display text-xl sm:text-2xl">NO-MESS</span>
            </Link>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground sm:mt-4 sm:text-base">
              A stupid-simple headless CMS for developers who have better things
              to do.
            </p>

            {/* Status badge */}
            <div className="mt-5 inline-flex items-center gap-2 border-[4px] border-foreground bg-primary px-3 py-1.5 shadow-brutal sm:mt-6 sm:border-[5px] sm:px-4 sm:py-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary-foreground" />
              <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-primary-foreground sm:text-[10px]">
                Beta — All Systems Go
              </span>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="mb-3 font-display text-base sm:mb-4 sm:text-lg">
              LINKS
            </h4>
            <ul className="space-y-2.5 sm:space-y-3">
              {footerLinks.map((link) => (
                <li key={link.label}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() =>
                        analytics.trackExternalLinkClicked(
                          link.href,
                          link.label,
                        )
                      }
                      className="group inline-flex items-center gap-2 py-2 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary sm:text-sm"
                    >
                      {link.label}
                      <span className="opacity-0 transition-opacity group-hover:opacity-100">
                        ↗
                      </span>
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="inline-block py-2 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary sm:text-sm"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="mb-3 font-display text-base sm:mb-4 sm:text-lg">
              STAY UPDATED
            </h4>
            <p className="mb-3 text-xs text-muted-foreground sm:mb-4 sm:text-sm">
              Get notified when we launch new features.
            </p>
            <form className="flex" onSubmit={handleSubmit}>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@email.com"
                className="min-w-0 flex-1 border-[4px] border-r-0 border-foreground bg-background px-3 py-2 font-mono text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary sm:border-[5px] sm:px-4 sm:text-sm"
              />
              <button
                type="submit"
                className="flex-shrink-0 border-[4px] border-foreground bg-foreground px-3 py-2 text-base text-background transition-colors hover:bg-primary hover:text-primary-foreground sm:border-[5px] sm:px-4 sm:text-lg"
              >
                →
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t-[4px] border-foreground safe-bottom sm:border-t-[5px]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-4 sm:flex-row sm:gap-4 sm:px-6 sm:py-6">
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground sm:text-[10px]">
            © {new Date().getFullYear()} no-mess. Built with zero bloat.
          </p>
          <div className="flex items-center gap-3">
            <Link
              href="/terms"
              className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary sm:text-[9px]"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary sm:text-[9px]"
            >
              Privacy
            </Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {["Next.js", "Convex", "TypeScript"].map((tech) => (
              <span
                key={tech}
                className="border-[1.5px] border-foreground/20 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-widest text-muted-foreground sm:border-2 sm:px-2 sm:text-[9px]"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
