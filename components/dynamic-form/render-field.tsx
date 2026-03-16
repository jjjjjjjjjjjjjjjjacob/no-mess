"use client";

import type {
  FieldDefinition,
  NamedFieldDefinition,
} from "@no-mess/client/schema";
import { BooleanField } from "./fields/boolean-field";
import { DatetimeField } from "./fields/datetime-field";
import { GalleryField } from "./fields/gallery-field";
import { ImageField } from "./fields/image-field";
import { NumberField } from "./fields/number-field";
import { SelectField } from "./fields/select-field";
import { ShopifyCollectionField } from "./fields/shopify-collection-field";
import { ShopifyProductField } from "./fields/shopify-product-field";
import { TextField } from "./fields/text-field";
import { TextareaField } from "./fields/textarea-field";
import { UrlField } from "./fields/url-field";

export type { FieldDefinition, NamedFieldDefinition };

export function renderField(
  field: FieldDefinition,
  value: unknown,
  onChange: (value: unknown) => void,
  disabled?: boolean,
) {
  switch (field.type) {
    case "text":
      return (
        <TextField
          value={(value as string) ?? ""}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case "textarea":
      return (
        <TextareaField
          value={(value as string) ?? ""}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case "number":
      return (
        <NumberField
          value={typeof value === "number" ? value : undefined}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case "boolean":
      return (
        <BooleanField
          value={(value as boolean) ?? false}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case "datetime":
      return (
        <DatetimeField
          value={(value as string) ?? ""}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case "url":
      return (
        <UrlField
          value={(value as string) ?? ""}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case "select":
      return (
        <SelectField
          value={(value as string) ?? ""}
          onChange={onChange}
          choices={field.options?.choices ?? []}
          disabled={disabled}
        />
      );
    case "image":
      return (
        <ImageField
          value={(value as string) ?? ""}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case "gallery":
      return (
        <GalleryField
          value={Array.isArray(value) ? (value as string[]) : []}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case "shopifyProduct":
      return (
        <ShopifyProductField
          value={(value as string) ?? ""}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case "shopifyCollection":
      return (
        <ShopifyCollectionField
          value={(value as string) ?? ""}
          onChange={onChange}
          disabled={disabled}
        />
      );
    default:
      return null;
  }
}
