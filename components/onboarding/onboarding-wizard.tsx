"use client";

import { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { OnboardingLayout } from "./onboarding-layout";
import { CompleteStep } from "./steps/complete-step";
import { CreateEntryStep } from "./steps/create-entry-step";
import { CreateSchemaStep } from "./steps/create-schema-step";
import { CreateSiteStep } from "./steps/create-site-step";

type WizardStep = "create-site" | "create-schema" | "create-entry" | "complete";

interface OnboardingWizardProps {
  onComplete: () => void;
  onDismiss: () => void;
}

const stepMeta: Record<WizardStep, { title: string; description: string }> = {
  "create-site": {
    title: "Create your first site",
    description:
      "A site represents a project or client. Each site gets its own API key and content.",
  },
  "create-schema": {
    title: "Define a content type",
    description:
      "Content types are schemas that define what your content looks like. Add fields like text, images, and more.",
  },
  "create-entry": {
    title: "Create your first entry",
    description:
      "Entries are the actual content your editors will manage. This one starts as a draft.",
  },
  complete: {
    title: "Setup complete",
    description: "You're ready to start building with no-mess.",
  },
};

export function OnboardingWizard({
  onComplete,
  onDismiss,
}: OnboardingWizardProps) {
  const [step, setStep] = useState<WizardStep>("create-site");
  const [siteId, setSiteId] = useState<Id<"sites"> | null>(null);
  const [siteSlug, setSiteSlug] = useState("");
  const [siteName, setSiteName] = useState("");
  const [contentTypeId, setContentTypeId] = useState<Id<"contentTypes"> | null>(
    null,
  );
  const [contentTypeName, setContentTypeName] = useState("");
  const [entryTitle, setEntryTitle] = useState("");

  const meta = stepMeta[step];

  return (
    <OnboardingLayout
      currentStep={step}
      title={meta.title}
      description={meta.description}
      onDismiss={onDismiss}
    >
      {step === "create-site" && (
        <CreateSiteStep
          onComplete={(data) => {
            setSiteId(data.siteId);
            setSiteSlug(data.slug);
            setSiteName(data.name);
            setStep("create-schema");
          }}
        />
      )}
      {step === "create-schema" && siteId && (
        <CreateSchemaStep
          siteId={siteId}
          onComplete={(data) => {
            setContentTypeId(data.contentTypeId);
            setContentTypeName(data.name);
            setStep("create-entry");
          }}
        />
      )}
      {step === "create-entry" && siteId && contentTypeId && (
        <CreateEntryStep
          siteId={siteId}
          contentTypeId={contentTypeId}
          onComplete={(data) => {
            setEntryTitle(data.title);
            setStep("complete");
            onComplete();
          }}
        />
      )}
      {step === "complete" && (
        <CompleteStep
          siteName={siteName}
          siteSlug={siteSlug}
          contentTypeName={contentTypeName}
          entryTitle={entryTitle}
        />
      )}
    </OnboardingLayout>
  );
}
