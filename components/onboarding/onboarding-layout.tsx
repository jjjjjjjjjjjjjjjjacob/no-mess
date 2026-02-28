"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { OnboardingStepIndicator } from "./onboarding-step-indicator";

type WizardStep = "create-site" | "create-schema" | "create-entry" | "complete";

interface OnboardingLayoutProps {
  currentStep: WizardStep;
  title: string;
  description: string;
  onDismiss?: () => void;
  children: ReactNode;
}

export function OnboardingLayout({
  currentStep,
  title,
  description,
  onDismiss,
  children,
}: OnboardingLayoutProps) {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex items-center justify-between">
        <OnboardingStepIndicator currentStep={currentStep} />
        {currentStep !== "complete" && onDismiss && (
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            Skip setup
          </Button>
        )}
      </div>
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        <p className="mt-1 text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}
