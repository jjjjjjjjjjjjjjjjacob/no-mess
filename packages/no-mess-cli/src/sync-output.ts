const DRAFT_WARNING_LINES = [
  "Schemas were synced as drafts.",
  "Published delivery APIs only include published schemas and published entries.",
  "Publish the schema in the no-mess dashboard before querying /api/content/:type.",
] as const;

export function printDraftPublishWarning() {
  for (const line of DRAFT_WARNING_LINES) {
    console.warn(line);
  }
}

export function getDraftPublishWarningLines() {
  return [...DRAFT_WARNING_LINES];
}
