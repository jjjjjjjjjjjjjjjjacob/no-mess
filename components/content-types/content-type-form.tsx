"use client";

import { useQuery } from "convex/react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type {
  FieldDefinition,
  FieldType,
  FragmentDefinition,
  NamedFieldDefinition,
  SchemaKind,
  SelectChoice,
  TemplateMode,
} from "@/packages/no-mess-client/src/schema";

const FIELD_TYPE_OPTIONS: { label: string; value: FieldType }[] = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Textarea" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Boolean" },
  { value: "datetime", label: "Date/Time" },
  { value: "url", label: "URL" },
  { value: "image", label: "Image" },
  { value: "gallery", label: "Gallery" },
  { value: "select", label: "Select" },
  { value: "shopifyProduct", label: "Shopify Product" },
  { value: "shopifyCollection", label: "Shopify Collection" },
  { value: "object", label: "Object Group" },
  { value: "array", label: "Repeater" },
  { value: "fragment", label: "Fragment Reference" },
] as const;

const KIND_OPTIONS: { label: string; value: SchemaKind }[] = [
  { value: "template", label: "Template" },
  { value: "fragment", label: "Fragment" },
];

const MODE_OPTIONS: { label: string; value: TemplateMode }[] = [
  { value: "collection", label: "Collection" },
  { value: "singleton", label: "Singleton" },
];

type FieldPreset = "imageWithAlt" | "labeledImage" | "gallery";

type SchemaFieldEditorNode = {
  _id: string;
  name?: string;
  type: FieldType;
  required: boolean;
  label?: string;
  description?: string;
  options?: {
    choices?: SelectChoice[];
  };
  fields?: SchemaFieldEditorNode[];
  of?: SchemaFieldEditorNode;
  fragment?: string;
  minItems?: number;
  maxItems?: number;
};

export interface ContentTypeFormData {
  kind: SchemaKind;
  mode?: TemplateMode;
  route?: string;
  name: string;
  slug: string;
  description?: string;
  fields: NamedFieldDefinition[];
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

interface FieldAddControlsProps {
  disabled: boolean;
  onAddPreset: (preset: FieldPreset) => void;
  onAddType: (type: FieldType) => void;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function getFieldTypeLabel(type: FieldType) {
  return (
    FIELD_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type
  );
}

function createChoice(index: number): SelectChoice {
  return {
    label: `Option ${index + 1}`,
    value: `option-${index + 1}`,
  };
}

function createFieldNode(
  type: FieldType,
  allocateId: () => string,
  named = true,
): SchemaFieldEditorNode {
  const base: SchemaFieldEditorNode = {
    _id: allocateId(),
    type,
    required: false,
    ...(named ? { name: "" } : {}),
  };

  switch (type) {
    case "object":
      return {
        ...base,
        fields: [createFieldNode("text", allocateId, true)],
      };
    case "array":
      return {
        ...base,
        of: createFieldNode("text", allocateId, false),
      };
    case "fragment":
      return {
        ...base,
        fragment: "",
      };
    case "select":
      return {
        ...base,
        options: {
          choices: [createChoice(0)],
        },
      };
    default:
      return base;
  }
}

function createPresetField(
  preset: FieldPreset,
  allocateId: () => string,
): SchemaFieldEditorNode {
  switch (preset) {
    case "imageWithAlt":
      return {
        _id: allocateId(),
        name: "image",
        type: "object",
        required: false,
        label: "Image With Alt",
        fields: [
          {
            _id: allocateId(),
            name: "src",
            type: "image",
            required: true,
            label: "Image",
          },
          {
            _id: allocateId(),
            name: "alt",
            type: "text",
            required: false,
            label: "Alt Text",
          },
        ],
      };
    case "labeledImage":
      return {
        _id: allocateId(),
        name: "media",
        type: "object",
        required: false,
        label: "Labeled Image",
        fields: [
          {
            _id: allocateId(),
            name: "image",
            type: "image",
            required: true,
            label: "Image",
          },
          {
            _id: allocateId(),
            name: "alt",
            type: "text",
            required: false,
            label: "Alt Text",
          },
          {
            _id: allocateId(),
            name: "label",
            type: "text",
            required: false,
            label: "Label",
          },
        ],
      };
    case "gallery":
      return {
        _id: allocateId(),
        name: "gallery",
        type: "array",
        required: false,
        label: "Gallery",
        of: {
          _id: allocateId(),
          type: "object",
          required: false,
          fields: [
            {
              _id: allocateId(),
              name: "image",
              type: "image",
              required: true,
            },
            {
              _id: allocateId(),
              name: "alt",
              type: "text",
              required: false,
            },
            {
              _id: allocateId(),
              name: "label",
              type: "text",
              required: false,
            },
          ],
        },
      };
  }
}

function deserializeNamedField(
  field: NamedFieldDefinition,
  allocateId: () => string,
): SchemaFieldEditorNode {
  return {
    ...deserializeField(field, allocateId),
    name: field.name,
  };
}

function deserializeField(
  field: FieldDefinition,
  allocateId: () => string,
): SchemaFieldEditorNode {
  const base: SchemaFieldEditorNode = {
    _id: allocateId(),
    type: field.type,
    required: field.required,
    label: field.label,
    description: field.description,
  };

  switch (field.type) {
    case "object":
      return {
        ...base,
        fields: field.fields.map((child) =>
          deserializeNamedField(child, allocateId),
        ),
      };
    case "array":
      return {
        ...base,
        of: deserializeField(field.of, allocateId),
        minItems: field.minItems,
        maxItems: field.maxItems,
      };
    case "fragment":
      return {
        ...base,
        fragment: field.fragment,
      };
    default:
      return {
        ...base,
        options: field.options
          ? {
              choices: field.options.choices?.map((choice) => ({ ...choice })),
            }
          : undefined,
      };
  }
}

function serializeField(node: SchemaFieldEditorNode): FieldDefinition {
  const base = {
    type: node.type,
    required: node.required,
    ...(node.label?.trim() ? { label: node.label.trim() } : {}),
    ...(node.description?.trim()
      ? { description: node.description.trim() }
      : {}),
  };

  switch (node.type) {
    case "object":
      return {
        ...base,
        type: "object",
        fields: serializeNamedFields(node.fields ?? []),
      };
    case "array":
      return {
        ...base,
        type: "array",
        of: serializeField(
          node.of ?? { _id: "fallback", type: "text", required: false },
        ),
        ...(node.minItems !== undefined ? { minItems: node.minItems } : {}),
        ...(node.maxItems !== undefined ? { maxItems: node.maxItems } : {}),
      };
    case "fragment":
      return {
        ...base,
        type: "fragment",
        fragment: node.fragment?.trim() ?? "",
      };
    default: {
      const choices =
        node.type === "select"
          ? (node.options?.choices ?? [])
              .map((choice) => ({
                label: choice.label.trim(),
                value: choice.value.trim(),
              }))
              .filter((choice) => choice.label && choice.value)
          : undefined;

      return {
        ...base,
        type: node.type,
        ...(choices ? { options: { choices } } : {}),
      };
    }
  }
}

function serializeNamedFields(
  nodes: SchemaFieldEditorNode[],
): NamedFieldDefinition[] {
  return nodes.map((node) => ({
    ...serializeField(node),
    name: node.name?.trim() ?? "",
  })) as NamedFieldDefinition[];
}

function updateNodeTree(
  node: SchemaFieldEditorNode,
  targetId: string,
  updater: (node: SchemaFieldEditorNode) => SchemaFieldEditorNode,
): SchemaFieldEditorNode {
  const current = node._id === targetId ? updater(node) : node;

  return {
    ...current,
    ...(current.fields
      ? {
          fields: current.fields.map((child) =>
            updateNodeTree(child, targetId, updater),
          ),
        }
      : {}),
    ...(current.of
      ? {
          of: updateNodeTree(current.of, targetId, updater),
        }
      : {}),
  };
}

function updateNodeList(
  nodes: SchemaFieldEditorNode[],
  targetId: string,
  updater: (node: SchemaFieldEditorNode) => SchemaFieldEditorNode,
) {
  return nodes.map((node) => updateNodeTree(node, targetId, updater));
}

function removeNodeFromLists(
  nodes: SchemaFieldEditorNode[],
  targetId: string,
): SchemaFieldEditorNode[] {
  return nodes
    .filter((node) => node._id !== targetId)
    .map((node) => ({
      ...node,
      ...(node.fields
        ? {
            fields: removeNodeFromLists(node.fields, targetId),
          }
        : {}),
      ...(node.of
        ? {
            of: updateNodeTree(node.of, targetId, (current) => current),
          }
        : {}),
    }));
}

function moveNodeInLists(
  nodes: SchemaFieldEditorNode[],
  targetId: string,
  direction: -1 | 1,
): SchemaFieldEditorNode[] {
  const index = nodes.findIndex((node) => node._id === targetId);
  if (index !== -1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= nodes.length) {
      return nodes;
    }

    const next = [...nodes];
    const [item] = next.splice(index, 1);
    next.splice(nextIndex, 0, item);
    return next;
  }

  return nodes.map((node) => ({
    ...node,
    ...(node.fields
      ? {
          fields: moveNodeInLists(node.fields, targetId, direction),
        }
      : {}),
  }));
}

function cloneNodeWithNewIds(
  node: SchemaFieldEditorNode,
  allocateId: () => string,
): SchemaFieldEditorNode {
  return {
    ...node,
    _id: allocateId(),
    ...(node.fields
      ? {
          fields: node.fields.map((child) =>
            cloneNodeWithNewIds(child, allocateId),
          ),
        }
      : {}),
    ...(node.of
      ? {
          of: cloneNodeWithNewIds(node.of, allocateId),
        }
      : {}),
    ...(node.options?.choices
      ? {
          options: {
            choices: node.options.choices.map((choice) => ({ ...choice })),
          },
        }
      : {}),
  };
}

function createDuplicateName(
  sourceName: string | undefined,
  siblings: SchemaFieldEditorNode[],
) {
  if (!sourceName?.trim()) {
    return "";
  }

  const normalizedNames = new Set(
    siblings
      .map((node) => node.name?.trim().toLowerCase())
      .filter((value): value is string => Boolean(value)),
  );

  const suffix = "Copy";
  let attempt = `${sourceName}${suffix}`;
  let counter = 2;

  while (normalizedNames.has(attempt.toLowerCase())) {
    attempt = `${sourceName}${suffix}${counter}`;
    counter += 1;
  }

  return attempt;
}

function duplicateNodeInLists(
  nodes: SchemaFieldEditorNode[],
  targetId: string,
  allocateId: () => string,
): SchemaFieldEditorNode[] {
  const index = nodes.findIndex((node) => node._id === targetId);
  if (index !== -1) {
    const source = nodes[index];
    const clone = cloneNodeWithNewIds(source, allocateId);
    clone.name = createDuplicateName(source.name, nodes);
    const next = [...nodes];
    next.splice(index + 1, 0, clone);
    return next;
  }

  return nodes.map((node) => ({
    ...node,
    ...(node.fields
      ? {
          fields: duplicateNodeInLists(node.fields, targetId, allocateId),
        }
      : {}),
  }));
}

function getDuplicateNodeIds(nodes: SchemaFieldEditorNode[]) {
  const byName = new Map<string, string[]>();

  for (const node of nodes) {
    const normalized = node.name?.trim().toLowerCase();
    if (!normalized) {
      continue;
    }

    const ids = byName.get(normalized);
    if (ids) {
      ids.push(node._id);
    } else {
      byName.set(normalized, [node._id]);
    }
  }

  const duplicates = new Set<string>();
  for (const ids of byName.values()) {
    if (ids.length > 1) {
      for (const id of ids) {
        duplicates.add(id);
      }
    }
  }

  return duplicates;
}

function validateAnonymousField(
  node: SchemaFieldEditorNode,
  path: string,
): string | null {
  switch (node.type) {
    case "object":
      if (!node.fields || node.fields.length === 0) {
        return `${path} must include at least one child field`;
      }
      return validateNamedFields(node.fields, path);
    case "array":
      if (!node.of) {
        return `${path} must define an item schema`;
      }
      if (
        node.minItems !== undefined &&
        node.maxItems !== undefined &&
        node.minItems > node.maxItems
      ) {
        return `${path} cannot have min items greater than max items`;
      }
      return validateAnonymousField(node.of, `${path}[]`);
    case "fragment":
      if (!node.fragment?.trim()) {
        return `${path} must reference a fragment`;
      }
      return null;
    case "select": {
      const choices = node.options?.choices ?? [];
      if (choices.length === 0) {
        return `${path} must include at least one choice`;
      }
      for (const choice of choices) {
        if (!choice.label.trim() || !choice.value.trim()) {
          return `${path} has an incomplete choice`;
        }
      }
      return null;
    }
    default:
      return null;
  }
}

function validateNamedFields(
  nodes: SchemaFieldEditorNode[],
  parentPath: string,
): string | null {
  if (nodes.length === 0) {
    return parentPath === "schema"
      ? "Add at least one field to your schema"
      : `${parentPath} must include at least one child field`;
  }

  const duplicates = getDuplicateNodeIds(nodes);
  if (duplicates.size > 0) {
    return "Field names must be unique within each group";
  }

  for (const node of nodes) {
    const name = node.name?.trim();
    if (!name) {
      return "Every field needs a name";
    }

    const error = validateAnonymousField(node, `${parentPath}.${name}`);
    if (error) {
      return error;
    }
  }

  return null;
}

function normalizeTypeChange(
  node: SchemaFieldEditorNode,
  type: FieldType,
  allocateId: () => string,
) {
  const next = createFieldNode(type, allocateId, node.name !== undefined);
  return {
    ...next,
    name: node.name,
    required: node.required,
    label: node.label,
    description: node.description,
  };
}

function FieldAddControls({
  disabled,
  onAddPreset,
  onAddType,
}: FieldAddControlsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onAddType("text")}
        disabled={disabled}
      >
        <Plus className="mr-2 h-3 w-3" />
        Add Field
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onAddType("object")}
        disabled={disabled}
      >
        Add Group
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onAddType("array")}
        disabled={disabled}
      >
        Add Repeater
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onAddType("fragment")}
        disabled={disabled}
      >
        Add Fragment Ref
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onAddPreset("imageWithAlt")}
        disabled={disabled}
      >
        Image + Alt
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onAddPreset("gallery")}
        disabled={disabled}
      >
        Gallery Preset
      </Button>
    </div>
  );
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
  const [kind, setKind] = useState<SchemaKind>(initialData?.kind ?? "template");
  const [mode, setMode] = useState<TemplateMode>(
    initialData?.mode ?? "collection",
  );
  const [route, setRoute] = useState(initialData?.route ?? "");
  const [name, setName] = useState(initialData?.name ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(!!initialData);
  const [description, setDescription] = useState(
    initialData?.description ?? "",
  );
  const nextIdRef = useRef(0);
  const allocateId = () => `schema-field-${nextIdRef.current++}`;
  const [fields, setFields] = useState<SchemaFieldEditorNode[]>(() => {
    if (initialData?.fields?.length) {
      return initialData.fields.map((field) =>
        deserializeNamedField(field, allocateId),
      );
    }

    return [createFieldNode("text", allocateId, true)];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  const schemaDefinitions = useQuery(
    api.contentTypes.listBySite,
    siteId ? { siteId } : "skip",
  );
  const fragmentOptions = useMemo(
    () =>
      (schemaDefinitions ?? [])
        .filter((definition) => definition.kind === "fragment")
        .filter((definition) => definition.slug !== slug.trim())
        .map(
          (definition): FragmentDefinition => ({
            kind: "fragment",
            slug: definition.slug,
            name: definition.name,
            description: definition.description,
            fields: definition.fields,
          }),
        ),
    [schemaDefinitions, slug],
  );

  const buildFormData = useCallback(
    (): ContentTypeFormData => ({
      kind,
      mode: kind === "template" ? mode : undefined,
      route: kind === "template" ? route.trim() || undefined : undefined,
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim() || undefined,
      fields: serializeNamedFields(fields),
    }),
    [description, fields, kind, mode, name, route, slug],
  );

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    onChangeRef.current?.(buildFormData());
  }, [buildFormData]);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugEdited) {
      setSlug(slugify(value));
    }
  };

  const updateField = (
    targetId: string,
    updater: (node: SchemaFieldEditorNode) => SchemaFieldEditorNode,
  ) => {
    setFields((current) => updateNodeList(current, targetId, updater));
  };

  const appendTopLevelField = (type: FieldType) => {
    setFields((current) => [
      ...current,
      createFieldNode(type, allocateId, true),
    ]);
  };

  const appendTopLevelPreset = (preset: FieldPreset) => {
    setFields((current) => [...current, createPresetField(preset, allocateId)]);
  };

  const appendChildField = (parentId: string, type: FieldType) => {
    updateField(parentId, (node) =>
      node.type === "object"
        ? {
            ...node,
            fields: [
              ...(node.fields ?? []),
              createFieldNode(type, allocateId, true),
            ],
          }
        : node,
    );
  };

  const appendChildPreset = (parentId: string, preset: FieldPreset) => {
    updateField(parentId, (node) =>
      node.type === "object"
        ? {
            ...node,
            fields: [
              ...(node.fields ?? []),
              createPresetField(preset, allocateId),
            ],
          }
        : node,
    );
  };

  const replaceArrayItem = (parentId: string, type: FieldType) => {
    updateField(parentId, (node) =>
      node.type === "array"
        ? {
            ...node,
            of: createFieldNode(type, allocateId, false),
          }
        : node,
    );
  };

  const duplicateField = (targetId: string) => {
    setFields((current) => duplicateNodeInLists(current, targetId, allocateId));
  };

  const removeField = (targetId: string) => {
    setFields((current) => removeNodeFromLists(current, targetId));
  };

  const moveField = (targetId: string, direction: -1 | 1) => {
    setFields((current) => moveNodeInLists(current, targetId, direction));
  };

  const rootDuplicateIds = getDuplicateNodeIds(fields);
  const topLevelInvalid =
    fields.length === 0 ||
    fields.some((field) => !field.name?.trim()) ||
    rootDuplicateIds.size > 0;
  const slugUnavailable =
    shouldCheckSlug && slugAvailability && !slugAvailability.available;

  const renderChoiceEditor = (node: SchemaFieldEditorNode) => {
    if (node.type !== "select") {
      return null;
    }

    const choices = node.options?.choices ?? [];

    return (
      <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Choices</p>
            <p className="text-xs text-muted-foreground">
              Labels and values are serialized directly into the schema.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              updateField(node._id, (current) => ({
                ...current,
                options: {
                  choices: [
                    ...(current.options?.choices ?? []),
                    createChoice(current.options?.choices?.length ?? 0),
                  ],
                },
              }))
            }
            disabled={isSubmitting}
          >
            <Plus className="mr-2 h-3 w-3" />
            Add Choice
          </Button>
        </div>
        {choices.map((choice, index) => (
          <div
            key={`${node._id}-choice-${String(index)}`}
            className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
          >
            <Input
              placeholder="Label"
              value={choice.label}
              onChange={(event) =>
                updateField(node._id, (current) => ({
                  ...current,
                  options: {
                    choices: (current.options?.choices ?? []).map(
                      (currentChoice, choiceIndex) =>
                        choiceIndex === index
                          ? { ...currentChoice, label: event.target.value }
                          : currentChoice,
                    ),
                  },
                }))
              }
              disabled={isSubmitting}
            />
            <Input
              placeholder="value"
              value={choice.value}
              onChange={(event) =>
                updateField(node._id, (current) => ({
                  ...current,
                  options: {
                    choices: (current.options?.choices ?? []).map(
                      (currentChoice, choiceIndex) =>
                        choiceIndex === index
                          ? { ...currentChoice, value: event.target.value }
                          : currentChoice,
                    ),
                  },
                }))
              }
              disabled={isSubmitting}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() =>
                updateField(node._id, (current) => ({
                  ...current,
                  options: {
                    choices: (current.options?.choices ?? []).filter(
                      (_, choiceIndex) => choiceIndex !== index,
                    ),
                  },
                }))
              }
              disabled={isSubmitting}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    );
  };

  const renderFieldEditor = (
    node: SchemaFieldEditorNode,
    options: {
      named: boolean;
      level: number;
      siblingCount: number;
      siblingIndex: number;
      hasDuplicateName: boolean;
    },
  ): React.ReactNode => {
    const isObject = node.type === "object";
    const isArray = node.type === "array";
    const isFragment = node.type === "fragment";
    const duplicateAllowed = options.named;
    const removeAllowed = options.named;
    const moveAllowed = options.named && options.siblingCount > 1;
    const label = options.named
      ? node.name?.trim() || "Untitled Field"
      : getFieldTypeLabel(node.type);

    return (
      <Card
        key={node._id}
        className={options.level > 0 ? "border-dashed bg-muted/10" : undefined}
      >
        <CardContent className="space-y-4 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">
                {getFieldTypeLabel(node.type)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {moveAllowed && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => moveField(node._id, -1)}
                    disabled={isSubmitting || options.siblingIndex === 0}
                  >
                    Up
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => moveField(node._id, 1)}
                    disabled={
                      isSubmitting ||
                      options.siblingIndex === options.siblingCount - 1
                    }
                  >
                    Down
                  </Button>
                </>
              )}
              {duplicateAllowed && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => duplicateField(node._id)}
                  disabled={isSubmitting}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              )}
              {removeAllowed && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeField(node._id)}
                  disabled={isSubmitting}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {options.named && (
              <div className="space-y-1">
                <Label className="text-xs">Field Name</Label>
                <Input
                  placeholder="title"
                  value={node.name ?? ""}
                  onChange={(event) =>
                    updateField(node._id, (current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  disabled={isSubmitting}
                  className={
                    options.hasDuplicateName ? "ring-2 ring-destructive" : ""
                  }
                />
                {options.hasDuplicateName && (
                  <p className="text-xs text-destructive">
                    Duplicate field name
                  </p>
                )}
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">
                {options.named ? "Type" : "Item Type"}
              </Label>
              <Select
                value={node.type}
                onValueChange={(value) =>
                  updateField(node._id, (current) =>
                    normalizeTypeChange(
                      current,
                      value as FieldType,
                      allocateId,
                    ),
                  )
                }
              >
                <SelectTrigger className="w-full" disabled={isSubmitting}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {FIELD_TYPE_OPTIONS.map((fieldType) => (
                      <SelectItem key={fieldType.value} value={fieldType.value}>
                        {fieldType.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Label (optional)</Label>
              <Input
                placeholder="Friendly label"
                value={node.label ?? ""}
                onChange={(event) =>
                  updateField(node._id, (current) => ({
                    ...current,
                    label: event.target.value,
                  }))
                }
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description (optional)</Label>
              <Input
                placeholder="Help text"
                value={node.description ?? ""}
                onChange={(event) =>
                  updateField(node._id, (current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                disabled={isSubmitting}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={node.required}
              onChange={(event) =>
                updateField(node._id, (current) => ({
                  ...current,
                  required: event.target.checked,
                }))
              }
              disabled={isSubmitting}
            />
            Required
          </label>

          {isFragment && (
            <div className="space-y-1">
              <Label className="text-xs">Fragment</Label>
              {fragmentOptions.length > 0 ? (
                <Select
                  value={node.fragment || "__unset__"}
                  onValueChange={(value) =>
                    updateField(node._id, (current) => ({
                      ...current,
                      fragment:
                        value == null || value === "__unset__" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger className="w-full" disabled={isSubmitting}>
                    <SelectValue placeholder="Select a fragment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__unset__">Select a fragment</SelectItem>
                    {fragmentOptions.map((fragment) => (
                      <SelectItem key={fragment.slug} value={fragment.slug}>
                        {fragment.name} ({fragment.slug})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <>
                  <Input
                    placeholder="fragment-slug"
                    value={node.fragment ?? ""}
                    onChange={(event) =>
                      updateField(node._id, (current) => ({
                        ...current,
                        fragment: event.target.value,
                      }))
                    }
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Create a fragment schema first, then reference it here.
                  </p>
                </>
              )}
            </div>
          )}

          {renderChoiceEditor(node)}

          {isArray && (
            <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Min Items (optional)</Label>
                  <Input
                    type="number"
                    value={node.minItems ?? ""}
                    onChange={(event) =>
                      updateField(node._id, (current) => ({
                        ...current,
                        minItems: parseOptionalNumber(event.target.value),
                      }))
                    }
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Max Items (optional)</Label>
                  <Input
                    type="number"
                    value={node.maxItems ?? ""}
                    onChange={(event) =>
                      updateField(node._id, (current) => ({
                        ...current,
                        maxItems: parseOptionalNumber(event.target.value),
                      }))
                    }
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <details open className="rounded-lg border bg-background p-4">
                <summary className="cursor-pointer text-sm font-medium">
                  Item Schema
                </summary>
                <div className="mt-4 space-y-3">
                  <FieldAddControls
                    disabled={isSubmitting}
                    onAddType={(type) => replaceArrayItem(node._id, type)}
                    onAddPreset={() => replaceArrayItem(node._id, "object")}
                  />
                  {node.of &&
                    renderFieldEditor(node.of, {
                      named: false,
                      level: options.level + 1,
                      siblingCount: 1,
                      siblingIndex: 0,
                      hasDuplicateName: false,
                    })}
                </div>
              </details>
            </div>
          )}

          {isObject && (
            <details open className="rounded-lg border bg-muted/20 p-4">
              <summary className="cursor-pointer text-sm font-medium">
                Nested Fields ({node.fields?.length ?? 0})
              </summary>
              <div className="mt-4 space-y-3">
                <FieldAddControls
                  disabled={isSubmitting}
                  onAddType={(type) => appendChildField(node._id, type)}
                  onAddPreset={(preset) => appendChildPreset(node._id, preset)}
                />
                {(node.fields ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Add at least one child field.
                  </p>
                ) : (
                  (() => {
                    const duplicateIds = getDuplicateNodeIds(node.fields ?? []);
                    return (node.fields ?? []).map((child, index, siblings) =>
                      renderFieldEditor(child, {
                        named: true,
                        level: options.level + 1,
                        siblingCount: siblings.length,
                        siblingIndex: index,
                        hasDuplicateName: duplicateIds.has(child._id),
                      }),
                    );
                  })()
                )}
              </div>
            </details>
          )}
        </CardContent>
      </Card>
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!name.trim() || !slug.trim()) {
      return;
    }

    if (slugUnavailable) {
      return;
    }

    const validationError = validateNamedFields(fields, "schema");
    if (validationError) {
      setError(validationError);
      return;
    }

    const nextData = buildFormData();
    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(nextData);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Something went wrong",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Schema Definition</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ct-kind">Schema Type</Label>
              <Select
                value={kind}
                onValueChange={(value) => setKind(value as SchemaKind)}
              >
                <SelectTrigger id="ct-kind" disabled={isSubmitting}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KIND_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Templates create content entries. Fragments are reusable schema
                building blocks.
              </p>
            </div>

            {kind === "template" && (
              <div className="space-y-2">
                <Label htmlFor="ct-mode">Template Mode</Label>
                <Select
                  value={mode}
                  onValueChange={(value) => setMode(value as TemplateMode)}
                >
                  <SelectTrigger id="ct-mode" disabled={isSubmitting}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Singleton templates behave like site configuration.
                  Collections create many entries.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="ct-name">Name</Label>
              <Input
                id="ct-name"
                placeholder="Blog Post"
                value={name}
                onChange={(event) => handleNameChange(event.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ct-slug">Slug</Label>
              <Input
                id="ct-slug"
                placeholder="blog-post"
                value={slug}
                onChange={(event) => {
                  setSlug(event.target.value);
                  setSlugEdited(true);
                }}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                Used in schema imports, exports, and entry routes.
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
                        {slugAvailability.suggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            className="text-xs text-primary underline hover:no-underline"
                            onClick={() => {
                              setSlug(suggestion);
                              setSlugEdited(true);
                            }}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>

            {kind === "template" && (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="ct-route">Route (optional)</Label>
                <Input
                  id="ct-route"
                  placeholder="/about or /products/[slug]"
                  value={route}
                  onChange={(event) => setRoute(event.target.value)}
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  Route-bound templates clarify where this template renders in
                  the site.
                </p>
              </div>
            )}

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="ct-desc">Description (optional)</Label>
              <Textarea
                id="ct-desc"
                placeholder="What this schema controls and how editors should use it"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                disabled={isSubmitting}
                rows={2}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fields</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldAddControls
            disabled={isSubmitting}
            onAddType={appendTopLevelField}
            onAddPreset={appendTopLevelPreset}
          />

          {fields.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Add at least one field to your schema.
            </p>
          ) : (
            fields.map((field, index, siblings) =>
              renderFieldEditor(field, {
                named: true,
                level: 0,
                siblingCount: siblings.length,
                siblingIndex: index,
                hasDuplicateName: rootDuplicateIds.has(field._id),
              }),
            )
          )}
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!hideSubmit && (
        <Button
          type="submit"
          disabled={
            isSubmitting ||
            !name.trim() ||
            !slug.trim() ||
            topLevelInvalid ||
            !!slugUnavailable
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
