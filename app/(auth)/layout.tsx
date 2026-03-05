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

        {/* Animated background shapes */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Large circle — bottom-left, breathing */}
          <div className="animate-shape-breathe absolute -bottom-32 -left-32 h-[500px] w-[500px] rounded-full bg-primary opacity-[0.1]" />

          {/* Ring — top-right, drifting */}
          <div className="animate-shape-drift absolute -right-8 top-[10%] h-32 w-32 rounded-full border-[3px] border-accent opacity-[0.12] lg:h-40 lg:w-40 lg:border-4" />

          {/* Small rotated square — mid-left, orbit */}
          <div className="absolute left-[8%] top-[55%] rotate-[20deg] opacity-[0.08]">
            <div
              className="animate-shape-orbit h-10 w-10 bg-accent lg:h-12 lg:w-12"
              style={{ animationDelay: "4s" }}
            />
          </div>

          {/* Morphing blob — upper area */}
          <div className="animate-shape-morph absolute -right-16 top-[5%] h-36 w-36 rounded-full bg-primary opacity-[0.06] lg:h-48 lg:w-48" />

          {/* Small pulsing dot */}
          <div
            className="animate-shape-pulse-scale absolute bottom-[15%] right-[20%] h-6 w-6 rounded-full bg-accent opacity-[0.14] lg:h-8 lg:w-8"
            style={{ animationDelay: "2s" }}
          />
        </div>

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
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-background px-4 py-12 sm:px-6">
        {/* Subtle grain */}
        <div className="grain pointer-events-none absolute inset-0" />

        {/* Animated background shapes */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Large breathing circle — right edge */}
          <div className="animate-shape-breathe-slow absolute -right-24 top-[20%] h-48 w-48 rounded-full bg-primary opacity-[0.06] sm:h-64 sm:w-64" />

          {/* Small drifting ring — lower-left */}
          <div
            className="animate-shape-drift absolute bottom-[12%] left-[8%] h-16 w-16 rounded-full border-[3px] border-primary opacity-[0.08] sm:h-20 sm:w-20"
            style={{ animationDelay: "6s" }}
          />

          {/* Tiny accent dot — upper area */}
          <div
            className="animate-shape-pulse-scale absolute left-[15%] top-[8%] h-5 w-5 rounded-full bg-accent opacity-[0.1] sm:h-6 sm:w-6"
            style={{ animationDelay: "3s" }}
          />
        </div>

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
