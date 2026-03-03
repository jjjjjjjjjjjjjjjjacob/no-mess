"use client";

import { useCallback, useRef, useState } from "react";

type LogEntry = { time: string; msg: string };

const TEST_LABELS = [
  "0: RAW (default crossfade)",
  "1: Crossfade (slow 800ms)",
  "2: Split vertical (static 3s)",
  "3: Split horizontal (static 3s)",
  "4: Wipe right",
  "5: Wipe down",
  "6: Circle expand",
] as const;

const TEST_CLASSES: Record<number, string | null> = {
  0: null,
  1: "vt-test-crossfade",
  2: "vt-test-split-v",
  3: "vt-test-split-h",
  4: "vt-test-wipe-r",
  5: "vt-test-wipe-d",
  6: "vt-test-circle",
};

function ts(): string {
  return new Date().toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  });
}

export function VtDebugPanel() {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [running, setRunning] = useState<number | null>(null);
  const logRef = useRef<HTMLPreElement>(null);

  const log = useCallback((msg: string) => {
    const entry = { time: ts(), msg };
    console.log(`[VT Debug] ${msg}`);
    setLogs((prev) => [...prev, entry]);
    requestAnimationFrame(() => {
      if (logRef.current) {
        logRef.current.scrollTop = logRef.current.scrollHeight;
      }
    });
  }, []);

  const getDiagnostics = useCallback(() => {
    const html = document.documentElement;
    const hasApi = "startViewTransition" in document;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const isDark = html.classList.contains("dark");
    const paletteClass =
      Array.from(html.classList).find((c) => c.startsWith("palette-")) ??
      "(default oceanic)";
    return { hasApi, reducedMotion, isDark, paletteClass };
  }, []);

  const runTest = useCallback(
    (testId: number) => {
      if (running !== null) {
        log(`Test ${running} still running, skipping`);
        return;
      }

      const html = document.documentElement;
      const testClass = TEST_CLASSES[testId];

      console.group(`[VT Debug] Test ${testId}`);
      log(`--- Test ${testId}: ${TEST_LABELS[testId]} ---`);

      // Diagnostics
      const diag = getDiagnostics();
      log(`API available: ${diag.hasApi}`);
      log(`prefers-reduced-motion: ${diag.reducedMotion}`);
      log(`Dark mode: ${diag.isDark}`);
      log(`Palette: ${diag.paletteClass}`);

      if (!diag.hasApi) {
        log("FATAL: document.startViewTransition is not available");
        console.groupEnd();
        return;
      }

      setRunning(testId);

      // Add test class
      if (testClass) {
        html.classList.add(testClass);
        log(`Added class: ${testClass}`);
      } else {
        log("No test class (raw UA crossfade)");
      }

      // Determine target state (toggle dark)
      const willBeDark = !html.classList.contains("dark");
      log(`Will toggle to: ${willBeDark ? "dark" : "light"}`);

      // Call startViewTransition directly
      log("Calling document.startViewTransition()...");
      const transition = document.startViewTransition(() => {
        log("Inside VT callback — mutating DOM");
        if (willBeDark) {
          html.classList.add("dark");
          html.style.colorScheme = "dark";
        } else {
          html.classList.remove("dark");
          html.style.colorScheme = "light";
        }
        log("DOM mutation complete");
      });

      // VT lifecycle: updateCallbackDone
      transition.updateCallbackDone
        .then(() => {
          log("updateCallbackDone resolved (old snapshot captured)");
        })
        .catch((err: unknown) => {
          log(
            `updateCallbackDone REJECTED: ${err instanceof Error ? err.message : String(err)}`,
          );
        });

      // VT lifecycle: ready
      transition.ready
        .then(() => {
          log("ready resolved (pseudo-elements created, animation starting)");

          // Inspect computed styles on the new pseudo
          try {
            const newRoot = document.querySelector(
              "::view-transition-new(root)",
            );
            if (newRoot) {
              const styles = getComputedStyle(newRoot);
              log(
                `  ::view-transition-new(root) animation-name: ${styles.animationName}`,
              );
              log(
                `  ::view-transition-new(root) animation-duration: ${styles.animationDuration}`,
              );
              log(
                `  ::view-transition-new(root) clip-path: ${styles.clipPath}`,
              );
            } else {
              log(
                "  Could not querySelector ::view-transition-new(root) (expected — pseudos are not queryable)",
              );
            }
          } catch {
            log(
              "  getComputedStyle on pseudo threw (expected in most browsers)",
            );
          }
        })
        .catch((err: unknown) => {
          log(
            `ready REJECTED: ${err instanceof Error ? err.message : String(err)}`,
          );
        });

      // VT lifecycle: finished
      transition.finished
        .then(() => {
          log("finished resolved (transition complete)");
        })
        .catch((err: unknown) => {
          log(
            `finished REJECTED: ${err instanceof Error ? err.message : String(err)}`,
          );
        })
        .finally(() => {
          // Clean up test class
          if (testClass) {
            html.classList.remove(testClass);
            log(`Removed class: ${testClass}`);
          }

          // Sync next-themes by dispatching a storage event
          // This is a lightweight sync — next-themes reads from localStorage
          const newTheme = html.classList.contains("dark") ? "dark" : "light";
          try {
            localStorage.setItem("theme", newTheme);
            window.dispatchEvent(
              new StorageEvent("storage", {
                key: "theme",
                newValue: newTheme,
              }),
            );
            log(`Synced next-themes localStorage to: ${newTheme}`);
          } catch {
            log("Could not sync next-themes (localStorage unavailable)");
          }

          setRunning(null);
          console.groupEnd();
          log(`--- Test ${testId} complete ---\n`);
        });
    },
    [running, log, getDiagnostics],
  );

  const clearLogs = useCallback(() => setLogs([]), []);

  // Diagnostics for display
  const diag = typeof document !== "undefined" ? getDiagnostics() : null;

  return (
    <div className="vt-debug-panel fixed bottom-4 right-4 z-[9999] font-mono">
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded bg-black px-2 py-1 text-xs font-bold text-green-400 border border-green-400 hover:bg-green-400 hover:text-black"
        style={{ transition: "none" }}
      >
        [VT]
      </button>

      {/* Panel */}
      {open && (
        <div
          className="absolute bottom-10 right-0 w-[420px] max-h-[80vh] bg-black/95 border border-green-400 text-green-400 text-[11px] leading-tight overflow-hidden flex flex-col"
          style={{ transition: "none" }}
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-green-400/30 flex justify-between items-center">
            <span className="font-bold text-xs">VT Debug Panel</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-green-400 hover:text-white"
              style={{ transition: "none" }}
            >
              [X]
            </button>
          </div>

          {/* Diagnostics */}
          <div className="px-3 py-2 border-b border-green-400/30 space-y-0.5">
            <div className="font-bold text-[10px] text-green-300 uppercase tracking-wider mb-1">
              Diagnostics
            </div>
            <div>
              startViewTransition:{" "}
              <span
                className={
                  diag?.hasApi ? "text-green-300" : "text-red-400 font-bold"
                }
              >
                {diag?.hasApi ? "available" : "NOT AVAILABLE"}
              </span>
            </div>
            <div>
              prefers-reduced-motion:{" "}
              <span className={diag?.reducedMotion ? "text-yellow-400" : ""}>
                {diag?.reducedMotion ? "reduce" : "no-preference"}
              </span>
            </div>
            <div>
              Dark mode:{" "}
              <span>{diag?.isDark ? "ON (.dark)" : "OFF (light)"}</span>
            </div>
            <div>
              Palette: <span>{diag?.paletteClass}</span>
            </div>
          </div>

          {/* Test buttons */}
          <div className="px-3 py-2 border-b border-green-400/30">
            <div className="font-bold text-[10px] text-green-300 uppercase tracking-wider mb-1">
              Tests (each toggles dark/light)
            </div>
            <div className="grid grid-cols-2 gap-1">
              {TEST_LABELS.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => runTest(i)}
                  disabled={running !== null}
                  className={`text-left px-2 py-1 border text-[10px] ${
                    running === i
                      ? "border-yellow-400 text-yellow-400 bg-yellow-400/10"
                      : "border-green-400/40 hover:border-green-400 hover:bg-green-400/10"
                  } ${running !== null && running !== i ? "opacity-40" : ""}`}
                  style={{ transition: "none" }}
                >
                  {running === i ? `Running T${i}...` : label}
                </button>
              ))}
            </div>
          </div>

          {/* Log output */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="px-3 py-1 flex justify-between items-center border-b border-green-400/30">
              <span className="font-bold text-[10px] text-green-300 uppercase tracking-wider">
                Log ({logs.length})
              </span>
              <button
                type="button"
                onClick={clearLogs}
                className="text-[10px] text-green-400/60 hover:text-green-400"
                style={{ transition: "none" }}
              >
                [clear]
              </button>
            </div>
            <pre
              ref={logRef}
              className="flex-1 overflow-y-auto px-3 py-2 text-[10px] leading-relaxed whitespace-pre-wrap min-h-[120px] max-h-[300px]"
            >
              {logs.length === 0 ? (
                <span className="text-green-400/40">
                  Click a test to begin...
                </span>
              ) : (
                logs.map((entry, i) => (
                  <div key={`${entry.time}-${i}`}>
                    <span className="text-green-400/50">{entry.time}</span>{" "}
                    {entry.msg}
                  </div>
                ))
              )}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
