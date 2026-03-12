import type {
  FragmentDefinition,
  PrimitiveFieldType,
  SelectChoice,
} from "./schema-types";

export interface FieldBuilderOptions {
  required?: boolean;
  description?: string;
  label?: string;
}

export interface SelectFieldOptions extends FieldBuilderOptions {
  choices: SelectChoice[];
}

export interface ObjectFieldOptions extends FieldBuilderOptions {
  fields: Record<string, FieldBuilderResult>;
}

export interface ArrayFieldOptions extends FieldBuilderOptions {
  of: FieldBuilderResult;
  minItems?: number;
  maxItems?: number;
}

export interface FragmentFieldOptions extends FieldBuilderOptions {}

interface BaseFieldBuilderResult {
  _required: boolean;
  _description?: string;
  _label?: string;
}

export interface PrimitiveFieldBuilderResult extends BaseFieldBuilderResult {
  _type: PrimitiveFieldType;
  _options?: {
    choices?: SelectChoice[];
  };
}

export interface ObjectFieldBuilderResult extends BaseFieldBuilderResult {
  _type: "object";
  _fields: Record<string, FieldBuilderResult>;
}

export interface ArrayFieldBuilderResult extends BaseFieldBuilderResult {
  _type: "array";
  _of: FieldBuilderResult;
  _minItems?: number;
  _maxItems?: number;
}

export interface FragmentFieldBuilderResult extends BaseFieldBuilderResult {
  _type: "fragment";
  _fragment: string;
}

export type FieldBuilderResult =
  | PrimitiveFieldBuilderResult
  | ObjectFieldBuilderResult
  | ArrayFieldBuilderResult
  | FragmentFieldBuilderResult;

function createFieldBuilder(type: PrimitiveFieldType) {
  return (opts?: FieldBuilderOptions): PrimitiveFieldBuilderResult => ({
    _type: type,
    _required: opts?.required ?? false,
    _description: opts?.description,
    _label: opts?.label,
  });
}

export const field = {
  text: createFieldBuilder("text"),
  textarea: createFieldBuilder("textarea"),
  number: createFieldBuilder("number"),
  boolean: createFieldBuilder("boolean"),
  datetime: createFieldBuilder("datetime"),
  url: createFieldBuilder("url"),
  image: createFieldBuilder("image"),
  gallery: createFieldBuilder("gallery"),
  select: (opts: SelectFieldOptions): PrimitiveFieldBuilderResult => ({
    _type: "select",
    _required: opts.required ?? false,
    _description: opts.description,
    _label: opts.label,
    _options: { choices: opts.choices },
  }),
  object: (opts: ObjectFieldOptions): ObjectFieldBuilderResult => ({
    _type: "object",
    _required: opts.required ?? false,
    _description: opts.description,
    _label: opts.label,
    _fields: opts.fields,
  }),
  array: (opts: ArrayFieldOptions): ArrayFieldBuilderResult => ({
    _type: "array",
    _required: opts.required ?? false,
    _description: opts.description,
    _label: opts.label,
    _of: opts.of,
    _minItems: opts.minItems,
    _maxItems: opts.maxItems,
  }),
  fragment: (
    fragment: string | FragmentDefinition,
    opts?: FragmentFieldOptions,
  ): FragmentFieldBuilderResult => ({
    _type: "fragment",
    _required: opts?.required ?? false,
    _description: opts?.description,
    _label: opts?.label,
    _fragment: typeof fragment === "string" ? fragment : fragment.slug,
  }),
  shopifyProduct: createFieldBuilder("shopifyProduct"),
  shopifyCollection: createFieldBuilder("shopifyCollection"),
};
