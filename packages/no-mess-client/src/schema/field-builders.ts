import type { FieldType } from "./schema-types";

export interface FieldBuilderOptions {
  required?: boolean;
  description?: string;
}

export interface SelectChoice {
  label: string;
  value: string;
}

export interface SelectFieldOptions extends FieldBuilderOptions {
  choices: SelectChoice[];
}

export interface FieldBuilderResult {
  _type: FieldType;
  _required: boolean;
  _description?: string;
  _options?: {
    choices?: SelectChoice[];
  };
}

function createFieldBuilder(type: FieldType) {
  return (opts?: FieldBuilderOptions): FieldBuilderResult => ({
    _type: type,
    _required: opts?.required ?? false,
    _description: opts?.description,
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
  select: (opts: SelectFieldOptions): FieldBuilderResult => ({
    _type: "select",
    _required: opts.required ?? false,
    _description: opts.description,
    _options: { choices: opts.choices },
  }),
  shopifyProduct: createFieldBuilder("shopifyProduct"),
  shopifyCollection: createFieldBuilder("shopifyCollection"),
};
