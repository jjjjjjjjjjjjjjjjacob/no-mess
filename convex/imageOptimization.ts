"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

// Dynamic import to avoid bundler issues with sharp's native bindings
async function getSharp() {
  const mod = await import("sharp");
  return mod.default;
}

// === Constants ===

const WEBP_QUALITY = 80;
const BACKFILL_STAGGER_MS = 2_000;
const FETCH_TIMEOUT_MS = 10_000;

// Responsive breakpoint widths — only generate variants smaller than the original
const VARIANT_WIDTHS = [320, 640, 1024, 1536, 2048];

// MIME types that should skip optimization
const SKIP_MIME_TYPES = new Set([
  "image/svg+xml",
  "image/gif", // GIFs may be animated — preserve as-is
]);

function formatOptimizationError(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }
  return String(error);
}

async function fetchAssetWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    return await fetch(url, { signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `Timed out fetching image after ${FETCH_TIMEOUT_MS}ms: ${url}`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// === Internal Actions ===

export const optimizeImage = internalAction({
  args: {
    assetId: v.id("assets"),
  },
  handler: async (ctx, args) => {
    const asset = await ctx.runQuery(internal.assets.getInternal, {
      assetId: args.assetId,
    });

    if (!asset) {
      return;
    }

    // Skip non-image or unsupported types
    if (
      !asset.mimeType.startsWith("image/") ||
      SKIP_MIME_TYPES.has(asset.mimeType)
    ) {
      await ctx.runMutation(
        internal.imageOptimizationHelpers.setOptimizationStatus,
        { assetId: args.assetId, status: "skipped" },
      );
      return;
    }

    // Mark as processing
    await ctx.runMutation(
      internal.imageOptimizationHelpers.setOptimizationStatus,
      { assetId: args.assetId, status: "processing" },
    );

    try {
      // Fetch the original image
      const response = await fetchAssetWithTimeout(asset.url);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch image: ${response.status} ${response.statusText}`,
        );
      }

      const originalBuffer = Buffer.from(await response.arrayBuffer());
      const sharpFn = await getSharp();

      // Get original dimensions for aspect ratio calculation
      const metadata = await sharpFn(originalBuffer).metadata();
      const originalWidth = metadata.width ?? asset.width ?? 0;
      const originalHeight = metadata.height ?? asset.height ?? 0;

      if (originalWidth === 0 || originalHeight === 0) {
        await ctx.runMutation(
          internal.imageOptimizationHelpers.setOptimizationStatus,
          { assetId: args.assetId, status: "skipped" },
        );
        return;
      }

      // Convert full-resolution to WebP
      const optimizedBuffer = await sharpFn(originalBuffer)
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();

      // Skip if WebP is larger than original (rare, but possible for small PNGs)
      if (optimizedBuffer.byteLength >= asset.size) {
        await ctx.runMutation(
          internal.imageOptimizationHelpers.setOptimizationStatus,
          { assetId: args.assetId, status: "skipped" },
        );
        return;
      }

      // Upload full-resolution optimized version
      const optimizedBlob = new Blob([new Uint8Array(optimizedBuffer)], {
        type: "image/webp",
      });
      const optimizedStorageId = await ctx.storage.store(optimizedBlob);

      const optimizedUrl = await ctx.storage.getUrl(optimizedStorageId);
      if (!optimizedUrl) {
        throw new Error("Failed to get URL for optimized image");
      }

      await ctx.runMutation(
        internal.imageOptimizationHelpers.saveOptimizedResult,
        {
          assetId: args.assetId,
          optimizedStorageId,
          optimizedUrl,
          optimizedSize: optimizedBuffer.byteLength,
          optimizedMimeType: "image/webp",
        },
      );

      // Generate responsive variants (only widths smaller than the original)
      const aspectRatio = originalHeight / originalWidth;

      for (const targetWidth of VARIANT_WIDTHS) {
        if (targetWidth >= originalWidth) {
          continue;
        }

        const targetHeight = Math.round(targetWidth * aspectRatio);

        const variantBuffer = await sharpFn(originalBuffer)
          .resize(targetWidth, targetHeight, { fit: "inside" })
          .webp({ quality: WEBP_QUALITY })
          .toBuffer();

        const variantBlob = new Blob([new Uint8Array(variantBuffer)], {
          type: "image/webp",
        });
        const variantStorageId = await ctx.storage.store(variantBlob);

        const variantUrl = await ctx.storage.getUrl(variantStorageId);
        if (!variantUrl) {
          continue;
        }

        await ctx.runMutation(internal.imageOptimizationHelpers.saveVariant, {
          assetId: args.assetId,
          storageId: variantStorageId,
          url: variantUrl,
          width: targetWidth,
          height: targetHeight,
          mimeType: "image/webp",
          size: variantBuffer.byteLength,
        });
      }
    } catch (error) {
      console.error("Image optimization failed", {
        assetId: args.assetId,
        assetUrl: asset.url,
        error,
      });
      await ctx.runMutation(
        internal.imageOptimizationHelpers.setOptimizationStatus,
        {
          assetId: args.assetId,
          status: "failed",
          error: formatOptimizationError(error),
        },
      );
    }
  },
});

export const backfillOptimization = internalAction({
  args: {},
  handler: async (ctx) => {
    const unoptimizedAssets = await ctx.runQuery(
      internal.imageOptimizationHelpers.listUnoptimized,
      {},
    );

    for (let i = 0; i < unoptimizedAssets.length; i++) {
      const delay = i * BACKFILL_STAGGER_MS;
      await ctx.scheduler.runAfter(
        delay,
        internal.imageOptimization.optimizeImage,
        { assetId: unoptimizedAssets[i]._id },
      );
    }
  },
});
