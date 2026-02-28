"use client";

import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { FieldWrapper } from "@/components/dynamic-form/field-wrapper";
import { FormProvider } from "@/components/dynamic-form/form-context";
import {
  type FieldDefinition,
  renderField,
} from "@/components/dynamic-form/render-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface LiveEditFieldPanelProps {
  fields: FieldDefinition[];
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

export function LiveEditFieldPanel({
  fields,
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

  const mappedFields = fields.filter((f) => mappedFieldNames.includes(f.name));
  const unmappedFields = fields.filter(
    (f) => !mappedFieldNames.includes(f.name),
  );

  // If no field map received yet, show all fields as mapped
  const displayMapped = mappedFieldNames.length > 0 ? mappedFields : fields;
  const displayUnmapped = mappedFieldNames.length > 0 ? unmappedFields : [];

  // Scroll to focused field when it changes
  useEffect(() => {
    if (!focusedField) return;
    const el = fieldRefs.current[focusedField];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [focusedField]);

  const setFieldRef = useCallback(
    (fieldName: string) => (el: HTMLElement | null) => {
      fieldRefs.current[fieldName] = el;
    },
    [],
  );

  return (
    <ScrollArea className="h-full">
      <div className="space-y-5 p-4">
        {/* Title field (always shown first) */}
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
              onChange={(e) => onTitleChange(e.target.value)}
              disabled={disabled}
            />
          </div>
        </fieldset>

        {/* Mapped fields */}
        <FormProvider siteId={siteId}>
          {displayMapped.map((field) => (
            <fieldset
              key={field.name}
              ref={setFieldRef(field.name)}
              className={cn(
                "rounded-md border-0 p-3 transition-colors",
                focusedField === field.name && "bg-accent",
              )}
              onFocus={() => onFieldFocus(field.name)}
              onBlur={() => onFieldBlur(field.name)}
            >
              <FieldWrapper
                label={field.name}
                description={field.description}
                required={field.required}
              >
                {renderField(
                  field,
                  values[field.name],
                  (v) => onFieldChange(field.name, v),
                  disabled,
                )}
              </FieldWrapper>
            </fieldset>
          ))}

          {/* Unmapped fields (collapsible) */}
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
                  {displayUnmapped.map((field) => (
                    <div
                      key={field.name}
                      ref={setFieldRef(field.name)}
                      className="rounded-md p-3"
                    >
                      <FieldWrapper
                        label={field.name}
                        description={field.description}
                        required={field.required}
                      >
                        {renderField(
                          field,
                          values[field.name],
                          (v) => onFieldChange(field.name, v),
                          disabled,
                        )}
                      </FieldWrapper>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </FormProvider>
      </div>
    </ScrollArea>
  );
}
