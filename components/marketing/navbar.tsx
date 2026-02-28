import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { PaletteSwitcher } from "@/components/palette-switcher";
import { MobileNav } from "./mobile-nav";

export async function Navbar() {
  const { userId } = await auth();

  return (
    <header className="sticky top-0 z-50">
      {/* Announcement — electric blue bar */}
      <div className="relative overflow-hidden bg-primary py-2">
        <div className="animate-marquee flex whitespace-nowrap">
          {Array.from({ length: 8 }).map((_, i) => (
            <span
              key={`ticker-${String(i)}`}
              className="mx-8 font-mono text-xs font-bold uppercase tracking-widest text-primary-foreground"
            >
              NOW IN BETA — FREE DURING LAUNCH
              <span className="mx-4 inline-block text-accent">{"///"}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Main nav */}
      <nav className="relative border-b-[5px] border-foreground bg-background">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-2 sm:gap-3">
            {/* Three dots — tricolor mark */}
            <div className="relative flex items-center gap-[3px] sm:gap-1">
              <div className="h-3 w-3 rounded-full bg-primary sm:h-4 sm:w-4" />
              <div className="h-3 w-3 rounded-full bg-accent sm:h-4 sm:w-4" />
              <div className="h-3 w-3 rounded-full bg-foreground sm:h-4 sm:w-4" />
            </div>
            <span className="font-display text-xl sm:text-2xl">NO-MESS</span>
          </Link>

          {/* Right-side controls */}
          <div className="flex items-center gap-2">
            {/* Desktop nav items — hidden below md */}
            <div className="hidden items-center gap-2 md:flex">
              <Link
                href="/docs"
                className="px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest text-foreground transition-colors hover:text-primary"
              >
                DOCS
              </Link>

              {userId ? (
                <Link
                  href="/dashboard"
                  className="cta-skew inline-flex border-[5px] border-foreground bg-primary px-6 py-2"
                >
                  <span className="font-display text-sm text-primary-foreground">
                    DASHBOARD →
                  </span>
                </Link>
              ) : (
                <>
                  <Link
                    href="/sign-in"
                    className="px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest text-foreground transition-colors hover:text-primary"
                  >
                    SIGN IN
                  </Link>
                  <Link
                    href="/sign-up"
                    className="cta-skew inline-flex border-[5px] border-foreground bg-accent px-6 py-2"
                  >
                    <span className="flex items-center gap-2 font-display text-sm text-accent-foreground">
                      GET STARTED
                      <span className="text-base">→</span>
                    </span>
                  </Link>
                </>
              )}
            </div>

            {/* Theme + palette switcher — always visible */}
            <PaletteSwitcher />

            {/* Mobile nav */}
            <MobileNav isSignedIn={!!userId} />
          </div>
        </div>
      </nav>
    </header>
  );
}
