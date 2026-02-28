"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SelectFieldProps {
  value: string;
  onChange: (value: unknown) => void;
  choices: { label: string; value: string }[];
  disabled?: boolean;
}

export function SelectField({
  value,
  onChange,
  choices,
  disabled,
}: SelectFieldProps) {
  return (
    <Select
      value={value || null}
      onValueChange={(val) => onChange(val)}
      items={choices}
    >
      <SelectTrigger className="w-full" disabled={disabled}>
        <SelectValue placeholder="Select..." />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {choices.map((choice) => (
            <SelectItem key={choice.value} value={choice.value}>
              {choice.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
