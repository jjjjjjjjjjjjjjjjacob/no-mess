import { Textarea } from "@/components/ui/textarea";

interface TextareaFieldProps {
  value: string;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

export function TextareaField({
  value,
  onChange,
  disabled,
}: TextareaFieldProps) {
  return (
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      rows={4}
    />
  );
}
