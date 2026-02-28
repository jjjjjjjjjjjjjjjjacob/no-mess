"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface BooleanFieldProps {
  value: boolean;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

export function BooleanField({ value, onChange, disabled }: BooleanFieldProps) {
  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={value}
        onCheckedChange={(checked) => onChange(checked)}
        disabled={disabled}
      />
      <Label className="text-sm text-muted-foreground">
        {value ? "Yes" : "No"}
      </Label>
    </div>
  );
}
