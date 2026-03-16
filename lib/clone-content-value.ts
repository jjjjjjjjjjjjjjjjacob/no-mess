export function cloneContentValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => cloneContentValue(item)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        cloneContentValue(item),
      ]),
    ) as T;
  }

  return value;
}
