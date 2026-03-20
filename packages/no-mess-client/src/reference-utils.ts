import type { ShopifyCollectionRef, ShopifyProductRef } from "./types.js";

function isShopifyHandleObject(value: unknown): value is { handle: string } {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as { handle?: unknown }).handle === "string" &&
    (value as { handle: string }).handle.trim().length > 0
  );
}

export function getShopifyHandle(
  ref: ShopifyProductRef | ShopifyCollectionRef | null | undefined | unknown,
): string | null {
  if (typeof ref === "string" && ref.trim().length > 0) {
    return ref.trim();
  }

  if (isShopifyHandleObject(ref)) {
    return ref.handle.trim();
  }

  return null;
}

export function isShopifyProductRef(
  value: unknown,
): value is ShopifyProductRef {
  return getShopifyHandle(value) !== null;
}

export function isShopifyCollectionRef(
  value: unknown,
): value is ShopifyCollectionRef {
  return getShopifyHandle(value) !== null;
}
