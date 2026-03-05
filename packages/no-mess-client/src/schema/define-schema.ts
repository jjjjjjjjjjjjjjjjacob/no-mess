import type { ContentTypeDefinition, SchemaDefinition } from "./schema-types";

export interface SchemaConfig {
  contentTypes: ContentTypeDefinition[];
}

/**
 * Wraps content type definitions into a SchemaDefinition.
 */
export function defineSchema(config: SchemaConfig): SchemaDefinition {
  return {
    contentTypes: config.contentTypes,
  };
}
