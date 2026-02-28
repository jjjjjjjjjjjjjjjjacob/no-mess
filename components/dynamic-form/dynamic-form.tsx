"use client";

import type { Id } from "@/convex/_generated/dataModel";
import { FieldWrapper } from "./field-wrapper";
import { FormProvider } from "./form-context";
import { type FieldDefinition, renderField } from "./render-field";

interface DynamicFormProps {
  fields: FieldDefinition[];
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
  disabled?: boolean;
  siteId?: Id<"sites">;
}

export function DynamicForm({
  fields,
  values,
  onChange,
  disabled,
  siteId,
}: DynamicFormProps) {
  const handleFieldChange = (fieldName: string, value: unknown) => {
    onChange({ ...values, [fieldName]: value });
  };

  const content = (
    <div className="space-y-4">
      {fields.map((field) => (
        <FieldWrapper
          key={field.name}
          label={field.name}
          description={field.description}
          required={field.required}
        >
          {renderField(
            field,
            values[field.name],
            (v) => handleFieldChange(field.name, v),
            disabled,
          )}
        </FieldWrapper>
      ))}
    </div>
  );

  if (siteId) {
    return <FormProvider siteId={siteId}>{content}</FormProvider>;
  }

  return content;
}
