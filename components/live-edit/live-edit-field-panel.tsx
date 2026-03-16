"use client";

import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Copy,
  Plus,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FieldWrapper } from "@/components/dynamic-form/field-wrapper";
import { FormProvider } from "@/components/dynamic-form/form-context";
import { renderField } from "@/components/dynamic-form/render-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Id } from "@/convex/_generated/dataModel";
import { cloneContentValue } from "@/lib/clone-content-value";
import { cn } from "@/lib/utils";
import {
  createEmptyValueForField,
  type FieldDefinition,
  type FragmentDefinition,
  getFieldDisplayName,
  getValueAtPath,
  joinFieldPath,
  type NamedFieldDefinition,
  resolveFragmentFields,
} from "@/packages/no-mess-client/src/schema";

interface LiveEditFieldPanelProps {
  fields: NamedFieldDefinition[];
  fragments?: FragmentDefinition[];
  mappedFieldNames: string[];
  title: string;
  values: Record<string, unknown>;
  siteId: Id<"sites">;
  focusedField: string | null;
  disabled?: boolean;
  onTitleChange: (title: string) => void;
  onFieldChange: (fieldName: string, value: unknown) => void;
  onFieldFocus: (fieldName: string) => void;
  onFieldBlur: (fieldName: string) => void;
}

type ArrayFieldDefinition = Extract<FieldDefinition, { type: "array" }>;

function moveItem<T>(items: T[], index: number, delta: number) {
  const nextIndex = index + delta;
  if (nextIndex < 0 || nextIndex >= items.length) {
    return items;
  }

  const next = [...items];
  const [item] = next.splice(index, 1);
  next.splice(nextIndex, 0, item);
  return next;
}

export function LiveEditFieldPanel({
  fields,
  fragments = [],
  mappedFieldNames,
  title,
  values,
  siteId,
  focusedField,
  disabled,
  onTitleChange,
  onFieldChange,
  onFieldFocus,
  onFieldBlur,
}: LiveEditFieldPanelProps) {
  const [showUnmapped, setShowUnmapped] = useState(false);
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
  const fragmentsMap = useMemo(
    () => new Map(fragments.map((fragment) => [fragment.slug, fragment])),
    [fragments],
  );
  const mappedSet = useMemo(
    () => new Set(mappedFieldNames),
    [mappedFieldNames],
  );

  useEffect(() => {
    if (!focusedField) return;
    const element = fieldRefs.current[focusedField];
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [focusedField]);

  const setFieldRef = useCallback(
    (fieldName: string) => (element: HTMLElement | null) => {
      fieldRefs.current[fieldName] = element;
    },
    [],
  );

  const renderArrayField = (
    field: ArrayFieldDefinition,
    path: string,
    label: string,
    value: unknown,
  ) => {
    const items = Array.isArray(value) ? value : [];
    const isFragmentArray = field.of.type === "fragment";
    const addItem = (item: unknown) => {
      onFieldChange(path, [...items, item]);
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
      <div key={path} className="space-y-3 rounded-lg border p-4">
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
            const itemPath = joinFieldPath(path, index);
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
                          onFieldChange(path, moveItem(items, index, -1))
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
                          onFieldChange(path, moveItem(items, index, 1))
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
                          onFieldChange(
                            path,
                            items.filter((_, itemIndex) => itemIndex !== index),
                          )
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
                    onClick={() => {
                      const nextItems = [...items];
                      nextItems.splice(
                        index + 1,
                        0,
                        createEmptyValueForField(field.of, fragmentsMap),
                      );
                      onFieldChange(path, nextItems);
                    }}
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

  const fieldHasMappedDescendant = useCallback(
    (field: NamedFieldDefinition, path: string): boolean => {
      if (mappedSet.has(path)) {
        return true;
      }

      if (field.type === "object") {
        return field.fields.some((child) =>
          fieldHasMappedDescendant(child, joinFieldPath(path, child.name)),
        );
      }

      if (field.type === "fragment") {
        const fragmentFields = resolveFragmentFields(field, fragmentsMap);
        return (
          fragmentFields?.some((child) =>
            fieldHasMappedDescendant(child, joinFieldPath(path, child.name)),
          ) ?? false
        );
      }

      if (field.type === "array") {
        return mappedFieldNames.some((mappedPath) =>
          mappedPath.startsWith(`${path}[`),
        );
      }

      return false;
    },
    [fragmentsMap, mappedFieldNames, mappedSet],
  );

  const mappedFields = fields.filter((field) =>
    fieldHasMappedDescendant(field, field.name),
  );
  const unmappedFields = fields.filter(
    (field) => !fieldHasMappedDescendant(field, field.name),
  );

  const displayMapped = mappedFieldNames.length > 0 ? mappedFields : fields;
  const displayUnmapped = mappedFieldNames.length > 0 ? unmappedFields : [];

  const renderArrayItem = (field: FieldDefinition, itemPath: string) => {
    if (field.type === "object") {
      return (
        <div className="space-y-4">
          {field.fields.map((childField) =>
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
      <fieldset
        ref={setFieldRef(itemPath)}
        className={cn(
          "rounded-md border-0 p-3 transition-colors",
          focusedField === itemPath && "bg-accent",
        )}
        onFocus={() => onFieldFocus(itemPath)}
        onBlur={() => onFieldBlur(itemPath)}
      >
        <FieldWrapper
          label={getFieldDisplayName(field)}
          description={field.description}
          required={field.required}
        >
          {renderField(
            field,
            getValueAtPath(values, itemPath),
            (nextValue) => onFieldChange(itemPath, nextValue),
            disabled,
          )}
        </FieldWrapper>
      </fieldset>
    );
  };

  const renderNamedField = (field: NamedFieldDefinition, parentPath = "") => {
    const path = joinFieldPath(parentPath, field.name);
    const label = getFieldDisplayName(field);
    const value = getValueAtPath(values, path);

    if (field.type === "object") {
      return (
        <div key={path} className="space-y-4 rounded-lg border p-4">
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
              renderNamedField(childField, path),
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
            key={path}
            className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
          >
            Missing fragment: {field.fragment}
          </div>
        );
      }

      return (
        <div key={path} className="space-y-4 rounded-lg border p-4">
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
              renderNamedField(childField, path),
            )}
          </div>
        </div>
      );
    }

    if (field.type === "array") {
      return renderArrayField(field, path, label, value);
    }

    return (
      <fieldset
        key={path}
        ref={setFieldRef(path)}
        className={cn(
          "rounded-md border-0 p-3 transition-colors",
          focusedField === path && "bg-accent",
        )}
        onFocus={() => onFieldFocus(path)}
        onBlur={() => onFieldBlur(path)}
      >
        <FieldWrapper
          label={label}
          description={field.description}
          required={field.required}
        >
          {renderField(
            field,
            value,
            (nextValue) => onFieldChange(path, nextValue),
            disabled,
          )}
        </FieldWrapper>
      </fieldset>
    );
  };

  return (
    <ScrollArea className="h-full min-h-0">
      <div className="space-y-5 p-4">
        <fieldset
          ref={setFieldRef("title")}
          className={cn(
            "rounded-md border-0 p-3 transition-colors",
            focusedField === "title" && "bg-accent",
          )}
          onFocus={() => onFieldFocus("title")}
          onBlur={() => onFieldBlur("title")}
        >
          <div className="space-y-2">
            <Label htmlFor="live-edit-title">Title</Label>
            <Input
              id="live-edit-title"
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              disabled={disabled}
            />
          </div>
        </fieldset>

        <FormProvider siteId={siteId}>
          {displayMapped.map((field) => renderNamedField(field))}

          {displayUnmapped.length > 0 && (
            <div className="border-t pt-3">
              <button
                type="button"
                className="flex w-full items-center gap-2 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                onClick={() => setShowUnmapped(!showUnmapped)}
              >
                <ChevronDown
                  className={cn(
                    "h-3 w-3 transition-transform",
                    !showUnmapped && "-rotate-90",
                  )}
                />
                Unmapped fields ({displayUnmapped.length})
              </button>
              {showUnmapped && (
                <div className="space-y-4 pt-2">
                  {displayUnmapped.map((field) => renderNamedField(field))}
                </div>
              )}
            </div>
          )}
        </FormProvider>
      </div>
    </ScrollArea>
  );
}
