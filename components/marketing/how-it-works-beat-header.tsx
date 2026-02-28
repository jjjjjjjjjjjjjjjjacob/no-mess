"use client";

import { forwardRef } from "react";
import { useBeatReveal } from "@/hooks/use-beat-reveal";
import { cn } from "@/lib/utils";

export const HowItWorksBeatHeader = forwardRef<HTMLElement>(
  function HowItWorksBeatHeader(_, ref) {
    const isVisible = useBeatReveal(ref as React.RefObject<HTMLElement | null>);

    return (
      <section
        ref={ref}
        className="scroll-beat items-center justify-center border-t-[5px] border-foreground bg-background text-center"
      >
        {/* Grain */}
        <div className="grain pointer-events-none absolute inset-0" />

        {/* Ben-day dots background */}
        <div
          className="benday-dots-foreground benday-gradient-radial pointer-events-none absolute inset-0"
          style={{ opacity: 0.08 }}
        />

        {/* Animated background shapes */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          {/* Large circle — top-right, overflows */}
          <div className="animate-shape-breathe absolute -right-24 -top-24 h-48 w-48 rounded-full bg-primary opacity-[0.04] sm:h-56 sm:w-56 md:h-72 md:w-72" />

          {/* Rectangle (rotated) — bottom-left */}
          <div className="absolute bottom-[8%] left-0 rotate-[8deg] opacity-[0.04]">
            <div
              className="animate-shape-drift h-16 w-40 bg-accent"
              style={{ animationDelay: "7s" }}
            />
          </div>

          {/* Small diamond — left-center */}
          <div className="absolute left-[15%] top-[40%] rotate-45 opacity-[0.03]">
            <div className="animate-shape-orbit h-8 w-8 bg-foreground sm:h-10 sm:w-10 md:h-12 md:w-12" />
          </div>
        </div>

        {/* Corner brackets */}
        <div className="absolute left-4 top-4 h-8 w-8 border-l-[4px] border-t-[4px] border-foreground sm:left-6 sm:top-6 sm:h-10 sm:w-10 sm:border-l-[5px] sm:border-t-[5px]" />
        <div className="absolute right-4 top-4 h-8 w-8 border-r-[4px] border-t-[4px] border-foreground sm:right-6 sm:top-6 sm:h-10 sm:w-10 sm:border-r-[5px] sm:border-t-[5px]" />
        <div className="absolute bottom-4 left-4 h-8 w-8 border-b-[4px] border-l-[4px] border-foreground sm:bottom-6 sm:left-6 sm:h-10 sm:w-10 sm:border-b-[5px] sm:border-l-[5px]" />
        <div className="absolute bottom-4 right-4 h-8 w-8 border-b-[4px] border-r-[4px] border-foreground sm:bottom-6 sm:right-6 sm:h-10 sm:w-10 sm:border-b-[5px] sm:border-r-[5px]" />

        <div
          className={cn(
            "perspective-container relative z-10 transition-all duration-700 ease-out",
            isVisible
              ? "scale-100 rotate-0 opacity-100"
              : "scale-50 rotate-6 opacity-0",
          )}
        >
          <h2 className="slant-heading origin-center font-display text-[clamp(3rem,min(10vw,14svh),10rem)]">
            HOW IT
            <br />
            <span className="text-primary">WORKS</span>
          </h2>
        </div>
      </section>
    );
  },
);
