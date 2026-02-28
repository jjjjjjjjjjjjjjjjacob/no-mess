export const steps = [
  {
    number: "01",
    title: "CREATE SITE",
    description: "30 seconds. One form. API key generated instantly.",
    color: "primary" as const,
  },
  {
    number: "02",
    title: "DEFINE SCHEMA",
    description: "Drag fields. Hit save. Your content types are ready.",
    color: "accent" as const,
  },
  {
    number: "03",
    title: "SHIP IT",
    description: "Install SDK. Fetch content. Deploy. Touch grass.",
    color: "primary" as const,
    command: "bun add @no-mess/client",
  },
];

export const stepAnimations = [
  "animate-tilt-in-left",
  "animate-tilt-in-right",
  "animate-flip-in-x",
] as const;
