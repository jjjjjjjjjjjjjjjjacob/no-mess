"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useQuery } from "convex/react";
import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SortableFieldCard } from "@/components/content-types/sortable-field-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { Field } from "@/convex/lib/validators";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

export interface ContentTypeFormData {
  name: string;
  slug: string;
  description?: string;
  fields: Field[];
}

interface ContentTypeFormProps {
  initialData?: ContentTypeFormData;
  onSubmit: (data: ContentTypeFormData) => Promise<void>;
  onChange?: (data: ContentTypeFormData) => void;
  isEditing?: boolean;
  siteId?: Id<"sites">;
  contentTypeId?: Id<"contentTypes">;
  formId?: string;
  hideSubmit?: boolean;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type FieldWithKey = Field & { _key: number };

function toFieldsWithKeys(
  fields: Field[],
  startKey: number,
): { fields: FieldWithKey[]; nextKey: number } {
  return {
    fields: fields.map((f, i) => ({ ...f, _key: startKey + i })),
    nextKey: startKey + fields.length,
  };
}

export function ContentTypeForm({
  initialData,
  onSubmit,
  onChange,
  isEditing,
  siteId,
  contentTypeId,
  formId,
  hideSubmit,
}: ContentTypeFormProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(!!initialData);
  const [description, setDescription] = useState(
    initialData?.description ?? "",
  );

  const initialFields = initialData?.fields ?? [
    { name: "", type: "text" as const, required: false },
  ];
  const { fields: initialFieldsWithKeys, nextKey: initialNextKey } =
    toFieldsWithKeys(initialFields, 0);
  const nextKeyRef = useRef(initialNextKey);

  const [fields, setFields] = useState<FieldWithKey[]>(initialFieldsWithKeys);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [_submitted, _setSubmitted] = useState(false);

  // Notify parent of form data changes for auto-save
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    onChangeRef.current?.({
      name,
      slug,
      description: description || undefined,
      fields: fields.map(({ _key, ...f }) => ({
        ...f,
        name: f.name.trim(),
        description: f.description?.trim() || undefined,
      })),
    });
  }, [name, slug, description, fields]);

  const debouncedSlug = useDebouncedValue(slug, 300);
  const shouldCheckSlug =
    !!siteId &&
    debouncedSlug.trim() !== "" &&
    debouncedSlug !== initialData?.slug;
  const slugAvailability = useQuery(
    api.contentTypes.checkSlugAvailability,
    shouldCheckSlug
      ? {
          siteId,
          slug: debouncedSlug.trim(),
          excludeContentTypeId: contentTypeId,
        }
      : "skip",
  );
  const slugUnavailable =
    shouldCheckSlug && slugAvailability && !slugAvailability.available;

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugEdited) {
      setSlug(slugify(value));
    }
  };

  const addField = () => {
    const key = nextKeyRef.current;
    nextKeyRef.current += 1;
    setFields([
      ...fields,
      { name: "", type: "text", required: false, _key: key },
    ]);
  };

  const duplicateField = (key: number) => {
    const source = fields.find((f) => f._key === key);
    if (!source) return;
    const newKey = nextKeyRef.current;
    nextKeyRef.current += 1;
    const { _key, ...rest } = source;

    const trailingNum = rest.name.match(/^(.*?)(\d+)$/);
    if (trailingNum) {
      const [, base, num] = trailingNum;
      let next_num = Number(num) + 1;
      const existing = new Set(fields.map((f) => f.name.trim().toLowerCase()));
      while (existing.has(`${base}${next_num}`.toLowerCase())) {
        next_num++;
      }
      rest.name = `${base}${next_num}`;
    }

    const sourceIndex = fields.findIndex((f) => f._key === key);
    const next = [...fields];
    next.splice(sourceIndex + 1, 0, { ...rest, _key: newKey });
    setFields(next);
  };

  const removeField = (key: number) => {
    setFields(fields.filter((f) => f._key !== key));
  };

  const updateField = (key: number, updates: Partial<Field>) => {
    setFields(fields.map((f) => (f._key === key ? { ...f, ...updates } : f)));
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setFields((items) => {
        const oldIndex = items.findIndex((f) => f._key === active.id);
        const newIndex = items.findIndex((f) => f._key === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;
    if (fields.length === 0) return;
    if (fields.some((f) => !f.name.trim())) return;
    const fieldNames = fields.map((f) => f.name.trim().toLowerCase());
    if (new Set(fieldNames).size !== fieldNames.length) {
      setError("Field names must be unique within a content type");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
        fields: fields.map(({ _key, ...f }) => ({
          ...f,
          name: f.name.trim(),
          description: f.description?.trim() || undefined,
        })),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const duplicateKeys = (() => {
    const seen = new Map<string, number[]>();
    for (const f of fields) {
      const normalized = f.name.trim().toLowerCase();
      if (!normalized) continue;
      const keys = seen.get(normalized);
      if (keys) keys.push(f._key);
      else seen.set(normalized, [f._key]);
    }
    const dupes = new Set<number>();
    for (const keys of seen.values()) {
      if (keys.length > 1) for (const k of keys) dupes.add(k);
    }
    return dupes;
  })();
  const hasDuplicates = duplicateKeys.size > 0;

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ct-name">Name</Label>
          <Input
            id="ct-name"
            placeholder="Blog Post"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ct-slug">Slug</Label>
          <Input
            id="ct-slug"
            placeholder="blog-post"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugEdited(true);
            }}
            disabled={isSubmitting}
          />
          <p className="text-xs text-muted-foreground">
            Used in the API URL: /api/content/{slug || "..."}
          </p>
          {shouldCheckSlug &&
            slugAvailability &&
            (slugAvailability.available ? (
              <p className="text-xs text-green-600">Slug is available</p>
            ) : (
              <div className="space-y-1">
                <p className="text-xs text-destructive">
                  This slug is already taken.
                </p>
                {slugAvailability.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {slugAvailability.suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className="text-xs text-primary underline hover:no-underline"
                        onClick={() => {
                          setSlug(s);
                          setSlugEdited(true);
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
        </div>
        <div className="space-y-2">
          <Label htmlFor="ct-desc">Description (optional)</Label>
          <Textarea
            id="ct-desc"
            placeholder="A brief description of this content type"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSubmitting}
            rows={2}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Fields</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addField}
            disabled={isSubmitting}
          >
            <Plus className="mr-2 h-3 w-3" />
            Add Field
          </Button>
        </div>

        {fields.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Add at least one field to your schema.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={fields.map((f) => f._key)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {fields.map((field) => (
                  <SortableFieldCard
                    key={field._key}
                    field={field}
                    onUpdate={updateField}
                    onDuplicate={duplicateField}
                    onRemove={removeField}
                    isSubmitting={isSubmitting}
                    hasDuplicateName={duplicateKeys.has(field._key)}
                  />
                ))}
                {fields.length >= 2 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addField}
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    <Plus className="mr-2 h-3 w-3" />
                    Add Field
                  </Button>
                )}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!hideSubmit && (
        <Button
          type="submit"
          disabled={
            isSubmitting ||
            !name.trim() ||
            !slug.trim() ||
            fields.length === 0 ||
            !!slugUnavailable ||
            hasDuplicates
          }
        >
          {isSubmitting
            ? "Saving..."
            : isEditing
              ? "Save Changes"
              : "Create Schema"}
        </Button>
      )}
    </form>
  );
}
