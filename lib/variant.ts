import { cookies } from "next/headers";

export type Variant = "a" | "b";
export const DEFAULT_VARIANT: Variant = "a";
const VARIANT_COOKIE_NAME = "no-mess-variant";

export async function getServerVariant(): Promise<Variant> {
  const cookieStore = await cookies();
  const variantCookie = cookieStore.get(VARIANT_COOKIE_NAME);

  if (variantCookie?.value === "a" || variantCookie?.value === "b") {
    return variantCookie.value;
  }

  return DEFAULT_VARIANT;
}
