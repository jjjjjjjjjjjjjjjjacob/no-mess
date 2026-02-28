import type { ReactNode } from "react";

export default function Link({
  children,
  href,
  ...props
}: {
  children?: ReactNode;
  href: string;
  [key: string]: unknown;
}) {
  return (
    <a href={href} {...props}>
      {children}
    </a>
  );
}
