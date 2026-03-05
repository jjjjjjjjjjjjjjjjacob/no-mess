"use client";

import { forwardRef } from "react";
import { useBeatReveal } from "@/hooks/use-beat-reveal";
import { cn } from "@/lib/utils";

interface StepData {
  number: string;
  title: string;
  description: string;
  color: "primary" | "accent";
  command?: string;
}

interface HowItWorksBeatStepProps {
  step: StepData;
  index: number;
  isLast?: boolean;
}

export const HowItWorksBeatStep = forwardRef<
  HTMLElement,
  HowItWorksBeatStepProps
>(function HowItWorksBeatStep({ step, index, isLast }, ref) {
  const isVisible = useBeatReveal(ref as React.RefObject<HTMLElement | null>);

  const isEven = index % 2 === 0;

  return (
    <section
      ref={ref}
      className={cn(
        "scroll-beat items-center justify-center border-t-[5px] border-foreground",
        isEven
          ? "bg-background text-foreground"
          : "bg-secondary text-secondary-foreground dark:bg-foreground dark:text-background dark:border-background",
      )}
    >
      {/* Animated background shapes */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {/* Ring — opposite side of number */}
        <div
          className={cn(
            "animate-shape-breathe absolute h-32 w-32 rounded-full border-[3px] opacity-[0.12] sm:h-40 sm:w-40 md:h-56 md:w-56 md:border-4",
            isEven ? "right-[5%] top-[15%]" : "left-[5%] top-[15%]",
            step.color === "primary" ? "border-primary" : "border-accent",
          )}
        />

        {/* Small rotated square — same side as number, lower */}
        <div
          className={cn(
            "absolute bottom-[25%] rotate-[18deg] opacity-[0.12]",
            isEven ? "left-[8%]" : "right-[8%]",
          )}
        >
          <div
            className={cn(
              "animate-shape-drift h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14",
              step.color === "primary" ? "bg-primary" : "bg-accent",
            )}
            style={{ animationDelay: `${index * 3}s` }}
          />
        </div>

        {/* Morphing blob — same side as ring, lower half */}
        <div
          className={cn(
            "animate-shape-morph absolute h-28 w-28 rounded-full opacity-[0.07] sm:h-36 sm:w-36 md:h-44 md:w-44",
            isEven ? "right-[12%] bottom-[10%]" : "left-[12%] bottom-[10%]",
            step.color === "primary" ? "bg-primary" : "bg-accent",
          )}
          style={{ animationDelay: `${index * 5}s` }}
        />

        {/* Pulsing dot — center-ish area */}
        <div
          className={cn(
            "animate-shape-pulse-scale absolute h-5 w-5 rounded-full opacity-[0.14] sm:h-6 sm:w-6 md:h-8 md:w-8",
            isEven ? "left-[35%] top-[12%]" : "right-[35%] top-[12%]",
            step.color === "primary" ? "bg-accent" : "bg-primary",
          )}
          style={{ animationDelay: `${index * 2 + 1}s` }}
        />

        {/* Drifting rectangle — opposite edge, mid height */}
        <div
          className={cn(
            "absolute top-[50%] -rotate-[12deg] opacity-[0.08]",
            isEven ? "left-0" : "right-0",
          )}
        >
          <div
            className={cn(
              "animate-shape-drift-slow h-8 w-20 sm:h-10 sm:w-24 md:h-12 md:w-28",
              step.color === "primary" ? "bg-primary" : "bg-accent",
            )}
            style={{ animationDelay: `${index * 4 + 2}s` }}
          />
        </div>
      </div>

      <div className="perspective-container relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 sm:flex-row sm:items-center sm:gap-12 sm:px-6 md:gap-16">
        {/* Number with ben-day dot accent */}
        <div
          className={cn(
            "relative flex-shrink-0 transition-all duration-600 ease-out",
            isVisible
              ? "translate-x-0 opacity-100"
              : isEven
                ? "-translate-x-20 opacity-0"
                : "translate-x-20 opacity-0",
            !isEven && "sm:order-2",
          )}
        >
          {/* Ben-day dot texture behind number */}
          <div
            className={cn(
              "benday-gradient-radial pointer-events-none absolute inset-0",
              isEven ? "benday-dots-foreground" : "benday-dots-background",
              !isEven ? "-scale-x-100" : "",
            )}
            style={{ opacity: 0.12 }}
          />
          <span
            className={cn(
              "relative block font-display text-[clamp(5rem,min(10vw,16svh),10rem)] leading-[0.85]",
              step.color === "primary" ? "text-primary" : "text-accent",
              !isEven && "text-right sm:text-left",
            )}
          >
            {step.number}
          </span>
        </div>

        {/* Content */}
        <div
          className={cn(
            "relative flex-1 transition-all duration-600 ease-out",
            isEven ? "pl-4 sm:pl-0" : "pr-4 sm:pr-0",
            isVisible
              ? "translate-x-0 opacity-100"
              : isEven
                ? "translate-x-20 opacity-0"
                : "-translate-x-20 opacity-0",
            !isEven && "text-right sm:order-1",
          )}
          style={{
            transitionDelay: isVisible ? "150ms" : "0ms",
          }}
        >
          {/* Vertical accent bar */}
          <div
            className={cn(
              "absolute top-0 h-full w-1 sm:w-1.5",
              isEven ? "left-0 sm:-left-4" : "right-0 sm:-right-4",
              step.color === "primary" ? "bg-primary" : "bg-accent",
            )}
          />
          <h3 className="mb-3 font-display text-[clamp(1.75rem,min(4vw,6svh),3.75rem)] sm:mb-4">
            {step.title}
          </h3>
          <p
            className={cn(
              "max-w-lg text-base sm:text-lg md:text-xl",
              isEven
                ? "text-muted-foreground"
                : "text-secondary-foreground/50 dark:text-background/50",
              !isEven && "ml-auto",
            )}
          >
            {step.description}
          </p>

          {step.command && (
            <div
              className={cn(
                "mt-5 inline-block border-[4px] px-4 py-2.5 sm:mt-6 sm:border-[5px] sm:px-6 sm:py-3",
                isEven
                  ? "border-foreground bg-foreground shadow-brutal"
                  : "border-background bg-background shadow-[5px_5px_0_var(--background)] sm:ml-auto",
              )}
            >
              <code
                className={cn(
                  "font-mono text-xs sm:text-sm md:text-base",
                  isEven ? "text-background" : "text-foreground",
                )}
              >
                <span className="text-primary">$</span> {step.command}
                <span className="ml-1 inline-block h-4 w-2 animate-blink bg-primary" />
              </code>
            </div>
          )}
        </div>
      </div>

      {/* Bottom marquee — only on last step */}
      {isLast && (
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden bg-accent py-3 sm:py-4">
          <div className="animate-marquee-reverse flex whitespace-nowrap">
            {Array.from({ length: 8 }).map((_, i) => (
              <span
                key={`done-${String(i)}`}
                className="mx-4 font-display text-2xl text-accent-foreground sm:mx-6 sm:text-3xl md:text-4xl"
              >
                DONE. GO HOME.
                <span className="mx-3 inline-block sm:mx-5">{"///"}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
});
