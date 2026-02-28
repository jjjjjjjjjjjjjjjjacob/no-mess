"use client";

import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@/lib/utils";

const steps = [
  { key: "create-site", label: "Create Site" },
  { key: "create-schema", label: "Define Schema" },
  { key: "create-entry", label: "Create Entry" },
  { key: "complete", label: "Done" },
] as const;

type StepKey = (typeof steps)[number]["key"];

interface OnboardingStepIndicatorProps {
  currentStep: StepKey;
}

export function OnboardingStepIndicator({
  currentStep,
}: OnboardingStepIndicatorProps) {
  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <div key={step.key} className="flex items-center gap-2">
            {index > 0 && (
              <div
                className={cn(
                  "h-px w-6 sm:w-10",
                  isCompleted ? "bg-primary" : "bg-border",
                )}
              />
            )}
            <div className="flex items-center gap-1.5">
              {isCompleted ? (
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  className="size-5 text-primary"
                  strokeWidth={2}
                />
              ) : (
                <div
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full text-xs font-medium",
                    isCurrent
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {index + 1}
                </div>
              )}
              <span
                className={cn(
                  "hidden text-sm sm:inline",
                  isCurrent
                    ? "font-medium text-foreground"
                    : isCompleted
                      ? "text-foreground"
                      : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
