"use client";

import Link from "next/link";
import { forwardRef, useEffect, useState } from "react";
import { useAnalytics } from "@/hooks/use-analytics";
import { useHaptics } from "@/hooks/use-haptics";
import { cn } from "@/lib/utils";

export const HeroSection = forwardRef<HTMLElement>(
  function HeroSection(_, ref) {
    const [mounted, setMounted] = useState(false);
    const haptic = useHaptics();
    const analytics = useAnalytics();

    useEffect(() => {
      setMounted(true);
    }, []);

    return (
      <section ref={ref} className="scroll-beat bg-background">
        {/* Grain */}
        <div className="grain pointer-events-none absolute inset-0" />

        {/* Ben-day dot overlay — radial gradient fade */}
        <div
          className="benday-dots-foreground benday-gradient-radial pointer-events-none absolute inset-0 z-0"
          style={{ opacity: 0.1 }}
        />

        {/* Geometric background */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          {/* Existing large circle — now with breathe animation */}
          <div
            className={cn(
              "absolute -right-28 top-[10%] h-[300px] w-[300px] rounded-full bg-primary opacity-0 transition-opacity duration-1000 sm:h-[400px] sm:w-[400px] lg:h-[600px] lg:w-[600px]",
              mounted && "animate-shape-breathe opacity-[0.1]",
            )}
          />

          {/* Shape 1 — Ring (border only) */}
          <div
            className={cn(
              "absolute left-[8%] top-[15%] h-16 w-16 rounded-full border-[3px] border-primary opacity-0 transition-opacity duration-1000 sm:h-20 sm:w-20 md:h-24 md:w-24 md:border-4",
              mounted && "animate-shape-drift opacity-[0.12]",
            )}
          />

          {/* Shape 2 — Rectangle (wrapper: position + rotation, inner: animation) */}
          <div
            className={cn(
              "absolute bottom-[20%] right-[12%] rotate-12 opacity-0 transition-opacity duration-1000",
              mounted && "opacity-[0.09]",
            )}
          >
            <div
              className={cn(
                "h-20 w-32 bg-accent sm:h-24 sm:w-36 md:h-44 md:w-28",
                mounted && "animate-shape-breathe-slow",
              )}
            />
          </div>

          {/* Shape 3 — Diamond (wrapper: position + 45deg, inner: orbit) */}
          <div
            className={cn(
              "absolute left-[20%] top-[30%] rotate-45 opacity-0 transition-opacity duration-1000",
              mounted && "opacity-[0.08]",
            )}
          >
            <div
              className={cn(
                "h-10 w-10 bg-foreground sm:h-12 sm:w-12 md:h-14 md:w-14",
                mounted && "animate-shape-orbit",
              )}
              style={{ animationDelay: "3s" }}
            />
          </div>

          {/* Shape 4 — Breathing blob */}
          <div
            className={cn(
              "absolute -left-20 top-[35%] h-48 w-48 rounded-full bg-primary opacity-0 transition-opacity duration-1000 sm:h-64 sm:w-64 md:h-80 md:w-80",
              mounted && "animate-shape-breathe opacity-[0.12]",
            )}
          />

          {/* Shape 5 — Tiny dot */}
          <div
            className={cn(
              "absolute left-[30%] top-[8%] h-6 w-6 rounded-full bg-accent opacity-0 transition-opacity duration-1000 sm:h-7 sm:w-7 md:h-8 md:w-8",
              mounted && "animate-shape-pulse-scale opacity-[0.14]",
            )}
            style={{ animationDelay: "1.5s" }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 mx-auto flex flex-1 max-w-7xl items-center px-3 sm:px-6">
          <div className="grid w-full gap-2 md:grid-cols-[1.4fr_1fr] md:gap-12">
            {/* Left — Headlines */}
            <div className="flex flex-col items-start md:items-center">
              <div className="slant-heading relative origin-top-left">
                <h1
                  className={cn(
                    "font-extrabold text-[clamp(3.75rem,24vw,7rem)] md:text-[clamp(2.75rem,min(12vw,12svh),7rem)] leading-[0.9] opacity-0",
                    mounted && "animate-slam-in",
                  )}
                >
                  HEADLESS
                </h1>
                <h1
                  className={cn(
                    "font-display text-[clamp(3.75rem,24vw,7rem)] md:text-[clamp(2.75rem,min(12vw,12svh),7rem)] leading-[0.9] opacity-0",
                    mounted && "animate-slam-in delay-100",
                  )}
                >
                  CMS<span className="text-primary">.</span>
                </h1>
                <h1
                  className={cn(
                    "font-display text-[clamp(3.75rem,24vw,7rem)] md:text-[clamp(2.75rem,min(12vw,12svh),7rem)] leading-[0.9] text-transparent opacity-0",
                    mounted && "animate-slam-in delay-200",
                    "[-webkit-text-stroke:2px_currentColor] sm:[-webkit-text-stroke:3px_currentColor]",
                  )}
                  style={{ WebkitTextStrokeColor: "var(--foreground)" }}
                >
                  ZERO
                </h1>
                <h1
                  className={cn(
                    "font-display text-[clamp(3.75rem,24vw,7rem)] md:text-[clamp(2.75rem,min(12vw,12svh),7rem)] leading-[0.9] text-accent opacity-0",
                    mounted && "animate-slam-in delay-300",
                  )}
                >
                  <span className="inline-block">
                    BLOAT
                    <div
                      className={cn(
                        "mt-[clamp(0.25rem,min(0.45vw,0.6svh),0.75rem)] h-1.5 w-0 bg-primary transition-all duration-700 sm:h-2",
                        mounted && "delay-500 w-full",
                      )}
                    />
                  </span>
                  <span className="text-primary">.</span>
                </h1>
              </div>

              <div className="flex flex-col px-12 md:px-0">
                <p
                  className={cn(
                    "mt-[clamp(0.5rem,min(1.35vw,1.8svh),2rem)] self-center max-w-md text-[clamp(0.875rem,min(1.44vw,1.25svh),1rem)] leading-relaxed text-muted-foreground opacity-0",
                    mounted && "animate-slide-in-up delay-400",
                  )}
                >
                  Your clients edit content.
                  <br />
                  You ship code.
                  <br />
                  <span className="font-bold text-foreground">
                    Everyone goes home happy.
                  </span>
                </p>

                <div
                  className={cn(
                    "mt-[clamp(1rem,min(1.8vw,2.4svh),2.5rem)] self-center xs:ml-[clamp(4rem,min(1.8vw,2svh),6rem)] flex flex-col items-start gap-[clamp(1.25rem,min(0.9vw,1.2svh),1.5rem)] opacity-0",
                    mounted && "animate-slide-in-up delay-500",
                  )}
                >
                  <Link
                    href="/sign-up"
                    onClick={() => {
                      haptic("tap");
                      analytics.trackCtaClicked("START_BUILDING", "hero");
                    }}
                    className="cta-diagonal group inline-flex max-w-[90vw] border-[4px] border-foreground bg-accent shadow-brutal-lg sm:border-[5px] -translate-x-4"
                    style={{
                      padding:
                        "clamp(0.5rem, min(0.9vw, 1.2svh), 1.5rem) clamp(1.5rem, min(3.6vw, 4.8svh), 4rem)",
                    }}
                  >
                    <span
                      className="flex items-center gap-3 font-display text-accent-foreground sm:gap-4"
                      style={{
                        fontSize: "clamp(1.5rem, min(1.8vw, 2.4svh), 2.5rem)",
                      }}
                    >
                      START BUILDING
                      <span
                        className="transition-transform duration-200 group-hover:translate-x-2"
                        style={{
                          fontSize:
                            "clamp(1.125rem, min(2.25vw, 3svh), 1.875rem)",
                        }}
                      >
                        &rarr;
                      </span>
                    </span>
                  </Link>

                  <Link
                    href="/docs"
                    onClick={() => {
                      haptic("tap");
                      analytics.trackCtaClicked("READ_DOCS", "hero");
                    }}
                    className="group inline-flex border-[4px] border-foreground bg-background transition-colors hover:bg-foreground hover:text-background sm:border-[5px]"
                    style={{
                      padding:
                        "clamp(0.375rem, min(0.675vw, 0.9svh), 0.75rem) clamp(1rem, min(1.8vw, 2.4svh), 2rem)",
                    }}
                  >
                    <span
                      className="font-display"
                      style={{
                        fontSize:
                          "clamp(0.75rem, min(1.35vw, 1.8svh), 1.125rem)",
                      }}
                    >
                      READ DOCS &rarr;
                    </span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Right — Code block */}
            <div
              className={cn(
                "relative hidden opacity-0 md:block md:mt-20",
                mounted && "animate-slide-in-right delay-300",
              )}
            >
              <div className="relative">
                <div className="absolute inset-0 translate-x-3 translate-y-3 bg-primary" />
                <div
                  className="relative border-solid border-foreground bg-muted text-foreground"
                  style={{
                    borderWidth: "clamp(4px, min(0.375vw, 0.5svh), 5px)",
                    padding: "clamp(1rem, min(1.8vw, 2.4svh), 1.5rem)",
                  }}
                >
                  <div className="mb-[clamp(0.75rem,min(0.6vw,0.8svh),1rem)] flex items-center gap-[clamp(0.5rem,min(0.45vw,0.6svh),0.75rem)]">
                    <div
                      className="rounded-full bg-primary"
                      style={{
                        width: "clamp(0.75rem, min(0.6vw, 0.8svh), 1rem)",
                        height: "clamp(0.75rem, min(0.6vw, 0.8svh), 1rem)",
                      }}
                    />
                    <div
                      className="rounded-full bg-accent"
                      style={{
                        width: "clamp(0.75rem, min(0.6vw, 0.8svh), 1rem)",
                        height: "clamp(0.75rem, min(0.6vw, 0.8svh), 1rem)",
                      }}
                    />
                    <div
                      className="rounded-full border-2 border-foreground/30"
                      style={{
                        width: "clamp(0.75rem, min(0.6vw, 0.8svh), 1rem)",
                        height: "clamp(0.75rem, min(0.6vw, 0.8svh), 1rem)",
                      }}
                    />
                    <span className="ml-auto font-mono text-[clamp(9px,min(0.15vw,0.2svh),10px)] uppercase tracking-widest text-muted-foreground">
                      your-app.tsx
                    </span>
                  </div>
                  <pre
                    className="overflow-x-auto font-mono leading-loose"
                    style={{
                      fontSize: "clamp(0.75rem, min(1.2vw, 1.6svh), 1rem)",
                    }}
                  >
                    <code>
                      <span className="text-primary">import</span>
                      {" { cms } "}
                      <span className="text-primary">from</span>{" "}
                      <span className="text-accent">
                        &quot;@no-mess/client&quot;
                      </span>
                      {"\n\n"}
                      <span className="text-muted-foreground">
                        {"// that's it. seriously."}
                      </span>
                      {"\n"}
                      <span className="text-primary">const</span>
                      {" posts = "}
                      <span className="text-primary">await</span>
                      {" cms."}
                      <span className="text-accent">getEntries</span>
                      {"("}
                      <span className="text-primary">&quot;blog&quot;</span>
                      {")"}
                      {"\n\n"}
                      <span className="text-muted-foreground">
                        {"// your clients edit,"}
                      </span>
                      {"\n"}
                      <span className="text-muted-foreground">
                        {"// you chill."}
                      </span>
                      <span className="ml-1 inline-block h-5 w-2 translate-y-0.5 animate-blink bg-primary" />
                    </code>
                  </pre>
                </div>
              </div>

              <div
                className={cn(
                  "absolute -right-2 -top-3 border-solid border-foreground bg-primary font-mono text-[clamp(10px,min(0.45vw,0.6svh),0.75rem)] font-bold uppercase tracking-widest text-primary-foreground shadow-brutal opacity-0 sm:-right-3 sm:-top-4",
                  mounted && "animate-stamp-in delay-700",
                )}
                style={{
                  borderWidth: "clamp(4px, min(0.375vw, 0.5svh), 5px)",
                  padding:
                    "clamp(0.25rem, min(0.225vw, 0.3svh), 0.375rem) clamp(0.75rem, min(0.6vw, 0.8svh), 1rem)",
                }}
              >
                TYPESCRIPT
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar — tricolor */}
        <div className="absolute bottom-0 left-0 right-0 flex h-1.5 sm:h-2">
          <div className="w-1/3 bg-foreground" />
          <div className="w-1/3 bg-primary" />
          <div className="w-1/3 bg-accent" />
        </div>
      </section>
    );
  },
);
