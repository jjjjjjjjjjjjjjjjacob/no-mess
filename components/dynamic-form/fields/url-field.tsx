import { Input } from "@/components/ui/input";

interface UrlFieldProps {
  value: string;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

export function UrlField({ value, onChange, disabled }: UrlFieldProps) {
  return (
    <Input
      type="url"
      placeholder="https://..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    />
  );
}
