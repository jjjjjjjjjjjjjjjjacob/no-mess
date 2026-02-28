"use client";

import { useMutation } from "convex/react";
import { Upload } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface UploadDropzoneProps {
  siteId: Id<"sites">;
  onUploadComplete?: (assetId: Id<"assets">) => void;
}

export function UploadDropzone({
  siteId,
  onUploadComplete,
}: UploadDropzoneProps) {
  const generateUploadUrl = useMutation(api.assets.generateUploadUrl);
  const createAsset = useMutation(api.assets.create);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      // Step 1: Get upload URL
      const uploadUrl = await generateUploadUrl();

      // Step 2: Upload file
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();

      // Get image dimensions if applicable
      let width: number | undefined;
      let height: number | undefined;
      if (file.type.startsWith("image/")) {
        const dimensions = await getImageDimensions(file);
        width = dimensions.width;
        height = dimensions.height;
      }

      // Step 3: Create asset record (URL is derived server-side from storageId)
      const assetId = await createAsset({
        siteId,
        storageId,
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        width,
        height,
      });

      return assetId;
    },
    [generateUploadUrl, createAsset, siteId],
  );

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;

      setIsUploading(true);
      setUploadCount(fileArray.length);

      let failedCount = 0;
      for (const file of fileArray) {
        try {
          const assetId = await uploadFile(file);
          if (onUploadComplete) {
            onUploadComplete(assetId as Id<"assets">);
          }
        } catch {
          failedCount += 1;
        }
      }

      setIsUploading(false);
      setUploadCount(0);

      const successCount = fileArray.length - failedCount;
      if (failedCount > 0 && successCount > 0) {
        toast.error(
          `${failedCount} of ${fileArray.length} file${fileArray.length > 1 ? "s" : ""} failed to upload`,
        );
      } else if (failedCount > 0) {
        toast.error("Upload failed. Please try again.");
      } else if (successCount > 1) {
        toast.success(`${successCount} files uploaded`);
      } else {
        toast.success("File uploaded");
      }
    },
    [uploadFile, onUploadComplete],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors cursor-pointer",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-muted-foreground/50",
        isUploading && "pointer-events-none opacity-60",
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter") inputRef.current?.click();
      }}
      role="button"
      tabIndex={0}
    >
      <Upload className="h-8 w-8 text-muted-foreground" />
      <p className="mt-2 text-sm font-medium">
        {isUploading
          ? `Uploading ${uploadCount} file${uploadCount > 1 ? "s" : ""}...`
          : "Drop files here or click to upload"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Images, documents, and other files up to 20MB
      </p>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />
    </div>
  );
}

function getImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  });
}
