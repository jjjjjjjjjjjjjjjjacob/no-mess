"use client";

import { forwardRef } from "react";
import { useBeatReveal } from "@/hooks/use-beat-reveal";
import { cn } from "@/lib/utils";
import { features } from "./features-data";

export const FeaturesBeat1 = forwardRef<HTMLElement>(
  function FeaturesBeat1(_, ref) {
    const isVisible = useBeatReveal(ref as React.RefObject<HTMLElement | null>);

    const cards = features.slice(0, 3);

    return (
      <section
        ref={ref}
        className={cn(
          "scroll-beat border-t-[5px] border-foreground bg-secondary text-secondary-foreground dark:bg-foreground dark:text-background dark:border-background",
        )}
      >
        {/* Ben-day dot overlay */}
        <div
          className="benday-dots-primary benday-gradient-corner pointer-events-none absolute inset-0 z-0"
          style={{ opacity: 0.12 }}
        />

        {/* Animated background shapes */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          {/* Large ring — bottom-right, overflows */}
          <div className="animate-shape-breathe absolute -bottom-16 -right-16 h-48 w-48 rounded-full border-[4px] border-primary opacity-[0.08] sm:h-56 sm:w-56 md:h-64 md:w-64 md:border-[5px]" />

          {/* Small square (rotated) — top-right */}
          <div className="absolute right-[15%] top-[12%] rotate-[20deg] opacity-[0.06]">
            <div
              className="animate-shape-drift h-10 w-10 bg-accent sm:h-12 sm:w-12 md:h-14 md:w-14"
              style={{ animationDelay: "5s" }}
            />
          </div>

          {/* Rectangle — left edge, 45% */}
          <div className="animate-shape-breathe-slow absolute left-0 top-[45%] h-12 w-24 bg-primary opacity-[0.05] sm:h-14 sm:w-28 md:h-16 md:w-32" />
        </div>

        {/* Dark header bar */}
        <div className="border-b-[5px] border-foreground bg-foreground px-4 py-3 dark:bg-background dark:border-background sm:px-6">
          <div
            className={cn(
              "mx-auto max-w-7xl transition-all duration-500 ease-out",
              isVisible
                ? "translate-x-0 opacity-100"
                : "-translate-x-12 opacity-0",
            )}
          >
            <h2 className="slant-heading origin-top-left font-display text-2xl text-background dark:text-foreground sm:text-3xl md:text-4xl">
              WHAT WE DON&apos;T DO
              <span className="text-primary">{" ///"}</span>
            </h2>
          </div>
        </div>

        {/* Cards grid — fills remaining space */}
        <div className="perspective-container relative z-10 mx-auto flex flex-1 max-w-7xl items-center px-4 py-4 sm:px-6 sm:py-6">
          <div className="grid w-full gap-3 md:grid-cols-3 md:gap-4">
            {cards.map((feature, i) => (
              <div
                key={feature.number}
                className={cn(
                  "group relative border-[5px] border-foreground bg-secondary p-4 transition-all duration-600 ease-out hover:bg-primary hover:text-primary-foreground dark:bg-foreground dark:border-background sm:p-5 md:p-6",
                  isVisible
                    ? "translate-x-0 opacity-100"
                    : "-translate-x-16 opacity-0",
                )}
                style={{
                  transformStyle: "preserve-3d",
                  transitionDelay: isVisible ? `${(i + 1) * 100}ms` : "0ms",
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
        </div>
      </section>
    );
  },
);
