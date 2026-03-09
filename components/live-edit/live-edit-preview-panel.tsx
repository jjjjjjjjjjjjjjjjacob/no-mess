"use client";

import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  Loader2,
  MousePointerClick,
  RefreshCw,
} from "lucide-react";
import type { FormEvent } from "react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  buildLiveEditRouteUrl,
  normalizeSiteRouteUrl,
  toRelativeSiteRouteUrl,
} from "@/lib/preview-route";

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
  liveValues: Record<string, unknown>;
  onFieldMap?: (fields: { fieldName: string; rect?: DOMRect }[]) => void;
  onFieldClicked?: (fieldName: string) => void;
}

interface SessionData {
  iframeUrl: string | null;
  sessionId: string;
  sessionSecret: string;
  siteBaseUrl: string | null;
}

export interface LiveEditPreviewPanelHandle {
  sendFieldUpdate: (fieldName: string, value: unknown) => void;
  sendFieldFocus: (fieldName: string) => void;
  sendFieldBlur: (fieldName: string) => void;
}

function toDisplayUrl(url: string | null, siteBaseUrl: string | null) {
  if (!url) return "";
  if (!siteBaseUrl) return url;

  try {
    return toRelativeSiteRouteUrl(url, siteBaseUrl);
  } catch {
    return url;
  }
}

export const LiveEditPreviewPanel = forwardRef<
  LiveEditPreviewPanelHandle,
  LiveEditPreviewPanelProps
>(function LiveEditPreviewPanel(
  { entryId, previewUrl, liveValues, onFieldMap, onFieldClicked },
  ref,
) {
  const createSession = useMutation(api.previewSessions.create);
  const selectRoute = useMutation(api.contentEntryRoutes.select);
  const routes = useQuery(api.contentEntryRoutes.listForEntry, { entryId });
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const bridgeTimerRef = useRef<number | null>(null);
  const entryBoundTimerRef = useRef<number | null>(null);
  const initializedRouteRef = useRef(false);
  const expectedOriginRef = useRef<string | null>(null);

  const [state, setState] = useState<PreviewState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [currentRouteUrl, setCurrentRouteUrl] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [bridgeWarning, setBridgeWarning] = useState<string | null>(null);
  const [entryBindingWarning, setEntryBindingWarning] = useState<string | null>(
    null,
  );
  const [isSelectModeEnabled, setIsSelectModeEnabled] = useState(true);

  const clearTimers = useCallback(() => {
    if (bridgeTimerRef.current !== null) {
      window.clearTimeout(bridgeTimerRef.current);
      bridgeTimerRef.current = null;
    }
    if (entryBoundTimerRef.current !== null) {
      window.clearTimeout(entryBoundTimerRef.current);
      entryBoundTimerRef.current = null;
    }
  }, []);

  const sendToIframe = useCallback((message: Record<string, unknown>) => {
    if (!expectedOriginRef.current) return;
    iframeRef.current?.contentWindow?.postMessage(
      message,
      expectedOriginRef.current,
    );
  }, []);

  const syncLiveValues = useCallback(() => {
    for (const [fieldName, value] of Object.entries(liveValues)) {
      sendToIframe({ type: "no-mess:field-updated", fieldName, value });
    }
  }, [liveValues, sendToIframe]);

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

  const setRouteState = useCallback(
    (routeUrl: string | null, nextIframeSrc: string) => {
      expectedOriginRef.current = new URL(nextIframeSrc).origin;
      setCurrentRouteUrl(routeUrl);
      setIframeSrc(nextIframeSrc);
      setUrlInput(
        toDisplayUrl(
          routeUrl ?? nextIframeSrc,
          sessionData?.siteBaseUrl ?? null,
        ),
      );
      setUrlError(null);
      setBridgeWarning(null);
      setEntryBindingWarning(null);
      setState("waiting_for_iframe");
      clearTimers();
      bridgeTimerRef.current = window.setTimeout(() => {
        setBridgeWarning(
          "This route loaded, but no no-mess bridge was detected. Draft and live updates are unavailable on this page.",
        );
      }, 2500);
    },
    [clearTimers, sessionData?.siteBaseUrl],
  );

  const navigateToRoute = useCallback(
    async (
      routeUrl: string,
      options?: { persist?: boolean; sessionOverride?: SessionData | null },
    ) => {
      const session = options?.sessionOverride ?? sessionData;
      if (!session?.siteBaseUrl) {
        setError("Preview URL not configured for this site");
        setState("error");
        return;
      }

      let normalizedUrl: string;
      try {
        normalizedUrl = normalizeSiteRouteUrl(routeUrl, session.siteBaseUrl);
      } catch (err) {
        setUrlError(err instanceof Error ? err.message : "Invalid route URL");
        return;
      }

      if (options?.persist) {
        await selectRoute({ entryId, url: normalizedUrl });
      }

      setRouteState(
        normalizedUrl,
        buildLiveEditRouteUrl(normalizedUrl, session.sessionId),
      );
    },
    [entryId, selectRoute, sessionData, setRouteState],
  );

  const navigateToLegacyPreview = useCallback(
    (sessionOverride?: SessionData | null) => {
      const session = sessionOverride ?? sessionData;
      if (!session?.iframeUrl) {
        setError("Preview URL not configured for this site");
        setState("error");
        return;
      }

      setRouteState(null, session.iframeUrl);
    },
    [sessionData, setRouteState],
  );

  const initSession = useCallback(async () => {
    if (!previewUrl) return;

    setState("creating_session");
    setError(null);
    initializedRouteRef.current = false;

    try {
      const result = await createSession({ entryId });
      if (!result.previewUrl && !result.siteBaseUrl) {
        setError("Preview URL not configured for this site");
        setState("error");
        return;
      }

      setSessionData({
        sessionId: result.sessionId,
        sessionSecret: result.sessionSecret,
        siteBaseUrl: result.siteBaseUrl,
        iframeUrl: result.previewUrl,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
      setState("error");
    }
  }, [createSession, entryId, previewUrl]);

  useEffect(() => {
    initSession();
  }, [initSession]);

  useEffect(() => {
    if (!sessionData) return;
    if (routes === undefined) return;
    if (initializedRouteRef.current) return;

    initializedRouteRef.current = true;
    if (routes.length > 0) {
      void navigateToRoute(routes[0].url);
      return;
    }

    navigateToLegacyPreview(sessionData);
  }, [navigateToLegacyPreview, navigateToRoute, routes, sessionData]);

  useEffect(() => {
    if (!sessionData || !iframeSrc) return;

    const expectedOrigin = new URL(iframeSrc).origin;
    expectedOriginRef.current = expectedOrigin;

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== expectedOrigin) return;

      const data = event.data;
      if (!data || typeof data.type !== "string") return;

      if (data.type === "no-mess:preview-ready") {
        if (bridgeTimerRef.current !== null) {
          window.clearTimeout(bridgeTimerRef.current);
          bridgeTimerRef.current = null;
        }
        setBridgeWarning(null);
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
        sendToIframe({ type: "no-mess:live-edit-enter", fields: [] });
        sendToIframe({
          type: "no-mess:select-mode",
          enabled: isSelectModeEnabled,
        });
        syncLiveValues();

        if (entryBoundTimerRef.current !== null) {
          window.clearTimeout(entryBoundTimerRef.current);
        }
        entryBoundTimerRef.current = window.setTimeout(() => {
          setEntryBindingWarning(
            "The page is integrated with no-mess, but this entry is not mounted on the current route.",
          );
        }, 1500);
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

      if (data.type === "no-mess:entry-bound" && data.entryId === entryId) {
        if (entryBoundTimerRef.current !== null) {
          window.clearTimeout(entryBoundTimerRef.current);
          entryBoundTimerRef.current = null;
        }
        setEntryBindingWarning(null);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [
    entryId,
    iframeSrc,
    isSelectModeEnabled,
    onFieldClicked,
    onFieldMap,
    sendToIframe,
    sessionData,
    syncLiveValues,
  ]);

  useEffect(() => {
    if (state !== "active") return;
    sendToIframe({ type: "no-mess:select-mode", enabled: isSelectModeEnabled });
  }, [isSelectModeEnabled, sendToIframe, state]);

  useEffect(() => {
    return () => {
      clearTimers();
      if (expectedOriginRef.current) {
        iframeRef.current?.contentWindow?.postMessage(
          { type: "no-mess:live-edit-exit" },
          expectedOriginRef.current,
        );
      }
    };
  }, [clearTimers]);

  useEffect(() => {
    if (state !== "active") return;

    const refreshTimer = window.setTimeout(
      async () => {
        try {
          const result = await createSession({ entryId });
          const nextSession: SessionData = {
            sessionId: result.sessionId,
            sessionSecret: result.sessionSecret,
            siteBaseUrl: result.siteBaseUrl,
            iframeUrl: result.previewUrl,
          };
          setSessionData(nextSession);

          if (currentRouteUrl) {
            await navigateToRoute(currentRouteUrl, {
              sessionOverride: nextSession,
            });
            return;
          }

          navigateToLegacyPreview(nextSession);
        } catch {
          // Ignore silent refresh failures; the user can still save/publish.
        }
      },
      8 * 60 * 1000,
    );

    return () => window.clearTimeout(refreshTimer);
  }, [
    createSession,
    currentRouteUrl,
    entryId,
    navigateToLegacyPreview,
    navigateToRoute,
    state,
  ]);

  const handleRefresh = () => {
    if (state === "active") {
      sendToIframe({ type: "no-mess:refresh" });
      syncLiveValues();
      return;
    }

    if (iframeSrc) {
      setRouteState(currentRouteUrl, iframeSrc);
    }
  };

  const handleNewSession = () => {
    clearTimers();
    setSessionData(null);
    setIframeSrc(null);
    setCurrentRouteUrl(null);
    setUrlInput("");
    initSession();
  };

  const handleUrlSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!sessionData?.siteBaseUrl) {
      setUrlError("Preview URL not configured for this site");
      return;
    }

    await navigateToRoute(urlInput, { persist: true });
  };

  const savedUrls = routes ?? [];

  return (
    <div className="flex h-full flex-col border-l bg-background">
      <div className="border-b px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Live Preview
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

          <div className="flex items-center gap-2">
            <Button
              variant={isSelectModeEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => setIsSelectModeEnabled((current) => !current)}
            >
              <MousePointerClick className="mr-2 h-3.5 w-3.5" />
              Select to edit
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleRefresh}
              disabled={!iframeSrc}
              title="Refresh preview"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <form className="min-w-0 flex-1" onSubmit={handleUrlSubmit}>
            <InputGroup>
              <InputGroupInput
                value={urlInput}
                onChange={(event) => {
                  setUrlInput(event.target.value);
                  setUrlError(null);
                }}
                placeholder={
                  sessionData?.siteBaseUrl ? "/blog/post-slug" : "Route"
                }
              />
              <InputGroupButton type="submit">Go</InputGroupButton>
            </InputGroup>
          </form>

          <Select
            value={currentRouteUrl ?? "__legacy__"}
            onValueChange={(value) => {
              if (!value) return;
              if (value === "__legacy__") {
                navigateToLegacyPreview();
                return;
              }
              void navigateToRoute(value, { persist: true });
            }}
          >
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Saved URLs" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {savedUrls.map((route) => (
                  <SelectItem key={route._id} value={route.url}>
                    {toDisplayUrl(route.url, sessionData?.siteBaseUrl ?? null)}
                  </SelectItem>
                ))}
                {sessionData?.iframeUrl && (
                  <SelectItem value="__legacy__">/no-mess-preview</SelectItem>
                )}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {urlError && (
          <p className="mt-2 text-xs text-destructive">{urlError}</p>
        )}

        {(bridgeWarning || entryBindingWarning) && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>{bridgeWarning ?? entryBindingWarning}</p>
          </div>
        )}

        {savedUrls.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {savedUrls.slice(0, 3).map((route, index) => (
              <Badge
                key={route._id}
                variant={index === 0 ? "default" : "secondary"}
              >
                {index === 0 ? "Default" : route.source}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="relative flex-1">
        {error && (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={handleNewSession}>
              Retry
            </Button>
          </div>
        )}

        {!error && !iframeSrc && (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!error && iframeSrc && (
          <iframe
            key={iframeSrc}
            ref={iframeRef}
            src={iframeSrc}
            className="h-full w-full border-0"
            title="Live edit preview"
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        )}
      </div>
    </div>
  );
});
