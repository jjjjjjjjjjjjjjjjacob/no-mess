"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

function useScrollReveal(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold },
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}

const features = [
  {
    number: "01",
    title: "NO CONFIG FILES",
    description: "Zero YAML. Zero JSON. Zero mental overhead.",
  },
  {
    number: "02",
    title: "NO OAUTH DANCE",
    description: "One API key. Bearer token. That's literally it.",
  },
  {
    number: "03",
    title: "NO ONBOARDING CALLS",
    description: "If you need a call, we failed at our job.",
  },
  {
    number: "04",
    title: "NO VERSION BLOAT",
    description: "Draft. Published. Two states. Done.",
  },
  {
    number: "05",
    title: "NO ROLE HIERARCHIES",
    description: "Editor or admin. Pick one. Move on.",
  },
  {
    number: "06",
    title: "NO WEBHOOK HELL",
    description: "Query when you need. No debugging events at 3am.",
  },
];

export const FeaturesSection = forwardRef<HTMLElement>(
  function FeaturesSection(_, forwardedRef) {
    const sectionRef = useScrollReveal(0.05);

    return (
      <section
        ref={(node: HTMLElement | null) => {
          // biome-ignore lint/suspicious/noExplicitAny: merging refs with different element types
          (sectionRef.ref as any).current = node;
          if (typeof forwardedRef === "function") {
            forwardedRef(node);
          } else if (forwardedRef) {
            // biome-ignore lint/suspicious/noExplicitAny: merging refs with different element types
            (forwardedRef as any).current = node;
          }
        }}
        className="relative overflow-hidden border-t-[5px] border-foreground bg-secondary text-secondary-foreground"
      >
        {/* Ben-day dot overlay — subtle Lichtenstein halftone texture */}
        <div
          className="benday-dots-primary pointer-events-none absolute inset-0 z-0"
          style={{ opacity: 0.04 }}
        />

        {/* Static header — replaces marquee */}
        <div className="border-b-[5px] border-foreground bg-foreground px-4 py-4 sm:px-6 sm:py-5">
          <div className="mx-auto max-w-7xl">
            <h2 className="font-display text-3xl text-background sm:text-4xl md:text-5xl">
              WHAT WE DON&apos;T DO
              <span className="text-primary">{" ///"}</span>
            </h2>
          </div>
        </div>

        {/* Features grid — comic-panel cards */}
        <div className="perspective-container relative z-10 mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 md:py-28">
          <div className="grid gap-4 md:grid-cols-2 md:gap-5">
            {features.map((feature, index) => (
              <div
                key={feature.number}
                className={cn(
                  "group relative border-[5px] border-foreground bg-secondary p-6 transition-all duration-200 hover:bg-primary hover:text-primary-foreground sm:p-8 md:p-10",
                  "opacity-0",
                  sectionRef.isVisible && "animate-pop-forward",
                )}
                style={{
                  animationDelay: `${index * 80}ms`,
                  animationFillMode: "forwards",
                  transformStyle: "preserve-3d",
                }}
              >
                {/* Ben-day dot accent — top-right corner, visible on hover */}
                <div className="benday-dots-accent pointer-events-none absolute right-0 top-0 h-24 w-24 opacity-0 transition-opacity duration-200 group-hover:opacity-20 sm:h-32 sm:w-32" />

                {/* Giant background number */}
                <span className="pointer-events-none absolute -left-1 -top-2 font-display text-[6rem] leading-none text-primary/[0.06] transition-colors duration-200 group-hover:text-primary-foreground/10 sm:text-[8rem] md:text-[11rem]">
                  {feature.number}
                </span>

                <div className="relative">
                  <span className="mb-2 inline-block font-mono text-[10px] font-bold uppercase tracking-widest text-primary transition-colors group-hover:text-primary-foreground/70 sm:mb-3 sm:text-xs">
                    {feature.number}
                  </span>
                  <h3 className="mb-2 font-display text-2xl sm:mb-3 sm:text-3xl md:text-4xl">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-secondary-foreground/50 transition-colors duration-200 group-hover:text-primary-foreground/70 sm:text-base">
                    {feature.description}
                  </p>
                </div>

                {/* Hover arrow */}
                <div className="absolute bottom-6 right-6 opacity-0 transition-all duration-200 group-hover:translate-x-1 group-hover:opacity-100 sm:bottom-8 sm:right-8">
                  <span className="text-xl text-primary-foreground sm:text-2xl">
                    →
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Tagline block — rotated stamp with ben-day dot background */}
          <div
            className={cn(
              "relative mt-12 border-[4px] border-foreground bg-background p-6 text-foreground shadow-brutal-lg sm:mt-16 sm:border-[5px] sm:p-8 md:mt-20 md:p-12 opacity-0",
              sectionRef.isVisible && "animate-stamp-in delay-700",
            )}
            style={{ animationFillMode: "forwards" }}
          >
            {/* Subtle ben-day dots inside tagline block */}
            <div
              className="benday-dots-primary pointer-events-none absolute inset-0"
              style={{ opacity: 0.06 }}
            />
            <p className="relative font-display text-[clamp(1.5rem,min(5vw,7svh),4.5rem)]">
              JUST:
              <span className="text-primary"> SCHEMA.</span>
              <span className="text-accent"> SDK.</span>
              <span className="text-primary"> SHIP.</span>
            </p>
          </div>
        </div>
      </section>
    );
  },
);
