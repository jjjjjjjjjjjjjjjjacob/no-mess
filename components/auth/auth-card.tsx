import { cn } from "@/lib/utils";

export function AuthCard({
  title,
  children,
  footer,
  className,
}: {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      {/* Offset shadow */}
      <div className="absolute inset-0 translate-x-2 translate-y-2 bg-primary sm:translate-x-3 sm:translate-y-3" />

      {/* Card */}
      <div className="relative border-[5px] border-foreground bg-card">
        {/* Header */}
        <div className="border-b-[5px] border-foreground px-6 py-5 sm:px-8">
          <h1 className="font-display text-3xl sm:text-4xl">{title}</h1>
          <div className="mt-2 h-1.5 w-16 bg-primary" />
        </div>

        {/* Content */}
        <div className="px-6 py-6 sm:px-8">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="border-t-[3px] border-foreground px-6 py-4 sm:px-8">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
