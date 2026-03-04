"use client";

import { useCallback, useRef } from "react";
import { useAnalytics } from "@/hooks/use-analytics";
import { useBeatTracking } from "@/hooks/use-beat-tracking";
import { useIsMobile } from "@/hooks/use-mobile";
import { useScrollJacking } from "@/hooks/use-scroll-jacking";
import { CtaSection } from "./cta-section";
import { FeaturesBeat1 } from "./features-beat-1";
import { FeaturesBeat2 } from "./features-beat-2";
import { Footer } from "./footer";
import { HeroSection } from "./hero-section";
import { HowItWorksBeatHeader } from "./how-it-works-beat-header";
import { HowItWorksBeatStep } from "./how-it-works-beat-step";
import { steps } from "./how-it-works-data";

export function ScrollSections() {
  const isMobile = useIsMobile();
  const analytics = useAnalytics();

  const onNavigate = useCallback(
    (
      method: string,
      direction: "up" | "down",
      fromBeat: number,
      toBeat: number,
    ) => {
      analytics.trackScrollNavigation(method, direction, fromBeat, toBeat);
    },
    [analytics],
  );

  const heroRef = useRef<HTMLElement>(null);
  const featuresBeat1Ref = useRef<HTMLElement>(null);
  const featuresBeat2Ref = useRef<HTMLElement>(null);
  const hiwHeaderRef = useRef<HTMLElement>(null);
  const hiwStep1Ref = useRef<HTMLElement>(null);
  const hiwStep2Ref = useRef<HTMLElement>(null);
  const hiwStep3Ref = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  const beatRefs = [
    heroRef,
    featuresBeat1Ref,
    featuresBeat2Ref,
    hiwHeaderRef,
    hiwStep1Ref,
    hiwStep2Ref,
    hiwStep3Ref,
    ctaRef,
    footerRef,
  ];

  const { currentBeat, totalBeats } = useScrollJacking(beatRefs, {
    enabled: !isMobile,
    onNavigate,
  });

  useBeatTracking(currentBeat, totalBeats);

  return (
    <>
      <HeroSection ref={heroRef} />
      <FeaturesBeat1 ref={featuresBeat1Ref} />
      <FeaturesBeat2 ref={featuresBeat2Ref} />
      <HowItWorksBeatHeader ref={hiwHeaderRef} />
      <HowItWorksBeatStep ref={hiwStep1Ref} step={steps[0]} index={0} />
      <HowItWorksBeatStep ref={hiwStep2Ref} step={steps[1]} index={1} />
      <HowItWorksBeatStep ref={hiwStep3Ref} step={steps[2]} index={2} isLast />
      <CtaSection ref={ctaRef} />
      <div
        ref={footerRef}
        className="snap-start snap-always scroll-mt-[var(--navbar-height,6.25rem)]"
      >
        <Footer />
      </div>
    </>
  );
}
