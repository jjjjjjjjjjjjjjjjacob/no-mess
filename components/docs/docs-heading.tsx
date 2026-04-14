import type { ReactNode } from "react";
import { slugify } from "@/lib/slugify";
import { cn } from "@/lib/utils";

interface DocsHeadingProps {
  as?: "h2" | "h3";
  children: ReactNode;
  className?: string;
}

export function DocsHeading({
  as: Tag = "h2",
  children,
  className,
}: DocsHeadingProps) {
  const id = typeof children === "string" ? slugify(children) : undefined;

  return (
    <Tag
      id={id}
      className={cn(
        "scroll-mt-20",
        Tag === "h2"
          ? "mt-10 text-2xl font-bold tracking-tight first:mt-0"
          : "mt-8 text-xl font-semibold tracking-tight",
        className,
      )}
    >
      {id ? (
        <a href={`#${id}`} className="group">
          {children}
          <span className="ml-2 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
            #
          </span>
        </a>
      ) : (
        children
      )}
    </Tag>
  );
}
