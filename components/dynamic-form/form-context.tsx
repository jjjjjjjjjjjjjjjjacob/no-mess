"use client";

import { createContext, useContext } from "react";
import type { Id } from "@/convex/_generated/dataModel";

interface FormContextValue {
  siteId: Id<"sites"> | null;
}

const FormContext = createContext<FormContextValue>({ siteId: null });

export function FormProvider({
  siteId,
  children,
}: {
  siteId: Id<"sites">;
  children: React.ReactNode;
}) {
  return <FormContext value={{ siteId }}>{children}</FormContext>;
}

export function useFormContext() {
  return useContext(FormContext);
}
