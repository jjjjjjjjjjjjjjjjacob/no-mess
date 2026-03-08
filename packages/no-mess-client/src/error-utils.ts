import {
  NoMessError,
  type NoMessErrorCode,
  type NoMessErrorKind,
  type NoMessErrorOptions,
} from "./types.js";

interface ErrorMetadata extends NoMessErrorOptions {
  kind: NoMessErrorKind;
  code: NoMessErrorCode;
}

export function safeParseJsonText(text: string):
  | { ok: true; value: unknown }
  | { ok: false; error: Error } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

export function extractRequestId(response: Response): string | undefined {
  try {
    return (
      response.headers.get("x-request-id") ??
      response.headers.get("cf-ray") ??
      response.headers.get("traceparent") ??
      undefined
    );
  } catch {
    return undefined;
  }
}

export function normalizeNoMessError(
  input: unknown,
  metadata: ErrorMetadata,
): NoMessError {
  if (input instanceof NoMessError) {
    return input;
  }

  if (input instanceof Error) {
    return new NoMessError(input.message, {
      ...metadata,
      retryable: metadata.retryable ?? false,
      details: { ...metadata.details, originalName: input.name },
      cause: input,
    });
  }

  return new NoMessError(
    typeof input === "string" ? input : "Unexpected error",
    {
      ...metadata,
      retryable: metadata.retryable ?? false,
      details: { ...metadata.details, originalValue: input },
      cause: input,
    },
  );
}

export function createNoMessHttpError(
  message: string,
  metadata: ErrorMetadata,
): NoMessError {
  return new NoMessError(message, {
    ...metadata,
    retryable:
      metadata.retryable ?? (typeof metadata.status === "number" && metadata.status >= 500),
  });
}

export function createNoMessResponseError(
  message: string,
  metadata: ErrorMetadata,
): NoMessError {
  return new NoMessError(message, {
    ...metadata,
    retryable: metadata.retryable ?? false,
  });
}

export function createNoMessProtocolError(
  message: string,
  metadata: ErrorMetadata,
): NoMessError {
  return new NoMessError(message, {
    ...metadata,
    retryable: metadata.retryable ?? false,
  });
}

export function createNoMessCryptoError(
  message: string,
  metadata: ErrorMetadata,
): NoMessError {
  return new NoMessError(message, {
    ...metadata,
    retryable: metadata.retryable ?? false,
  });
}
