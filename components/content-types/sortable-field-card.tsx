"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Field, FieldType } from "@/convex/lib/validators";

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Textarea" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Boolean" },
  { value: "datetime", label: "Date/Time" },
  { value: "url", label: "URL" },
  { value: "image", label: "Image" },
  { value: "select", label: "Select" },
  { value: "shopifyProduct", label: "Shopify Product" },
  { value: "shopifyCollection", label: "Shopify Collection" },
];

type FieldWithKey = Field & { _key: number };

interface SortableFieldCardProps {
  field: FieldWithKey;
  onUpdate: (key: number, updates: Partial<Field>) => void;
  onDuplicate: (key: number) => void;
  onRemove: (key: number) => void;
  isSubmitting: boolean;
  hasDuplicateName?: boolean;
}

export function SortableFieldCard({
  field,
  onUpdate,
  onDuplicate,
  onRemove,
  isSubmitting,
  hasDuplicateName,
}: SortableFieldCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field._key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style}>
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            className="mt-2 shrink-0 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="flex-1 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Field Name</Label>
              <Input
                placeholder="title"
                value={field.name}
                onChange={(e) => onUpdate(field._key, { name: e.target.value })}
                disabled={isSubmitting}
                className={hasDuplicateName ? "ring-2 ring-destructive" : ""}
              />
              {hasDuplicateName && (
                <p className="text-xs text-destructive">Duplicate field name</p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select
                value={field.type}
                onValueChange={(val) =>
                  onUpdate(field._key, {
                    type: val as FieldType,
                  })
                }
              >
                <SelectTrigger className="w-full" disabled={isSubmitting}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {FIELD_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description (optional)</Label>
              <Input
                placeholder="Help text"
                value={field.description ?? ""}
                onChange={(e) =>
                  onUpdate(field._key, {
                    description: e.target.value,
                  })
                }
                disabled={isSubmitting}
              />
            </div>
            <div className="flex items-end gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) =>
                    onUpdate(field._key, {
                      required: e.target.checked,
                    })
                  }
                  disabled={isSubmitting}
                />
                Required
              </label>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => onDuplicate(field._key)}
              disabled={isSubmitting}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => onRemove(field._key)}
              disabled={isSubmitting}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
