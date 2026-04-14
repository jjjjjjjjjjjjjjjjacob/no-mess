"use client";

import type {
  ContentTypeDefinition,
  ParseResult,
} from "@no-mess/client/schema";
import { parseSchemaSource } from "@no-mess/client/schema";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAnalytics } from "@/hooks/use-analytics";
import { computeSchemaDiff, type SchemaDiff } from "@/lib/schema-diff";
import { SchemaImportDropzone } from "./schema-import-dropzone";
import { SchemaImportPreview } from "./schema-import-preview";

type Step = "input" | "preview";

interface SchemaImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteId: Id<"sites">;
}

export function SchemaImportDialog({
  open,
  onOpenChange,
  siteId,
}: SchemaImportDialogProps) {
  const [step, setStep] = useState<Step>("input");
  const [codeText, setCodeText] = useState("");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [diff, setDiff] = useState<SchemaDiff | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const analytics = useAnalytics();
  const contentTypes = useQuery(api.contentTypes.listBySite, { siteId });
  const createDraft = useMutation(api.contentTypes.createDraft);
  const saveDraft = useMutation(api.contentTypes.saveDraft);

  const handleParse = useCallback(
    (source: string) => {
      const result = parseSchemaSource(source);
      setParseResult(result);

      analytics.trackSchemaImported({
        step: "parsed",
        schemas_found: result.contentTypes.length,
        errors_count: result.errors.length,
        warnings_count: result.warnings.length,
      });

      if (result.contentTypes.length > 0 && contentTypes) {
        const existingDefs: ContentTypeDefinition[] = contentTypes.map((ct) =>
          ct.kind === "fragment"
            ? {
                kind: "fragment",
                slug: ct.slug,
                name: ct.name,
                description: ct.description,
                fields: ct.fields,
              }
            : {
                kind: "template",
                slug: ct.slug,
                name: ct.name,
                mode: ct.mode === "singleton" ? "singleton" : "collection",
                route: ct.route,
                description: ct.description,
                fields: ct.fields,
              },
        );
        const schemaDiff = computeSchemaDiff(existingDefs, result.contentTypes);
        setDiff(schemaDiff);
        setStep("preview");
      }
    },
    [contentTypes, analytics],
  );

  const handleFileContent = useCallback(
    (text: string) => {
      setCodeText(text);
      handleParse(text);
    },
    [handleParse],
  );

  const handleParseClick = useCallback(() => {
    if (codeText.trim()) {
      handleParse(codeText);
    }
  }, [codeText, handleParse]);

  const resetState = useCallback(() => {
    setStep("input");
    setCodeText("");
    setParseResult(null);
    setDiff(null);
  }, []);

  const handleImport = useCallback(async () => {
    if (!parseResult || !contentTypes) return;
    setIsImporting(true);

    try {
      const existingMap = new Map(contentTypes.map((ct) => [ct.slug, ct]));

      for (const ct of parseResult.contentTypes) {
        const existing = existingMap.get(ct.slug);
        if (existing) {
          await saveDraft({
            contentTypeId: existing._id,
            name: ct.name,
            slug: ct.slug,
            kind: ct.kind,
            mode: ct.kind === "template" ? ct.mode : undefined,
            route: ct.kind === "template" ? ct.route : undefined,
            description: ct.description,
            fields: ct.fields,
          });
        } else {
          await createDraft({
            siteId,
            name: ct.name,
            slug: ct.slug,
            kind: ct.kind,
            mode: ct.kind === "template" ? ct.mode : undefined,
            route: ct.kind === "template" ? ct.route : undefined,
            description: ct.description,
            fields: ct.fields,
          });
        }
      }

      const schemasAdded = parseResult.contentTypes.filter(
        (ct) => !existingMap.has(ct.slug),
      ).length;
      const schemasModified = parseResult.contentTypes.length - schemasAdded;
      analytics.trackSchemaImported({
        step: "completed",
        schemas_added: schemasAdded,
        schemas_modified: schemasModified,
      });

      toast.success(
        `Imported ${parseResult.contentTypes.length} content type${parseResult.contentTypes.length !== 1 ? "s" : ""} as drafts`,
      );
      onOpenChange(false);
      resetState();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to import schemas",
      );
    } finally {
      setIsImporting(false);
    }
  }, [
    parseResult,
    contentTypes,
    saveDraft,
    createDraft,
    siteId,
    onOpenChange,
    resetState,
    analytics,
  ]);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) resetState();
      onOpenChange(newOpen);
    },
    [onOpenChange, resetState],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === "input" ? "Import from Code" : "Preview Changes"}
          </DialogTitle>
          <DialogDescription>
            {step === "input"
              ? "Paste schema code or upload a .ts file to import content types as drafts."
              : "Review the changes that will be made to your schemas."}
          </DialogDescription>
        </DialogHeader>

        {step === "input" && (
          <Tabs
            defaultValue="paste"
            onValueChange={(value) =>
              analytics.trackSchemaImported({
                step: "tab_switched",
                tab: value as "paste" | "upload",
              })
            }
          >
            <TabsList>
              <TabsTrigger value="paste">Paste Code</TabsTrigger>
              <TabsTrigger value="upload">Upload File</TabsTrigger>
            </TabsList>
            <TabsContent value="paste" className="space-y-3">
              <Textarea
                value={codeText}
                onChange={(e) => setCodeText(e.target.value)}
                placeholder={`import { defineFragment, defineSchema, defineTemplate, field } from "@no-mess/client/schema";\n\nconst imageWithAlt = defineFragment("image-with-alt", {\n  name: "Image With Alt",\n  fields: {\n    image: field.image({ required: true }),\n    alt: field.text(),\n  },\n});\n\nconst homePage = defineTemplate("home-page", {\n  name: "Home Page",\n  mode: "singleton",\n  route: "/",\n  fields: {\n    hero: field.object({\n      fields: {\n        slides: field.array({ of: field.fragment(imageWithAlt) }),\n      },\n    }),\n  },\n});\n\nexport default defineSchema({ contentTypes: [imageWithAlt, homePage] });`}
                className="min-h-[200px] font-mono text-xs"
              />
              {parseResult && parseResult.errors.length > 0 && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
                  <p className="text-xs font-medium text-destructive">
                    Parse errors:
                  </p>
                  <ul className="mt-1 space-y-1">
                    {parseResult.errors.map((err, i) => (
                      <li
                        key={`err-${String(i)}`}
                        className="text-xs text-destructive"
                      >
                        Line {err.line}: {err.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <Button
                onClick={handleParseClick}
                disabled={!codeText.trim()}
                className="w-full"
              >
                Preview Changes
              </Button>
            </TabsContent>
            <TabsContent value="upload">
              <SchemaImportDropzone onFileContent={handleFileContent} />
            </TabsContent>
          </Tabs>
        )}

        {step === "preview" && diff && (
          <div className="max-h-[400px] overflow-y-auto">
            <SchemaImportPreview diff={diff} />
            {parseResult && parseResult.warnings.length > 0 && (
              <div className="mt-3 rounded-md border border-amber-300/50 bg-amber-50/50 p-3 dark:border-amber-700/50 dark:bg-amber-900/10">
                <ul className="space-y-1">
                  {parseResult.warnings.map((warn, i) => (
                    <li
                      key={`warn-${String(i)}`}
                      className="text-xs text-amber-700 dark:text-amber-400"
                    >
                      Line {warn.line}: {warn.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {step === "preview" && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setStep("input")}>
              Back
            </Button>
            <Button onClick={handleImport} disabled={isImporting}>
              {isImporting ? "Importing..." : "Import as Draft"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
