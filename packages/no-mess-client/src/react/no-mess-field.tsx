import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

type NoMessFieldProps<T extends ElementType = "div"> = {
  name: string;
  as?: T;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "name" | "as" | "children">;

/** Mark rendered content as editable for the live-edit overlay runtime. */
export function NoMessField<T extends ElementType = "div">({
  name,
  as,
  children,
  ...rest
}: NoMessFieldProps<T>) {
  const Component = as ?? "div";
  return (
    <Component data-no-mess-field={name} {...rest}>
      {children}
    </Component>
  );
}
