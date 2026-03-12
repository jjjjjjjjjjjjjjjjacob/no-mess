import { v } from "convex/values";

export const PRIMITIVE_FIELD_TYPES = [
  "text",
  "textarea",
  "number",
  "boolean",
  "datetime",
  "url",
  "image",
  "gallery",
  "select",
  "shopifyProduct",
  "shopifyCollection",
] as const;

export const FIELD_TYPES = [
  ...PRIMITIVE_FIELD_TYPES,
  "object",
  "array",
  "fragment",
] as const;

export const SCHEMA_KINDS = ["template", "fragment"] as const;
export const TEMPLATE_MODES = ["singleton", "collection"] as const;

export type PrimitiveFieldType = (typeof PRIMITIVE_FIELD_TYPES)[number];
export type FieldType = (typeof FIELD_TYPES)[number];
export type SchemaKind = (typeof SCHEMA_KINDS)[number];
export type TemplateMode = (typeof TEMPLATE_MODES)[number];

export type SelectChoice = {
  label: string;
  value: string;
};

export type FieldOptions = {
  choices?: SelectChoice[];
};

export type BaseField = {
  type: FieldType;
  required: boolean;
  label?: string;
  description?: string;
};

export type PrimitiveField = BaseField & {
  type: PrimitiveFieldType;
  options?: FieldOptions;
};

export type ObjectField = BaseField & {
  type: "object";
  fields: Field[];
};

export type ArrayField = BaseField & {
  type: "array";
  of: FieldDefinition;
  minItems?: number;
  maxItems?: number;
};

export type FragmentField = BaseField & {
  type: "fragment";
  fragment: string;
};

export type FieldDefinition =
  | PrimitiveField
  | ObjectField
  | ArrayField
  | FragmentField;

export type Field = FieldDefinition & { name: string };

export const fieldTypeValidator = v.string();
export const contentFieldsValidator = v.any();

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isStringArrayChoice(value: unknown): value is SelectChoice {
  return (
    isRecord(value) &&
    typeof value.label === "string" &&
    typeof value.value === "string"
  );
}

function validateBaseField(
  field: Record<string, unknown>,
  path: string,
): string[] {
  const errors: string[] = [];

  if (!FIELD_TYPES.includes(field.type as FieldType)) {
    errors.push(`${path}.type must be a valid field type`);
  }

  if (typeof field.required !== "boolean") {
    errors.push(`${path}.required must be a boolean`);
  }

  if (field.label !== undefined && typeof field.label !== "string") {
    errors.push(`${path}.label must be a string`);
  }

  if (
    field.description !== undefined &&
    typeof field.description !== "string"
  ) {
    errors.push(`${path}.description must be a string`);
  }

  return errors;
}

function validateFieldDefinition(value: unknown, path: string): string[] {
  if (!isRecord(value)) {
    return [`${path} must be an object`];
  }

  const errors = validateBaseField(value, path);
  const type = value.type;

  if (type === "select") {
    if (value.options !== undefined && !isRecord(value.options)) {
      errors.push(`${path}.options must be an object`);
    }

    const choices = isRecord(value.options) ? value.options.choices : undefined;
    if (choices !== undefined) {
      if (!Array.isArray(choices) || !choices.every(isStringArrayChoice)) {
        errors.push(
          `${path}.options.choices must be an array of {label,value}`,
        );
      }
    }
  }

  if (type === "object") {
    errors.push(...validateNamedFields(value.fields, `${path}.fields`));
  }

  if (type === "array") {
    errors.push(...validateFieldDefinition(value.of, `${path}.of`));
    if (value.minItems !== undefined && typeof value.minItems !== "number") {
      errors.push(`${path}.minItems must be a number`);
    }
    if (value.maxItems !== undefined && typeof value.maxItems !== "number") {
      errors.push(`${path}.maxItems must be a number`);
    }
  }

  if (type === "fragment" && typeof value.fragment !== "string") {
    errors.push(`${path}.fragment must be a string`);
  }

  return errors;
}

export function validateNamedFields(value: unknown, path = "fields"): string[] {
  if (!Array.isArray(value)) {
    return [`${path} must be an array`];
  }

  const errors: string[] = [];
  const seenNames = new Set<string>();

  for (const [index, item] of value.entries()) {
    const fieldPath = `${path}[${index}]`;
    if (!isRecord(item)) {
      errors.push(`${fieldPath} must be an object`);
      continue;
    }

    if (typeof item.name !== "string" || item.name.trim() === "") {
      errors.push(`${fieldPath}.name must be a non-empty string`);
    } else {
      const normalized = item.name.trim().toLowerCase();
      if (seenNames.has(normalized)) {
        errors.push(`${fieldPath}.name must be unique within its group`);
      }
      seenNames.add(normalized);
    }

    errors.push(...validateFieldDefinition(item, fieldPath));
  }

  return errors;
}

export function assertValidNamedFields(
  value: unknown,
): asserts value is Field[] {
  const errors = validateNamedFields(value);
  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }
}
