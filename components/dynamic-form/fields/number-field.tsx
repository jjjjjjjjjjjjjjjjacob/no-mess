import { Input } from "@/components/ui/input";

interface NumberFieldProps {
  value: number;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

export function NumberField({ value, onChange, disabled }: NumberFieldProps) {
  return (
    <Input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      disabled={disabled}
    />
  );
}
