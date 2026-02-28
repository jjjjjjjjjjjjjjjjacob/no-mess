import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DocsCalloutProps {
  type?: "info" | "warning" | "tip";
  title?: string;
  children: ReactNode;
}

const styles = {
  info: "border-l-primary bg-primary/5 dark:bg-primary/10",
  warning: "border-l-accent bg-accent/5 dark:bg-accent/10",
  tip: "border-l-muted-foreground bg-muted",
};

const labels = {
  info: "Info",
  warning: "Warning",
  tip: "Tip",
};

export function DocsCallout({
  type = "info",
  title,
  children,
}: DocsCalloutProps) {
  return (
    <div className={cn("my-6 border-l-4 p-4 text-sm", styles[type])}>
      {title ? (
        <p className="mb-1 font-semibold">{title}</p>
      ) : (
        <p className="mb-1 font-semibold">{labels[type]}</p>
      )}
      <div className="text-muted-foreground">{children}</div>
    </div>
  );
}
