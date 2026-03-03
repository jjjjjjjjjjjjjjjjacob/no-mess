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
            "animate-shape-breathe absolute h-32 w-32 rounded-full border-[3px] opacity-[0.05] sm:h-40 sm:w-40 md:h-48 md:w-48 md:border-4",
            isEven ? "right-[5%] top-[15%]" : "left-[5%] top-[15%]",
            step.color === "primary" ? "border-primary" : "border-accent",
          )}
        />

        {/* Small rotated square — same side as number, lower */}
        <div
          className={cn(
            "absolute bottom-[25%] rotate-[18deg] opacity-[0.04]",
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
            className="benday-dots-foreground benday-gradient-radial pointer-events-none absolute inset-0"
            style={{ opacity: 0.12 }}
          />
          <span
            className={cn(
              "relative block font-display text-[clamp(5rem,min(10vw,16svh),10rem)] leading-[0.85]",
              step.color === "primary" ? "text-primary" : "text-accent",
            )}
          >
            {step.number}
          </span>
        </div>

        {/* Content */}
        <div
          className={cn(
            "flex-1 transition-all duration-600 ease-out",
            isVisible
              ? "translate-x-0 opacity-100"
              : isEven
                ? "translate-x-20 opacity-0"
                : "-translate-x-20 opacity-0",
            !isEven && "sm:order-1 sm:text-right",
          )}
          style={{
            transitionDelay: isVisible ? "150ms" : "0ms",
          }}
        >
          <h3 className="mb-3 font-display text-[clamp(1.75rem,min(4vw,6svh),3.75rem)] sm:mb-4">
            {step.title}
          </h3>
          <p
            className={cn(
              "max-w-lg text-base sm:text-lg md:text-xl",
              isEven
                ? "text-muted-foreground"
                : "text-secondary-foreground/50 dark:text-background/50",
              !isEven && "sm:ml-auto",
            )}
          >
            {step.description}
          </p>

          {step.command && (
            <div
              className={cn(
                "mt-5 inline-block border-[4px] border-foreground bg-foreground px-4 py-2.5 shadow-brutal sm:mt-6 sm:border-[5px] sm:px-6 sm:py-3",
                !isEven && "sm:ml-auto",
              )}
            >
              <code className="font-mono text-xs text-background sm:text-sm md:text-base">
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
