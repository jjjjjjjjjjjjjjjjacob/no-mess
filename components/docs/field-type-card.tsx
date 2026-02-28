import { Badge } from "@/components/ui/badge";

interface FieldTypeCardProps {
  name: string;
  type: string;
  description: string;
  storedValue: string;
  options?: string[];
}

export function FieldTypeCard({
  name,
  type,
  description,
  storedValue,
  options,
}: FieldTypeCardProps) {
  return (
    <div className="ring-foreground/10 rounded-lg p-4 ring-1">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold">{name}</h3>
        <Badge variant="secondary">{type}</Badge>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <div className="mt-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Stored as:</span>{" "}
        <code className="rounded bg-muted px-1 py-0.5 font-mono">
          {storedValue}
        </code>
      </div>
      {options && options.length > 0 && (
        <div className="mt-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Options:</span>{" "}
          {options.join(", ")}
        </div>
      )}
    </div>
  );
}
