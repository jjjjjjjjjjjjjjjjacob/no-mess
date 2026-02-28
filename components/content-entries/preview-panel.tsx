"use client";

import { useMutation } from "convex/react";
import { Eye, Loader2, RefreshCw, X } from "lucide-react";
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

export interface PreviewPanelRef {
  refresh(): void;
  isActive: boolean;
}

interface PreviewPanelProps {
  entryId: Id<"contentEntries">;
  previewUrl?: string;
  onClose: () => void;
}

export const PreviewPanel = forwardRef<PreviewPanelRef, PreviewPanelProps>(
  function PreviewPanel({ entryId, previewUrl, onClose }, ref) {
    const createSession = useMutation(api.previewSessions.create);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const [state, setState] = useState<PreviewState>("idle");
    const [error, setError] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [sessionData, setSessionData] = useState<{
      sessionId: string;
      sessionSecret: string;
      iframeUrl: string;
    } | null>(null);

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
        setError(
          err instanceof Error ? err.message : "Failed to create session",
        );
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

      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== expectedOrigin) return;

        const data = event.data;
        if (!data || typeof data.type !== "string") return;

        if (data.type === "no-mess:preview-ready") {
          // Iframe is ready, send session auth
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
        }

        if (data.type === "no-mess:preview-error") {
          setError(data.error || "Preview failed to load");
          setState("error");
        }
      };

      window.addEventListener("message", handleMessage);
      return () => window.removeEventListener("message", handleMessage);
    }, [sessionData]);

    const handleRefresh = useCallback(() => {
      if (!sessionData) return;

      const expectedOrigin = new URL(sessionData.iframeUrl).origin;
      iframeRef.current?.contentWindow?.postMessage(
        { type: "no-mess:refresh" },
        expectedOrigin,
      );

      // Brief visual indicator
      setIsRefreshing(true);
      setTimeout(() => setIsRefreshing(false), 600);
    }, [sessionData]);

    const handleNewSession = () => {
      setSessionData(null);
      initSession();
    };

    // Expose refresh and state via ref
    useImperativeHandle(
      ref,
      () => ({
        refresh: handleRefresh,
        isActive: state === "active",
      }),
      [handleRefresh, state],
    );

    return (
      <div className="flex h-full flex-col rounded-lg border bg-background">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Preview</span>
            {state === "active" && (
              <span className="h-2 w-2 rounded-full bg-primary" />
            )}
            {(state === "creating_session" ||
              state === "waiting_for_iframe" ||
              state === "handshake_sent") && (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleRefresh}
              disabled={state !== "active"}
              title="Refresh preview"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClose}
              title="Close preview"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
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
              title="Content preview"
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          )}
        </div>
      </div>
    );
  },
);
