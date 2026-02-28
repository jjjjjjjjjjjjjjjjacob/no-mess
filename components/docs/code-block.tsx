import { codeToHtml } from "shiki";
import { CodeBlockCopy } from "./code-block-copy";

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
}

export async function CodeBlock({
  code,
  language = "typescript",
  filename,
}: CodeBlockProps) {
  const html = await codeToHtml(code.trim(), {
    lang: language,
    themes: {
      light: "github-light",
      dark: "github-dark",
    },
  });

  return (
    <div className="group/code relative">
      {filename && (
        <div className="rounded-t-lg border border-b-0 bg-muted/50 px-4 py-2 font-mono text-xs text-muted-foreground">
          {filename}
        </div>
      )}
      <div
        className={`overflow-x-auto rounded-lg border bg-muted/30 text-sm [&_pre]:p-4 [&_code]:font-mono ${filename ? "rounded-t-none" : ""}`}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: shiki output is safe static HTML
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <CodeBlockCopy code={code.trim()} />
    </div>
  );
}
