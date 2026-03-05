"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SchemaDiff } from "@/lib/schema-diff";

interface SchemaImportPreviewProps {
  diff: SchemaDiff;
}

export function SchemaImportPreview({ diff }: SchemaImportPreviewProps) {
  const totalChanges = diff.added.length + diff.modified.length;

  if (totalChanges === 0 && diff.unchanged.length > 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No changes detected. All content types match existing schemas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {diff.added.map((ct) => (
        <Card key={ct.slug}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm">{ct.name}</CardTitle>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                New
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{ct.slug}</p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {ct.fields.map((f) => (
                <li
                  key={f.name}
                  className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400"
                >
                  <span className="font-mono">{f.name}</span>
                  <span className="text-muted-foreground">
                    {f.type}
                    {f.required ? " (required)" : ""}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}

      {diff.modified.map((mod) => (
        <Card key={mod.slug}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm">{mod.name}</CardTitle>
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                Modified
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{mod.slug}</p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {mod.fieldChanges.map((fc) => (
                <li
                  key={fc.fieldName}
                  className={`flex items-center gap-2 text-xs ${
                    fc.action === "added"
                      ? "text-green-700 dark:text-green-400"
                      : fc.action === "modified"
                        ? "text-amber-700 dark:text-amber-400"
                        : "text-muted-foreground"
                  }`}
                >
                  <span className="font-mono">{fc.fieldName}</span>
                  {fc.action === "added" && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1 py-0 border-green-300 dark:border-green-700"
                    >
                      added
                    </Badge>
                  )}
                  {fc.action === "modified" && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1 py-0 border-amber-300 dark:border-amber-700"
                    >
                      changed
                    </Badge>
                  )}
                  {fc.to && (
                    <span className="text-muted-foreground">
                      {fc.to.type}
                      {fc.to.required ? " (required)" : ""}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}

      {diff.unchanged.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {diff.unchanged.length} unchanged schema
          {diff.unchanged.length !== 1 ? "s" : ""}: {diff.unchanged.join(", ")}
        </p>
      )}
    </div>
  );
}
