"use client";

import type {
  FieldDefinition,
  FragmentDefinition,
  NamedFieldDefinition,
} from "@no-mess/client/schema";
import {
  appendValueAtPath,
  createEmptyValueForField,
  getFieldDisplayName,
  getValueAtPath,
  insertValueAtPath,
  joinFieldPath,
  moveArrayValueAtPath,
  removeValueAtPath,
  resolveFragmentFields,
  setValueAtPath,
} from "@no-mess/client/schema";
import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Id } from "@/convex/_generated/dataModel";
import { cloneContentValue } from "@/lib/clone-content-value";
import { FieldWrapper } from "./field-wrapper";
import { FormProvider } from "./form-context";
import { renderField } from "./render-field";

interface DynamicFormProps {
  fields: NamedFieldDefinition[];
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
  disabled?: boolean;
  siteId?: Id<"sites">;
  fragments?: FragmentDefinition[];
}

type ArrayFieldDefinition = Extract<FieldDefinition, { type: "array" }>;

export function DynamicForm({
  fields,
  values,
  onChange,
  disabled,
  siteId,
  fragments = [],
}: DynamicFormProps) {
  const handleFieldChange = (fieldName: string, value: unknown) => {
    onChange(setValueAtPath(values, fieldName, value));
  };

  const fragmentsMap = new Map(
    fragments.map((fragment) => [fragment.slug, fragment]),
  );

  const renderArrayField = (
    field: ArrayFieldDefinition,
    fieldPath: string,
    label: string,
    fieldValue: unknown,
  ) => {
    const items = Array.isArray(fieldValue) ? fieldValue : [];
    const isFragmentArray = field.of.type === "fragment";
    const addItem = (item: unknown) => {
      onChange(appendValueAtPath(values, fieldPath, item));
    };
    const addEmptyItem = () => {
      addItem(createEmptyValueForField(field.of, fragmentsMap));
    };
    const duplicatePreviousItem = () => {
      const previousItem = items[items.length - 1];
      if (previousItem === undefined) {
        return;
      }
      addItem(cloneContentValue(previousItem));
    };

    return (
      <div key={fieldPath} className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">{label}</p>
            {field.description && (
              <p className="text-xs text-muted-foreground">
                {field.description}
              </p>
            )}
          </div>
          {!isFragmentArray && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addEmptyItem}
              disabled={disabled}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {items.length === 0 && (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              No items yet.
            </div>
          )}

          {items.map((_, index) => {
            const itemPath = joinFieldPath(fieldPath, index);
            return (
              <div key={itemPath} className="space-y-2">
                <div className="space-y-3 rounded-md border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Item {index + 1}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          onChange(
                            moveArrayValueAtPath(
                              values,
                              fieldPath,
                              index,
                              index - 1,
                            ),
                          )
                        }
                        disabled={disabled || index === 0}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          onChange(
                            moveArrayValueAtPath(
                              values,
                              fieldPath,
                              index,
                              index + 1,
                            ),
                          )
                        }
                        disabled={disabled || index === items.length - 1}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          onChange(removeValueAtPath(values, fieldPath, index))
                        }
                        disabled={disabled}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {renderArrayItem(field.of, itemPath)}
                </div>

                {!isFragmentArray && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    aria-label={`Add item after item ${index + 1}`}
                    onClick={() =>
                      onChange(
                        insertValueAtPath(
                          values,
                          fieldPath,
                          index + 1,
                          createEmptyValueForField(field.of, fragmentsMap),
                        ),
                      )
                    }
                    disabled={disabled}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {isFragmentArray && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addEmptyItem}
              disabled={disabled}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={duplicatePreviousItem}
              disabled={disabled || items.length === 0}
            >
              <Copy className="mr-2 h-4 w-4" />
              Duplicate Previous
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderNamedField = (field: NamedFieldDefinition, parentPath = "") => {
    const fieldPath = joinFieldPath(parentPath, field.name);
    const label = getFieldDisplayName(field);
    const fieldValue = getValueAtPath(values, fieldPath);

    if (field.type === "object") {
      return (
        <div key={fieldPath} className="space-y-4 rounded-lg border p-4">
          <div>
            <p className="text-sm font-medium">{label}</p>
            {field.description && (
              <p className="text-xs text-muted-foreground">
                {field.description}
              </p>
            )}
          </div>
          <div className="space-y-4">
            {field.fields.map((childField) =>
              renderNamedField(childField, fieldPath),
            )}
          </div>
        </div>
      );
    }

    if (field.type === "fragment") {
      const fragmentFields = resolveFragmentFields(field, fragmentsMap);
      if (!fragmentFields) {
        return (
          <div
            key={fieldPath}
            className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
          >
            Missing fragment: {field.fragment}
          </div>
        );
      }

      return (
        <div key={fieldPath} className="space-y-4 rounded-lg border p-4">
          <div>
            <p className="text-sm font-medium">{label}</p>
            {field.description && (
              <p className="text-xs text-muted-foreground">
                {field.description}
              </p>
            )}
          </div>
          <div className="space-y-4">
            {fragmentFields.map((childField) =>
              renderNamedField(childField, fieldPath),
            )}
          </div>
        </div>
      );
    }

    if (field.type === "array") {
      return renderArrayField(field, fieldPath, label, fieldValue);
    }

    return (
      <FieldWrapper
        key={fieldPath}
        label={label}
        description={field.description}
        required={field.required}
      >
        {renderField(
          field,
          fieldValue,
          (nextValue) => handleFieldChange(fieldPath, nextValue),
          disabled,
        )}
      </FieldWrapper>
    );
  };

  const renderArrayItem = (field: FieldDefinition, itemPath: string) => {
    if (field.type === "object") {
      return (
        <div className="space-y-4">
          {field.fields.map((childField: NamedFieldDefinition) =>
            renderNamedField(childField, itemPath),
          )}
        </div>
      );
    }

    if (field.type === "fragment") {
      const fragmentFields = resolveFragmentFields(field, fragmentsMap);
      if (!fragmentFields) {
        return (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            Missing fragment: {field.fragment}
          </div>
        );
      }

      return (
        <div className="space-y-4">
          {fragmentFields.map((childField) =>
            renderNamedField(childField, itemPath),
          )}
        </div>
      );
    }

    if (field.type === "array") {
      return renderArrayField(
        field,
        itemPath,
        field.label ?? "Items",
        getValueAtPath(values, itemPath),
      );
    }

    return (
      <FieldWrapper
        label={getFieldDisplayName(field)}
        description={field.description}
        required={field.required}
      >
        {renderField(
          field,
          getValueAtPath(values, itemPath),
          (nextValue) => handleFieldChange(itemPath, nextValue),
          disabled,
        )}
      </FieldWrapper>
    );
  };

  const content = (
    <div className="space-y-4">
      {fields.map((field) => renderNamedField(field))}
    </div>
  );

  if (siteId) {
    return <FormProvider siteId={siteId}>{content}</FormProvider>;
  }

  return content;
}
