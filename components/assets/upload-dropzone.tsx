"use client";

import { useConvex, useMutation } from "convex/react";
import { Upload } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

const checksumCache = new WeakMap<File, Promise<string | undefined>>();

interface UploadDropzoneProps {
  siteId: Id<"sites">;
  onUploadComplete?: (assetId: Id<"assets">) => void;
  accept?: string;
  multiple?: boolean;
  label?: string;
  description?: string;
}

export function UploadDropzone({
  siteId,
  onUploadComplete,
  accept,
  multiple = true,
  label,
  description,
}: UploadDropzoneProps) {
  const convex = useConvex();
  const generateUploadUrl = useMutation(api.assets.generateUploadUrl);
  const createAsset = useMutation(api.assets.create);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      const checksum = await getCachedFileChecksum(file);
      if (checksum) {
        const existingAsset = await convex.query(api.assets.findByChecksum, {
          siteId,
          checksum,
        });

        if (existingAsset) {
          return {
            assetId: existingAsset._id as Id<"assets">,
            reused: true,
          };
        }
      }

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
        checksum,
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        width,
        height,
      });

      return {
        assetId: assetId as Id<"assets">,
        reused: false,
      };
    },
    [convex, createAsset, generateUploadUrl, siteId],
  );

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;
      if (!multiple && fileArray.length > 1) {
        toast.error("Upload one file at a time here.");
        return;
      }

      const acceptedFiles = fileArray.filter((file) =>
        isFileAccepted(file, accept),
      );
      const skippedCount = fileArray.length - acceptedFiles.length;
      if (acceptedFiles.length === 0) {
        toast.error("That file type is not supported here.");
        return;
      }

      setIsUploading(true);
      setUploadCount(acceptedFiles.length);

      let failedCount = 0;
      let reusedCount = 0;
      for (const file of acceptedFiles) {
        try {
          const result = await uploadFile(file);
          if (result.reused) {
            reusedCount += 1;
          }
          if (onUploadComplete) {
            onUploadComplete(result.assetId);
          }
        } catch {
          failedCount += 1;
        }
      }

      setIsUploading(false);
      setUploadCount(0);

      const successCount = acceptedFiles.length - failedCount;
      if (failedCount > 0 && successCount > 0) {
        toast.error(
          `${failedCount} of ${acceptedFiles.length} file${acceptedFiles.length > 1 ? "s" : ""} failed to upload`,
        );
      } else if (failedCount > 0) {
        toast.error("Upload failed. Please try again.");
      } else if (reusedCount === successCount && successCount > 1) {
        toast.success(`${successCount} files already in your library`);
      } else if (reusedCount === successCount) {
        toast.success("File already in your library");
      } else if (successCount > 1 && reusedCount > 0) {
        const createdCount = successCount - reusedCount;
        toast.success(
          `${createdCount} file${createdCount > 1 ? "s" : ""} uploaded, ${reusedCount} already in your library`,
        );
      } else if (successCount > 1) {
        toast.success(`${successCount} files uploaded`);
      } else {
        toast.success("File uploaded");
      }

      if (skippedCount > 0) {
        toast.error(
          `${skippedCount} file${skippedCount > 1 ? "s were" : " was"} skipped because ${skippedCount > 1 ? "they are" : "it is"} not supported here.`,
        );
      }
    },
    [accept, multiple, onUploadComplete, uploadFile],
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
          : (label ?? "Drop files here or click to upload")}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {description ?? "Images, documents, and other files up to 20MB"}
      </p>
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />
    </div>
  );
}

async function getCachedFileChecksum(file: File) {
  if (!checksumCache.has(file)) {
    checksumCache.set(file, createFileChecksum(file));
  }

  return checksumCache.get(file);
}

async function createFileChecksum(file: File) {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    return undefined;
  }

  const digest = await crypto.subtle.digest(
    "SHA-256",
    await readFileBuffer(file),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function readFileBuffer(file: File) {
  if (typeof file.arrayBuffer === "function") {
    return await file.arrayBuffer();
  }

  return await new Response(file).arrayBuffer();
}

function isFileAccepted(file: File, accept?: string) {
  if (!accept) return true;

  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();

  return accept
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .some((rule) => {
      if (rule.endsWith("/*")) {
        return fileType.startsWith(rule.slice(0, -1));
      }

      if (rule.startsWith(".")) {
        return fileName.endsWith(rule);
      }

      return fileType === rule;
    });
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
