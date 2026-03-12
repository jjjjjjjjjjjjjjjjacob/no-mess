import type {
  ContentTypeDefinition,
  FragmentDefinition,
  SchemaDefinition,
  TemplateDefinition,
} from "./schema-types";

export interface SchemaConfig {
  templates?: TemplateDefinition[];
  fragments?: FragmentDefinition[];
  contentTypes?: ContentTypeDefinition[];
}

/**
 * Wraps template/fragment definitions into a SchemaDefinition.
 * `contentTypes` remains supported as a backward-compatible alias.
 */
export function defineSchema(config: SchemaConfig): SchemaDefinition {
  const allDefinitions = [
    ...(config.contentTypes ?? []),
    ...(config.templates ?? []),
    ...(config.fragments ?? []),
  ];

  const templates: TemplateDefinition[] = [];
  const fragments: FragmentDefinition[] = [];

  for (const definition of allDefinitions) {
    if (definition.kind === "fragment") {
      fragments.push(definition);
    } else {
      templates.push(definition);
    }
  }

  return {
    templates,
    fragments,
    contentTypes: [...templates, ...fragments],
  };
}
