function normalizeForComparison(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeForComparison(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [
          key,
          normalizeForComparison(nestedValue),
        ]),
    );
  }

  return value;
}

export function hasPendingEntryDraft(
  entry:
    | {
        status: "draft" | "published";
        draft?: unknown;
        published?: unknown;
      }
    | null
    | undefined,
) {
  if (!entry) {
    return false;
  }

  if (entry.status === "draft") {
    return true;
  }

  if (entry.published === undefined) {
    return true;
  }

  if (entry.draft === undefined) {
    return false;
  }

  return (
    JSON.stringify(normalizeForComparison(entry.draft)) !==
    JSON.stringify(normalizeForComparison(entry.published))
  );
}
