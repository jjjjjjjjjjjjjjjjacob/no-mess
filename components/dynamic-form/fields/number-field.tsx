import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

interface NumberFieldProps {
  value?: number;
  onChange: (value: number | undefined) => void;
  disabled?: boolean;
}

export function NumberField({ value, onChange, disabled }: NumberFieldProps) {
  const [draftValue, setDraftValue] = useState(
    value == null ? "" : String(value),
  );
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setDraftValue(value == null ? "" : String(value));
    }
  }, [isFocused, value]);

  return (
    <Input
      type="number"
      inputMode="numeric"
      value={draftValue}
      onFocus={() => setIsFocused(true)}
      onBlur={() => {
        setIsFocused(false);
        setDraftValue(value == null ? "" : String(value));
      }}
      onChange={(event) => {
        const nextValue = event.target.value;
        setDraftValue(nextValue);

        if (!nextValue.trim()) {
          onChange(undefined);
          return;
        }

        if (!Number.isNaN(event.target.valueAsNumber)) {
          onChange(event.target.valueAsNumber);
        }
      }}
      disabled={disabled}
    />
  );
}
