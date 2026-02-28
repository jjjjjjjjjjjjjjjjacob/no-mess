import { Label } from "@/components/ui/label";

interface FieldWrapperProps {
  label: string;
  description?: string;
  required?: boolean;
  children: React.ReactNode;
}

export function FieldWrapper({
  label,
  description,
  required,
  children,
}: FieldWrapperProps) {
  const id = `field-${label}`;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {children}
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
