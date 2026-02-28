import { Input } from "@/components/ui/input";

interface DatetimeFieldProps {
  value: string;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

export function DatetimeField({
  value,
  onChange,
  disabled,
}: DatetimeFieldProps) {
  return (
    <Input
      type="datetime-local"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    />
  );
}
