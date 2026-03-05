"use client";

import { Upload04Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { type DragEvent, useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface SchemaImportDropzoneProps {
  onFileContent: (text: string, filename: string) => void;
  className?: string;
  children?: React.ReactNode;
}

export function SchemaImportDropzone({
  onFileContent,
  className,
  children,
}: SchemaImportDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith(".ts") && !file.name.endsWith(".tsx")) {
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          onFileContent(reader.result, file.name);
        }
      };
      reader.readAsText(file);
    },
    [onFileContent],
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset input so the same file can be selected again
      if (inputRef.current) inputRef.current.value = "";
    },
    [handleFile],
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative transition-colors",
        isDragOver && "ring-2 ring-primary ring-offset-2 rounded-lg",
        className,
      )}
    >
      {children ?? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors hover:border-primary/50 hover:bg-muted/50"
        >
          <HugeiconsIcon
            icon={Upload04Icon}
            className="size-8 text-muted-foreground"
            strokeWidth={1.5}
          />
          <p className="mt-2 text-sm font-medium">
            Drop a .ts file here or click to upload
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Accepts schema.ts files using the no-mess DSL
          </p>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".ts,.tsx"
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  );
}
