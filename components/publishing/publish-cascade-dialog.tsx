"use client";

import { type MouseEvent, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

export type PublishCascadeTarget = {
  kind: "template" | "fragment";
  name: string;
  slug: string;
};

interface PublishCascadeDialogProps {
  isConfirming?: boolean;
  onConfirm: () => void | Promise<void>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  targets: PublishCascadeTarget[];
}

export function PublishCascadeDialog({
  isConfirming = false,
  onConfirm,
  onOpenChange,
  open,
  targets,
}: PublishCascadeDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const count = targets.length;
  const isBusy = isConfirming || isSubmitting;
  const confirmLabel =
    count === 1
      ? "Publish Schema and Continue"
      : `Publish ${count} Schemas and Continue`;

  const handleConfirmClick = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (isBusy) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm();
    } catch (error) {
      console.error("Failed to confirm cascade publish", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Publish downstream schemas first</AlertDialogTitle>
          <AlertDialogDescription>
            Publishing can continue after these unpublished downstream schemas
            are published.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          {targets.map((target) => (
            <div
              key={target.slug}
              className="flex items-center justify-between rounded-lg border px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{target.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {target.slug}
                </p>
              </div>
              <Badge variant="outline">
                {target.kind === "fragment" ? "Fragment" : "Template"}
              </Badge>
            </div>
          ))}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isBusy}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmClick} disabled={isBusy}>
            {isBusy ? "Publishing..." : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
