import { Input } from "@/components/ui/input";

interface TextFieldProps {
  value: string;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

export function TextField({ value, onChange, disabled }: TextFieldProps) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    />
  );
}
