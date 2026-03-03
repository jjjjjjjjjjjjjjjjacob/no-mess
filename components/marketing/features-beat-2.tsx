"use client";

import { forwardRef } from "react";
import { useBeatReveal } from "@/hooks/use-beat-reveal";
import { cn } from "@/lib/utils";
import { features } from "./features-data";

export const FeaturesBeat2 = forwardRef<HTMLElement>(
  function FeaturesBeat2(_, ref) {
    const isVisible = useBeatReveal(ref as React.RefObject<HTMLElement | null>);

    const cards = features.slice(3, 6);

    return (
      <section
        ref={ref}
        className={cn(
          "scroll-beat border-t-[5px] border-foreground bg-secondary text-secondary-foreground dark:bg-foreground dark:text-background dark:border-background",
        )}
      >
        {/* Ben-day dot overlay */}
        <div
          className="benday-dots-primary benday-gradient-bottom pointer-events-none absolute inset-0 z-0"
          style={{ opacity: 0.12 }}
        />

        {/* Animated background shapes */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          {/* Morphing blob — top-left, overflows */}
          <div className="animate-shape-morph absolute -left-16 -top-16 h-40 w-40 rounded-full bg-primary opacity-[0.04] sm:h-48 sm:w-48 md:h-56 md:w-56" />

          {/* Small ring — bottom-left */}
          <div
            className="animate-shape-pulse-scale absolute bottom-[15%] left-[10%] h-12 w-12 rounded-full border-[3px] border-accent opacity-[0.08] sm:h-14 sm:w-14 md:h-16 md:w-16"
            style={{ animationDelay: "2s" }}
          />

          {/* Rectangle (rotated) — right edge */}
          <div className="absolute right-0 top-[30%] -rotate-[15deg] opacity-[0.05]">
            <div className="animate-shape-drift-slow h-10 w-28 bg-primary sm:h-12 sm:w-32 md:h-14 md:w-36" />
          </div>
        </div>

        {/* Cards grid — top portion */}
        <div className="perspective-container relative z-10 mx-auto flex flex-1 max-w-7xl items-center px-4 py-4 sm:px-6 sm:py-6">
          <div className="w-full">
            <div className="grid gap-3 md:grid-cols-3 md:gap-4">
              {cards.map((feature, i) => (
                <div
                  key={feature.number}
                  className={cn(
                    "group relative border-[5px] border-foreground bg-secondary p-4 transition-all duration-600 ease-out hover:bg-primary hover:text-primary-foreground dark:bg-foreground dark:border-background sm:p-5 md:p-6",
                    isVisible
                      ? "translate-x-0 opacity-100"
                      : "translate-x-16 opacity-0",
                  )}
                  style={{
                    transformStyle: "preserve-3d",
                    transitionDelay: isVisible ? `${i * 100}ms` : "0ms",
                  }}
                >
                  {/* Ben-day dot accent — top-right corner, visible on hover */}
                  <div className="benday-dots-accent benday-gradient-corner pointer-events-none absolute right-0 top-0 h-24 w-24 opacity-0 transition-opacity duration-200 group-hover:opacity-25 sm:h-32 sm:w-32" />

                  {/* Giant background number */}
                  <span className="pointer-events-none absolute -left-1 -top-2 font-display text-[4rem] leading-none text-primary/[0.06] transition-colors duration-200 group-hover:text-primary-foreground/10 sm:text-[6rem] md:text-[8rem]">
                    {feature.number}
                  </span>

                  <div className="relative">
                    <span className="mb-2 inline-block font-mono text-[10px] font-bold uppercase tracking-widest text-primary transition-colors group-hover:text-primary-foreground/70 sm:text-xs">
                      {feature.number}
                    </span>
                    <h3 className="mb-2 font-display text-xl sm:text-2xl md:text-3xl">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-secondary-foreground/50 transition-colors duration-200 group-hover:text-primary-foreground/70 dark:text-background/50">
                      {feature.description}
                    </p>
                  </div>

                  {/* Hover arrow */}
                  <div className="absolute bottom-4 right-4 opacity-0 transition-all duration-200 group-hover:translate-x-1 group-hover:opacity-100 sm:bottom-5 sm:right-5">
                    <span className="text-xl text-primary-foreground">
                      &rarr;
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Tagline block */}
            <div
              className={cn(
                "relative mt-4 border-[4px] border-foreground bg-background p-4 text-foreground shadow-brutal-lg transition-all duration-700 ease-out sm:mt-6 sm:border-[5px] sm:p-6 md:p-8",
                isVisible
                  ? "translate-y-0 scale-100 opacity-100"
                  : "translate-y-8 scale-95 opacity-0",
              )}
              style={{
                transitionDelay: isVisible ? "350ms" : "0ms",
              }}
            >
              {/* Subtle ben-day dots inside tagline block */}
              <div
                className="benday-dots-primary benday-gradient-radial pointer-events-none absolute inset-0"
                style={{ opacity: 0.1 }}
              />
              <p className="slant-heading origin-top-left relative font-display text-xl sm:text-3xl md:text-5xl">
                JUST:
                <span className="text-primary"> SCHEMA.</span>
                <span className="text-accent"> SDK.</span>
                <span className="text-primary"> SHIP.</span>
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  },
);
