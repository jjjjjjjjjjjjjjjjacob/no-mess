import Link from "next/link";
import { Suspense } from "react";
import { PaletteSwitcher } from "@/components/palette-switcher";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-svh">
      {/* Left panel — decorative (hidden on mobile) */}
      <div className="relative hidden w-1/2 items-center justify-center overflow-hidden bg-foreground md:flex">
        {/* Grain overlay */}
        <div className="grain pointer-events-none absolute inset-0" />

        {/* Ben-day dots */}
        <div
          className="benday-dots-primary benday-gradient-corner pointer-events-none absolute inset-0"
          style={{ opacity: 0.15 }}
        />

        {/* Geometric circle */}
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-[500px] w-[500px] rounded-full bg-primary opacity-[0.08]" />

        {/* Logo + tagline */}
        <div className="relative z-10 flex flex-col items-center gap-6 px-8">
          <Link href="/" className="group flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="h-5 w-5 rounded-full bg-primary" />
              <div className="h-5 w-5 rounded-full bg-accent" />
              <div className="h-5 w-5 rounded-full bg-background" />
            </div>
            <span className="font-display text-4xl text-background">
              NO-MESS
            </span>
          </Link>
          <p className="max-w-xs text-center font-display text-lg tracking-wide text-background/60">
            HEADLESS CMS. ZERO BLOAT.
          </p>
        </div>
      </div>

      {/* Right panel — auth content */}
      <div className="relative flex flex-1 flex-col items-center justify-center bg-background px-4 py-12 sm:px-6">
        {/* Subtle grain */}
        <div className="grain pointer-events-none absolute inset-0" />

        {/* Theme toggle — top right */}
        <div className="absolute right-4 top-4 z-20">
          <Suspense>
            <PaletteSwitcher />
          </Suspense>
        </div>

        {/* Mobile logo — visible below md */}
        <Link
          href="/"
          className="relative z-10 mb-8 flex items-center gap-2 md:hidden"
        >
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full bg-primary" />
            <div className="h-3 w-3 rounded-full bg-accent" />
            <div className="h-3 w-3 rounded-full bg-foreground" />
          </div>
          <span className="font-display text-xl">NO-MESS</span>
        </Link>

        {/* Auth card container */}
        <div className="relative z-10 w-full max-w-md">{children}</div>
      </div>

      {/* Bottom tricolor bar */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex h-1.5 sm:h-2">
        <div className="w-1/3 bg-foreground" />
        <div className="w-1/3 bg-primary" />
        <div className="w-1/3 bg-accent" />
      </div>
    </div>
  );
}
