import type { FieldBuilderResult } from "./field-builders.js";
import type {
  ContentTypeDefinition,
  FieldDefinition,
  FragmentDefinition,
  NamedFieldDefinition,
  TemplateDefinition,
  TemplateMode,
} from "./schema-types.js";

export interface BaseSchemaConfig {
  name: string;
  description?: string;
  fields: Record<string, FieldBuilderResult>;
}

export interface TemplateConfig extends BaseSchemaConfig {
  mode?: TemplateMode;
  route?: string;
}

export interface FragmentConfig extends BaseSchemaConfig {}

export type ContentTypeConfig = TemplateConfig;

function addSharedFieldProperties(
  target: {
    required: boolean;
    label?: string;
    description?: string;
  },
  builder: FieldBuilderResult,
) {
  if (builder._label) {
    target.label = builder._label;
  }
  if (builder._description) {
    target.description = builder._description;
  }
}

export function buildFieldDefinition(builder: FieldBuilderResult): FieldDefinition {
  switch (builder._type) {
    case "object": {
      const field: FieldDefinition = {
        type: "object",
        required: builder._required,
        fields: buildNamedFields(builder._fields),
      };
      addSharedFieldProperties(field, builder);
      return field;
    }
    case "array": {
      const field: FieldDefinition = {
        type: "array",
        required: builder._required,
        of: buildFieldDefinition(builder._of),
      };
      addSharedFieldProperties(field, builder);
      if (builder._minItems !== undefined) {
        field.minItems = builder._minItems;
      }
      if (builder._maxItems !== undefined) {
        field.maxItems = builder._maxItems;
      }
      return field;
    }
    case "fragment": {
      const field: FieldDefinition = {
        type: "fragment",
        required: builder._required,
        fragment: builder._fragment,
      };
      addSharedFieldProperties(field, builder);
      return field;
    }
    default: {
      const field: FieldDefinition = {
        type: builder._type,
        required: builder._required,
      };
      addSharedFieldProperties(field, builder);
      if (builder._options) {
        field.options = {};
        if (builder._options.choices) {
          field.options.choices = builder._options.choices;
        }
      }
      return field;
    }
  }
}

export function buildNamedFields(
  fields: Record<string, FieldBuilderResult>,
): NamedFieldDefinition[] {
  return Object.entries(fields).map(([name, builder]) => ({
    name,
    ...buildFieldDefinition(builder),
  }));
}

export function defineTemplate(
  slug: string,
  config: TemplateConfig,
): TemplateDefinition {
  const result: TemplateDefinition = {
    kind: "template",
    slug,
    name: config.name,
    mode: config.mode ?? "collection",
    fields: buildNamedFields(config.fields),
  };

  if (config.description) {
    result.description = config.description;
  }

  if (config.route) {
    result.route = config.route;
  }

  return result;
}

export function defineFragment(
  slug: string,
  config: FragmentConfig,
): FragmentDefinition {
  const result: FragmentDefinition = {
    kind: "fragment",
    slug,
    name: config.name,
    fields: buildNamedFields(config.fields),
  };

  if (config.description) {
    result.description = config.description;
  }

  return result;
}

/**
 * Backward-compatible alias for template definitions.
 */
export function defineContentType(
  slug: string,
  config: ContentTypeConfig,
): ContentTypeDefinition {
  return defineTemplate(slug, config);
}
