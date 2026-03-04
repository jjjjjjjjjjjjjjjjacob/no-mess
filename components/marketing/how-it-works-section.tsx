"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { stepAnimations, steps } from "./how-it-works-data";

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

export const HowItWorksSection = forwardRef<HTMLElement>(
  function HowItWorksSection(_, forwardedRef) {
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
        className="relative border-t-[5px] border-foreground"
      >
        {/* Section header */}
        <div className="perspective-container relative overflow-hidden border-b-[5px] border-foreground bg-background py-12 text-center sm:py-16 md:py-24">
          <div className="grain pointer-events-none absolute inset-0" />

          <h2
            className={cn(
              "relative z-10 font-display text-[clamp(2.5rem,min(8vw,12svh),7rem)] opacity-0",
              sectionRef.isVisible && "animate-flip-in-x",
            )}
            style={{ animationFillMode: "forwards" }}
          >
            HOW IT
            <br />
            <span className="text-primary">WORKS</span>
          </h2>

          {/* Corner brackets */}
          <div className="absolute left-4 top-4 h-8 w-8 border-l-[4px] border-t-[4px] border-foreground sm:left-6 sm:top-6 sm:h-10 sm:w-10 sm:border-l-[5px] sm:border-t-[5px]" />
          <div className="absolute right-4 top-4 h-8 w-8 border-r-[4px] border-t-[4px] border-foreground sm:right-6 sm:top-6 sm:h-10 sm:w-10 sm:border-r-[5px] sm:border-t-[5px]" />
          <div className="absolute bottom-4 left-4 h-8 w-8 border-b-[4px] border-l-[4px] border-foreground sm:bottom-6 sm:left-6 sm:h-10 sm:w-10 sm:border-b-[5px] sm:border-l-[5px]" />
          <div className="absolute bottom-4 right-4 h-8 w-8 border-b-[4px] border-r-[4px] border-foreground sm:bottom-6 sm:right-6 sm:h-10 sm:w-10 sm:border-b-[5px] sm:border-r-[5px]" />
        </div>

        {/* Steps */}
        {steps.map((step, index) => (
          <div key={step.number} className="perspective-container">
            <div
              className={cn(
                "relative border-b-[5px] border-foreground py-12 sm:py-16 md:py-24",
                index % 2 === 0
                  ? "bg-background text-foreground"
                  : "bg-secondary text-secondary-foreground",
                "opacity-0",
                sectionRef.isVisible && stepAnimations[index],
              )}
              style={{
                animationDelay: `${(index + 1) * 200}ms`,
                animationFillMode: "forwards",
                transformStyle: "preserve-3d",
              }}
            >
              <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:flex-row sm:items-center sm:gap-12 sm:px-6 md:gap-16">
                {/* Number with ben-day dot accent */}
                <div
                  className={cn(
                    "relative flex-shrink-0",
                    index % 2 === 1 && "sm:order-2",
                  )}
                >
                  {/* Ben-day dot texture behind number */}
                  <div
                    className="benday-dots-foreground pointer-events-none absolute inset-0"
                    style={{ opacity: 0.08 }}
                  />
                  <span
                    className={cn(
                      "relative font-display text-[clamp(5rem,min(12vw,16svh),10rem)] leading-[0.85]",
                      step.color === "primary" ? "text-primary" : "text-accent",
                    )}
                  >
                    {step.number}
                  </span>
                </div>

                {/* Content */}
                <div
                  className={cn(
                    "flex-1",
                    index % 2 === 1 && "sm:order-1 sm:text-right",
                  )}
                >
                  <h3 className="mb-3 font-display text-[clamp(1.75rem,min(4vw,5svh),3.5rem)] sm:mb-4">
                    {step.title}
                  </h3>
                  <p
                    className={cn(
                      "max-w-lg text-base sm:text-lg md:text-xl",
                      index % 2 === 0
                        ? "text-muted-foreground"
                        : "text-secondary-foreground/50",
                      index % 2 === 1 && "sm:ml-auto",
                    )}
                  >
                    {step.description}
                  </p>

                  {step.command && (
                    <div
                      className={cn(
                        "mt-5 inline-block border-[4px] border-foreground bg-foreground px-4 py-2.5 shadow-brutal sm:mt-6 sm:border-[5px] sm:px-6 sm:py-3",
                        index % 2 === 1 && "sm:ml-auto",
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

              {/* Connector with pulse-glow */}
              {index < steps.length - 1 && (
                <div className="absolute -bottom-4 left-1/2 h-8 w-1.5 -translate-x-1/2 animate-pulse-glow bg-primary" />
              )}
            </div>
          </div>
        ))}

        {/* Bottom marquee */}
        <div className="overflow-hidden bg-accent py-3 sm:py-4">
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
      </section>
    );
  },
);
