import type { ReactNode } from "react";

interface DocsStepProps {
  number: number;
  title: string;
  children: ReactNode;
}

export function DocsStep({ number, title, children }: DocsStepProps) {
  return (
    <div className="my-6 flex gap-4">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
        {number}
      </div>
      <div className="flex-1 pt-0.5">
        <h3 className="font-semibold">{title}</h3>
        <div className="mt-2 text-sm text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}
