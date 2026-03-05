import type { FieldBuilderResult } from "./field-builders";
import type { ContentTypeDefinition, FieldDefinition } from "./schema-types";

export interface ContentTypeConfig {
  name: string;
  description?: string;
  fields: Record<string, FieldBuilderResult>;
}

/**
 * Defines a content type from a slug and configuration object.
 * Converts field builder results into FieldDefinition[].
 */
export function defineContentType(
  slug: string,
  config: ContentTypeConfig,
): ContentTypeDefinition {
  const fields: FieldDefinition[] = Object.entries(config.fields).map(
    ([name, builder]) => {
      const def: FieldDefinition = {
        name,
        type: builder._type,
        required: builder._required,
      };
      if (builder._description) {
        def.description = builder._description;
      }
      if (builder._options) {
        def.options = {};
        if (builder._options.choices) {
          def.options.choices = builder._options.choices;
        }
      }
      return def;
    },
  );

  const result: ContentTypeDefinition = {
    slug,
    name: config.name,
    fields,
  };

  if (config.description) {
    result.description = config.description;
  }

  return result;
}
