"use client";

import {
  CheckmarkCircle02Icon,
  Copy01Icon,
  Download04Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { useAnalytics } from "@/hooks/use-analytics";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

interface SchemaExportPanelProps {
  code: string;
  filename?: string;
}

export function SchemaExportPanel({
  code,
  filename = "schema.ts",
}: SchemaExportPanelProps) {
  const { copied, copy } = useCopyToClipboard();
  const analytics = useAnalytics();

  const handleDownload = () => {
    analytics.trackSchemaExported({
      export_type: "single",
      method: "download",
    });
    const blob = new Blob([code], { type: "text/typescript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-3 min-h-0 overflow-hidden">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            copy(code);
            analytics.trackSchemaExported({
              export_type: "single",
              method: "copy",
            });
          }}
        >
          <HugeiconsIcon
            icon={copied ? CheckmarkCircle02Icon : Copy01Icon}
            className="mr-2 size-3.5"
            strokeWidth={2}
          />
          {copied ? "Copied" : "Copy to Clipboard"}
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <HugeiconsIcon
            icon={Download04Icon}
            className="mr-2 size-3.5"
            strokeWidth={2}
          />
          Download {filename}
        </Button>
      </div>
      <div className="overflow-auto min-h-0 flex-1 rounded-lg border bg-muted/30">
        <pre className="p-4 text-xs font-mono leading-relaxed whitespace-pre">
          {code}
        </pre>
      </div>
    </div>
  );
}
