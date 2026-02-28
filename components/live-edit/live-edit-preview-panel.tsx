"use client";

import { useMutation } from "convex/react";
import { Loader2, RefreshCw } from "lucide-react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type PreviewState =
  | "idle"
  | "creating_session"
  | "waiting_for_iframe"
  | "handshake_sent"
  | "active"
  | "error";

interface LiveEditPreviewPanelProps {
  entryId: Id<"contentEntries">;
  previewUrl?: string;
  onFieldMap?: (fields: { fieldName: string; rect?: DOMRect }[]) => void;
  onFieldClicked?: (fieldName: string) => void;
}

export interface LiveEditPreviewPanelHandle {
  sendFieldUpdate: (fieldName: string, value: unknown) => void;
  sendFieldFocus: (fieldName: string) => void;
  sendFieldBlur: (fieldName: string) => void;
}

export const LiveEditPreviewPanel = forwardRef<
  LiveEditPreviewPanelHandle,
  LiveEditPreviewPanelProps
>(function LiveEditPreviewPanel(
  { entryId, previewUrl, onFieldMap, onFieldClicked },
  ref,
) {
  const createSession = useMutation(api.previewSessions.create);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [state, setState] = useState<PreviewState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<{
    sessionId: string;
    sessionSecret: string;
    iframeUrl: string;
  } | null>(null);

  const expectedOriginRef = useRef<string | null>(null);

  const sendToIframe = useCallback((message: Record<string, unknown>) => {
    if (!expectedOriginRef.current) return;
    iframeRef.current?.contentWindow?.postMessage(
      message,
      expectedOriginRef.current,
    );
  }, []);

  useImperativeHandle(ref, () => ({
    sendFieldUpdate: (fieldName: string, value: unknown) => {
      sendToIframe({ type: "no-mess:field-updated", fieldName, value });
    },
    sendFieldFocus: (fieldName: string) => {
      sendToIframe({ type: "no-mess:field-focus", fieldName });
    },
    sendFieldBlur: (fieldName: string) => {
      sendToIframe({ type: "no-mess:field-blur", fieldName });
    },
  }));

  const initSession = useCallback(async () => {
    if (!previewUrl) return;

    setState("creating_session");
    setError(null);

    try {
      const result = await createSession({ entryId });
      if (!result.previewUrl) {
        setError("Preview URL not configured for this site");
        setState("error");
        return;
      }

      setSessionData({
        sessionId: result.sessionId,
        sessionSecret: result.sessionSecret,
        iframeUrl: result.previewUrl,
      });
      setState("waiting_for_iframe");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
      setState("error");
    }
  }, [createSession, entryId, previewUrl]);

  // Start session on mount
  useEffect(() => {
    initSession();
  }, [initSession]);

  // Listen for postMessage from iframe
  useEffect(() => {
    if (!sessionData) return;

    const expectedOrigin = new URL(sessionData.iframeUrl).origin;
    expectedOriginRef.current = expectedOrigin;

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== expectedOrigin) return;

      const data = event.data;
      if (!data || typeof data.type !== "string") return;

      if (data.type === "no-mess:preview-ready") {
        iframeRef.current?.contentWindow?.postMessage(
          {
            type: "no-mess:session-auth",
            sessionId: sessionData.sessionId,
            sessionSecret: sessionData.sessionSecret,
          },
          expectedOrigin,
        );
        setState("handshake_sent");
      }

      if (data.type === "no-mess:preview-loaded") {
        setState("active");
        // Enter live edit mode after handshake completes
        iframeRef.current?.contentWindow?.postMessage(
          { type: "no-mess:live-edit-enter", fields: [] },
          expectedOrigin,
        );
      }

      if (data.type === "no-mess:preview-error") {
        setError(data.error || "Preview failed to load");
        setState("error");
      }

      if (data.type === "no-mess:field-map") {
        onFieldMap?.(data.fields ?? []);
      }

      if (data.type === "no-mess:field-clicked") {
        onFieldClicked?.(data.fieldName);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [sessionData, onFieldMap, onFieldClicked]);

  // Send live-edit-exit on unmount
  useEffect(() => {
    return () => {
      if (expectedOriginRef.current) {
        iframeRef.current?.contentWindow?.postMessage(
          { type: "no-mess:live-edit-exit" },
          expectedOriginRef.current,
        );
      }
    };
  }, []);

  // Session TTL refresh — create a new session before the 10-min expiry
  useEffect(() => {
    if (state !== "active") return;

    const refreshTimer = setTimeout(
      async () => {
        try {
          const result = await createSession({ entryId });
          if (result.previewUrl) {
            setSessionData({
              sessionId: result.sessionId,
              sessionSecret: result.sessionSecret,
              iframeUrl: result.previewUrl,
            });
          }
        } catch {
          // Silently ignore refresh failures — user can still save
        }
      },
      8 * 60 * 1000,
    ); // 8 minutes

    return () => clearTimeout(refreshTimer);
  }, [state, createSession, entryId]);

  const handleRefresh = () => {
    if (!sessionData) return;
    const expectedOrigin = new URL(sessionData.iframeUrl).origin;
    iframeRef.current?.contentWindow?.postMessage(
      { type: "no-mess:refresh" },
      expectedOrigin,
    );
  };

  const handleNewSession = () => {
    setSessionData(null);
    initSession();
  };

  return (
    <div className="flex h-full flex-col border-l bg-background">
      {/* Minimal header */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b px-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Preview
          </span>
          {state === "active" && (
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          )}
          {(state === "creating_session" ||
            state === "waiting_for_iframe" ||
            state === "handshake_sent") && (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleRefresh}
          disabled={state !== "active"}
          title="Refresh preview"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>

      {/* Content */}
      <div className="relative flex-1">
        {error && (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={handleNewSession}>
              Retry
            </Button>
          </div>
        )}

        {!error && !sessionData && (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!error && sessionData && (
          <iframe
            ref={iframeRef}
            src={sessionData.iframeUrl}
            className="h-full w-full border-0"
            title="Live edit preview"
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        )}
      </div>
    </div>
  );
});
