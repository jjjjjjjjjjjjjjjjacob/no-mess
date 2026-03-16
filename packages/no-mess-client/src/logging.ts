import type { NoMessLogEvent, NoMessLogger } from "./types.js";

const warnedKeys = new Set<string>();
let loggerFailureReported = false;

export function logEvent(logger: NoMessLogger | undefined, event: NoMessLogEvent) {
  if (!logger) return;

  try {
    logger(event);
  } catch (error) {
    if (loggerFailureReported) return;
    loggerFailureReported = true;
    console.error("[no-mess] Logger threw while handling an event.", error);
  }
}

export function shouldDefaultConsoleLog(event: NoMessLogEvent): boolean {
  switch (event.code) {
    case "missing_configuration":
    case "multiple_singleton_entries":
    case "secret_key_in_browser":
    case "preview_message_invalid":
      return event.level === "warn" || event.level === "error";
    case "crypto_unavailable":
    case "invalid_success_response":
    case "preview_postmessage_failed":
    case "live_edit_runtime_failed":
      return event.level === "error" || event.level === "warn";
    default:
      return false;
  }
}

function defaultConsoleLog(event: NoMessLogEvent) {
  if (!shouldDefaultConsoleLog(event)) return;

  const method =
    event.level === "warn"
      ? console.warn
      : event.level === "info"
        ? console.info
        : event.level === "debug"
          ? console.debug
          : console.error;

  if (Object.keys(event.context).length > 0) {
    method(`[no-mess] ${event.message}`, event.context);
    return;
  }

  method(`[no-mess] ${event.message}`);
}

export function createSdkLogger(configLogger?: NoMessLogger): NoMessLogger {
  return (event) => {
    defaultConsoleLog(event);
    logEvent(configLogger, event);
  };
}

export function warnOnce(
  logger: NoMessLogger,
  key: string,
  event: NoMessLogEvent,
) {
  if (warnedKeys.has(key)) return;
  warnedKeys.add(key);
  logger(event);
}
