"use client";

import Link from "next/link";
import { forwardRef } from "react";
import { useAnalytics } from "@/hooks/use-analytics";
import { useBeatReveal } from "@/hooks/use-beat-reveal";
import { useHaptics } from "@/hooks/use-haptics";
import { cn } from "@/lib/utils";

export const CtaSection = forwardRef<HTMLElement>(function CtaSection(_, ref) {
  const isVisible = useBeatReveal(ref as React.RefObject<HTMLElement | null>);
  const haptic = useHaptics();
  const analytics = useAnalytics();

  return (
    <section
      ref={ref}
      className="scroll-beat items-center justify-center overflow-hidden border-t-[5px] border-foreground bg-foreground text-background dark:border-background"
    >
      {/* Grain */}
      <div className="grain pointer-events-none absolute inset-0 opacity-[0.06]" />

      {/* Ben-day dot overlay */}
      <div
        className="benday-dots-primary benday-gradient-radial pointer-events-none absolute inset-0 z-0"
        style={{ opacity: 0.06 }}
      />

      {/* Background geometry */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Giant circle — wrapper handles centering, inner handles animation */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="animate-shape-breathe h-[300px] w-[300px] rounded-full border-[4px] border-primary/15 sm:h-[400px] sm:w-[400px] sm:border-[6px] md:h-[500px] md:w-[500px]" />
        </div>

        {/* Ring — top-right */}
        <div
          className="animate-shape-pulse-scale absolute right-[10%] top-[12%] h-20 w-20 rounded-full border-[3px] border-accent opacity-[0.10] sm:h-24 sm:w-24 md:h-28 md:w-28 md:border-4"
          style={{ animationDelay: "1s" }}
        />

        {/* Rectangle (rotated) — bottom-left */}
        <div className="absolute bottom-[8%] left-0 -rotate-[10deg] opacity-[0.06]">
          <div className="animate-shape-drift h-16 w-36 bg-primary sm:h-18 sm:w-44 md:h-20 md:w-48" />
        </div>

        {/* Morphing blob — left-center */}
        <div
          className="animate-shape-morph absolute left-[5%] top-[40%] h-24 w-24 rounded-full bg-accent opacity-[0.04] sm:h-28 sm:w-28 md:h-32 md:w-32"
          style={{ animationDelay: "4s" }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-6">
        {/* Heading */}
        <h2
          className={cn(
            "slant-heading origin-center font-display text-[clamp(3rem,min(9vw,10svh),8rem)] transition-all duration-700 ease-out",
            isVisible ? "scale-100 opacity-100" : "scale-50 opacity-0",
          )}
        >
          READY TO
          <br />
          <span className="text-primary">SHIP?</span>
        </h2>

        {/* Subhead */}
        <p
          className={cn(
            "mx-auto mt-4 max-w-xl text-base text-background/50 transition-all duration-500 ease-out sm:mt-6 sm:text-lg md:text-xl",
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
          )}
          style={{ transitionDelay: isVisible ? "200ms" : "0ms" }}
        >
          Create your first site in under a minute.
          <br />
          <span className="font-bold text-accent">Free during beta.</span>
        </p>

        {/* CTA — BIG, skewed, unmissable */}
        <div
          className={cn(
            "mt-8 transition-all duration-600 ease-out sm:mt-10",
            isVisible
              ? "translate-y-0 scale-100 opacity-100"
              : "translate-y-10 scale-90 opacity-0",
          )}
          style={{ transitionDelay: isVisible ? "350ms" : "0ms" }}
        >
          <Link
            href="/sign-up"
            onClick={() => {
              haptic("tap");
              analytics.trackCtaClicked("GET_STARTED_FREE", "cta");
            }}
            className="cta-diagonal group relative inline-flex max-w-[90vw] border-[4px] border-background bg-accent shadow-[6px_6px_0_var(--background)] transition-shadow hover:shadow-[8px_10px_0_var(--background)] sm:border-[6px] sm:shadow-[8px_8px_0_var(--background)] sm:hover:shadow-[10px_12px_0_var(--background)]"
            style={{
              padding:
                "clamp(1.25rem, 2vw + 0.5rem, 2.25rem) clamp(2.5rem, 5vw + 0.5rem, 5rem)",
            }}
          >
            <span
              className="flex items-center gap-3 font-display text-accent-foreground sm:gap-4"
              style={{ fontSize: "clamp(1.125rem, 2vw + 0.5rem, 1.875rem)" }}
            >
              GET STARTED FREE
              <span
                className="transition-transform duration-200 group-hover:translate-x-2"
                style={{ fontSize: "clamp(1.5rem, 2vw + 0.75rem, 2.25rem)" }}
              >
                &rarr;
              </span>
            </span>
          </Link>
        </div>

        {/* Stats */}
        <div
          className={cn(
            "mt-[clamp(1.5rem,3svh,4rem)] flex flex-wrap items-center justify-center gap-8 transition-all duration-500 ease-out sm:gap-12 md:gap-16",
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
          )}
          style={{ transitionDelay: isVisible ? "500ms" : "0ms" }}
        >
          {[
            { number: "< 1MIN", label: "Setup Time" },
            { number: "\u221E", label: "Content Types" },
            { number: "$0", label: "During Beta" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="font-display text-3xl text-primary sm:text-4xl md:text-5xl">
                {stat.number}
              </div>
              <div className="mt-1.5 font-mono text-[9px] font-bold uppercase tracking-widest text-background/40 sm:mt-2 sm:text-[10px]">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 flex h-1.5 sm:h-2">
        <div className="w-1/3 bg-primary" />
        <div className="w-1/3 bg-accent" />
        <div className="w-1/3 bg-primary" />
      </div>
    </section>
  );
});
