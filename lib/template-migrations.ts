import type { NamedFieldDefinition } from "@/packages/no-mess-client/src/schema";

export interface TemplateMigrationDefinition {
  contentTypeSlug: string;
  description: string;
  name: string;
  nextFields?: NamedFieldDefinition[];
  transformEntry: (content: Record<string, unknown>) => Record<string, unknown>;
}

export interface NumberedSlidesMigrationConfig {
  altField: (index: number) => string;
  count: number;
  destinationPath: string[];
  imageField: (index: number) => string;
  labelField?: (index: number) => string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function omitKeys(
  input: Record<string, unknown>,
  keysToOmit: Iterable<string>,
): Record<string, unknown> {
  const omitted = new Set(keysToOmit);
  return Object.fromEntries(
    Object.entries(input).filter(([key]) => !omitted.has(key)),
  );
}

function setNestedValue(
  input: Record<string, unknown>,
  path: string[],
  value: unknown,
): Record<string, unknown> {
  if (path.length === 0) {
    return input;
  }

  const [segment, ...rest] = path;
  if (rest.length === 0) {
    return { ...input, [segment]: value };
  }

  const current = isRecord(input[segment]) ? input[segment] : {};
  return {
    ...input,
    [segment]: setNestedValue(current, rest, value),
  };
}

export function migrateNumberedFieldsToSlides(
  content: Record<string, unknown>,
  config: NumberedSlidesMigrationConfig,
) {
  const slides: Record<string, unknown>[] = [];
  const consumedKeys = new Set<string>();

  for (let index = 1; index <= config.count; index += 1) {
    const imageKey = config.imageField(index);
    const altKey = config.altField(index);
    const labelKey = config.labelField?.(index);

    const image = content[imageKey];
    const alt = content[altKey];
    const label = labelKey ? content[labelKey] : undefined;

    consumedKeys.add(imageKey);
    consumedKeys.add(altKey);
    if (labelKey) {
      consumedKeys.add(labelKey);
    }

    const hasUsefulValue =
      typeof image === "string" ||
      typeof alt === "string" ||
      typeof label === "string";

    if (!hasUsefulValue) {
      continue;
    }

    slides.push({
      ...(typeof image === "string" && image ? { image } : {}),
      ...(typeof alt === "string" && alt ? { alt } : {}),
      ...(typeof label === "string" && label ? { label } : {}),
    });
  }

  return setNestedValue(
    omitKeys(content, consumedKeys),
    config.destinationPath,
    slides,
  );
}

export const mershyHomepageHeroSlidesFields: NamedFieldDefinition[] = [
  {
    name: "hero",
    type: "object",
    required: false,
    fields: [
      {
        name: "slides",
        type: "array",
        required: false,
        of: {
          type: "object",
          required: false,
          fields: [
            {
              name: "image",
              type: "image",
              required: true,
            },
            {
              name: "alt",
              type: "text",
              required: false,
            },
            {
              name: "label",
              type: "text",
              required: false,
            },
          ],
        },
      },
    ],
  },
];

export const mershyHomepageHeroSlidesMigration: TemplateMigrationDefinition = {
  name: "mershy-homepage-hero-slides",
  contentTypeSlug: "homepage",
  description:
    "Migrates flat numbered hero slideshow fields into hero.slides[] with explicit image/alt/label objects.",
  nextFields: mershyHomepageHeroSlidesFields,
  transformEntry: (content) =>
    migrateNumberedFieldsToSlides(content, {
      count: 8,
      destinationPath: ["hero", "slides"],
      imageField: (index) => `image${index}`,
      altField: (index) => `image${index}Alt`,
      labelField: (index) => `image${index}Label`,
    }),
};

export const TEMPLATE_MIGRATIONS: TemplateMigrationDefinition[] = [
  mershyHomepageHeroSlidesMigration,
];

export function getTemplateMigration(name: string) {
  return (
    TEMPLATE_MIGRATIONS.find((migration) => migration.name === name) ?? null
  );
}
