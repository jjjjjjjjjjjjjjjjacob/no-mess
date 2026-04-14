"use client";

import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  Loader2,
  Monitor,
  MousePointerClick,
  RefreshCw,
  Smartphone,
  Tablet,
} from "lucide-react";
import type { FormEvent } from "react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
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

type ViewportFamily = "desktop" | "tablet" | "mobile";

type ViewportPreset = {
  family: ViewportFamily;
  key: string;
  label: string;
  width: number;
  height: number;
};

export type LiveEditPreviewMode = "draft" | "production";

interface LiveEditPreviewPanelProps {
  entryId: Id<"contentEntries">;
  previewUrl?: string;
  liveValues: Record<string, unknown>;
  viewMode: LiveEditPreviewMode;
  onViewModeChange: (mode: LiveEditPreviewMode) => void;
  onProductionAvailabilityChange?: (available: boolean) => void;
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

const CONFIGURED_PREVIEW_VALUE = "__configured_preview__";
const ZOOM_VALUES = [100, 75, 50, 25] as const;
const VIEWPORT_PRESETS: Record<ViewportFamily, ViewportPreset[]> = {
  desktop: [
    {
      family: "desktop",
      key: "desktop-1440",
      label: "1440 x 1024",
      width: 1440,
      height: 1024,
    },
    {
      family: "desktop",
      key: "desktop-1280",
      label: "1280 x 900",
      width: 1280,
      height: 900,
    },
  ],
  tablet: [
    {
      family: "tablet",
      key: "tablet-1024",
      label: "1024 x 1366",
      width: 1024,
      height: 1366,
    },
    {
      family: "tablet",
      key: "tablet-834",
      label: "834 x 1194",
      width: 834,
      height: 1194,
    },
  ],
  mobile: [
    {
      family: "mobile",
      key: "mobile-430",
      label: "430 x 932",
      width: 430,
      height: 932,
    },
    {
      family: "mobile",
      key: "mobile-390",
      label: "390 x 844",
      width: 390,
      height: 844,
    },
  ],
};

function getCompatibleRouteUrl(url: string, siteBaseUrl: string | null) {
  if (!siteBaseUrl) return null;

  try {
    return normalizeSiteRouteUrl(url, siteBaseUrl);
  } catch {
    return null;
  }
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

function getPresetByKey(key: string) {
  for (const familyPresets of Object.values(VIEWPORT_PRESETS)) {
    const match = familyPresets.find((preset) => preset.key === key);
    if (match) {
      return match;
    }
  }

  return VIEWPORT_PRESETS.desktop[1];
}

export const LiveEditPreviewPanel = forwardRef<
  LiveEditPreviewPanelHandle,
  LiveEditPreviewPanelProps
>(function LiveEditPreviewPanel(
  {
    entryId,
    previewUrl,
    liveValues,
    viewMode,
    onViewModeChange,
    onProductionAvailabilityChange,
    onFieldMap,
    onFieldClicked,
  },
  ref,
) {
  const createSession = useMutation(api.previewSessions.create);
  const selectRoute = useMutation(api.contentEntryRoutes.select);
  const routes = useQuery(api.contentEntryRoutes.listForEntry, { entryId });
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const viewportShellRef = useRef<HTMLDivElement>(null);
  const bridgeTimerRef = useRef<number | null>(null);
  const entryBoundTimerRef = useRef<number | null>(null);
  const initializedRouteRef = useRef(false);
  const expectedOriginRef = useRef<string | null>(null);

  const [state, setState] = useState<PreviewState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [iframeRefreshKey, setIframeRefreshKey] = useState(0);
  const [currentRouteUrl, setCurrentRouteUrl] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [bridgeWarning, setBridgeWarning] = useState<string | null>(null);
  const [entryBindingWarning, setEntryBindingWarning] = useState<string | null>(
    null,
  );
  const [isSelectModeEnabled, setIsSelectModeEnabled] = useState(true);
  const [viewportFamily, setViewportFamily] =
    useState<ViewportFamily>("desktop");
  const [viewportPresetKey, setViewportPresetKey] = useState("desktop-1280");
  const [viewportWidth, setViewportWidth] = useState(1280);
  const [viewportHeight, setViewportHeight] = useState(900);
  const [zoomPercent, setZoomPercent] =
    useState<(typeof ZOOM_VALUES)[number]>(100);

  const siteBaseUrl = sessionData?.siteBaseUrl ?? previewUrl ?? null;
  const canViewProduction = currentRouteUrl !== null;
  const zoomScale = zoomPercent / 100;

  const routeOptions = useMemo(
    () =>
      (routes ?? []).map((route) => {
        const normalizedUrl = getCompatibleRouteUrl(route.url, siteBaseUrl);
        return {
          ...route,
          normalizedUrl,
          isCompatible: normalizedUrl !== null,
          displayUrl: normalizedUrl
            ? toDisplayUrl(normalizedUrl, siteBaseUrl)
            : route.url,
        };
      }),
    [routes, siteBaseUrl],
  );
  const availableRoutes = routeOptions.filter((route) => route.isCompatible);
  const unavailableRoutes = routeOptions.filter((route) => !route.isCompatible);
  const configuredPreviewPath = sessionData?.iframeUrl
    ? toDisplayUrl(sessionData.iframeUrl, siteBaseUrl)
    : "/no-mess-preview";

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

  const sendToIframe = useCallback(
    (message: Record<string, unknown>) => {
      if (viewMode !== "draft" || !expectedOriginRef.current) return;
      iframeRef.current?.contentWindow?.postMessage(
        message,
        expectedOriginRef.current,
      );
    },
    [viewMode],
  );

  const syncLiveValues = useCallback(() => {
    if (viewMode !== "draft") return;

    for (const [fieldName, value] of Object.entries(liveValues)) {
      sendToIframe({ type: "no-mess:field-updated", fieldName, value });
    }
  }, [liveValues, sendToIframe, viewMode]);

  useImperativeHandle(
    ref,
    () => ({
      sendFieldUpdate: (fieldName: string, value: unknown) => {
        sendToIframe({ type: "no-mess:field-updated", fieldName, value });
      },
      sendFieldFocus: (fieldName: string) => {
        sendToIframe({ type: "no-mess:field-focus", fieldName });
      },
      sendFieldBlur: (fieldName: string) => {
        sendToIframe({ type: "no-mess:field-blur", fieldName });
      },
    }),
    [sendToIframe],
  );

  const buildIframeSrc = useCallback(
    (
      routeUrl: string | null,
      session: SessionData,
      nextViewMode: LiveEditPreviewMode,
    ) => {
      if (nextViewMode === "production") {
        return routeUrl;
      }

      if (routeUrl) {
        return buildLiveEditRouteUrl(routeUrl, session.sessionId);
      }

      return session.iframeUrl;
    },
    [],
  );

  const setRouteState = useCallback(
    (
      routeUrl: string | null,
      nextIframeSrc: string,
      nextSiteBaseUrl: string | null,
      nextViewMode: LiveEditPreviewMode,
    ) => {
      expectedOriginRef.current = new URL(nextIframeSrc).origin;
      setCurrentRouteUrl(routeUrl);
      setIframeSrc(nextIframeSrc);
      setUrlInput(routeUrl ? toDisplayUrl(routeUrl, nextSiteBaseUrl) : "");
      setError(null);
      setUrlError(null);
      setBridgeWarning(null);
      setEntryBindingWarning(null);
      setState("waiting_for_iframe");
      clearTimers();

      if (nextViewMode === "draft") {
        bridgeTimerRef.current = window.setTimeout(() => {
          setBridgeWarning(
            "This route loaded, but no no-mess bridge was detected. Draft and live updates are unavailable on this page.",
          );
        }, 2500);
      }
    },
    [clearTimers],
  );

  const navigateToRoute = useCallback(
    async (
      routeUrl: string,
      options?: {
        persist?: boolean;
        sessionOverride?: SessionData | null;
        modeOverride?: LiveEditPreviewMode;
      },
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
        try {
          await selectRoute({ entryId, url: normalizedUrl });
        } catch (err) {
          setUrlError(
            err instanceof Error ? err.message : "Failed to save route URL",
          );
          return;
        }
      }

      const nextViewMode = options?.modeOverride ?? viewMode;
      const nextIframeSrc = buildIframeSrc(
        normalizedUrl,
        session,
        nextViewMode,
      );
      if (!nextIframeSrc) {
        setUrlError("Production view requires a saved page URL.");
        onViewModeChange("draft");
        return;
      }

      setRouteState(
        normalizedUrl,
        nextIframeSrc,
        session.siteBaseUrl,
        nextViewMode,
      );
    },
    [
      buildIframeSrc,
      entryId,
      onViewModeChange,
      selectRoute,
      sessionData,
      setRouteState,
      viewMode,
    ],
  );

  const navigateToConfiguredPreview = useCallback(
    (
      sessionOverride?: SessionData | null,
      modeOverride: LiveEditPreviewMode = viewMode,
    ) => {
      const session = sessionOverride ?? sessionData;
      if (!session?.iframeUrl) {
        setError("Preview URL not configured for this site");
        setState("error");
        return;
      }

      if (modeOverride === "production") {
        setUrlError("Production view requires a saved page URL.");
        onViewModeChange("draft");
        setRouteState(null, session.iframeUrl, session.siteBaseUrl, "draft");
        return;
      }

      setRouteState(null, session.iframeUrl, session.siteBaseUrl, modeOverride);
    },
    [onViewModeChange, sessionData, setRouteState, viewMode],
  );

  const initSession = useCallback(async () => {
    if (!previewUrl) return;

    setState("creating_session");
    setError(null);
    setUrlError(null);
    setIframeSrc(null);
    setCurrentRouteUrl(null);
    setUrlInput("");
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
    if (availableRoutes[0]?.normalizedUrl) {
      void navigateToRoute(availableRoutes[0].normalizedUrl, {
        modeOverride: viewMode,
      });
      return;
    }

    navigateToConfiguredPreview(sessionData, viewMode);
  }, [
    availableRoutes,
    navigateToConfiguredPreview,
    navigateToRoute,
    routes,
    sessionData,
    viewMode,
  ]);

  useEffect(() => {
    onProductionAvailabilityChange?.(canViewProduction);
  }, [canViewProduction, onProductionAvailabilityChange]);

  useEffect(() => {
    if (viewMode !== "production" || currentRouteUrl) {
      return;
    }

    onViewModeChange("draft");
  }, [currentRouteUrl, onViewModeChange, viewMode]);

  useEffect(() => {
    if (!sessionData || !iframeSrc) return;

    const expectedOrigin = new URL(iframeSrc).origin;
    expectedOriginRef.current = expectedOrigin;

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== expectedOrigin) return;

      const data = event.data;
      if (!data || typeof data.type !== "string") return;

      if (viewMode === "draft" && data.type === "no-mess:preview-ready") {
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

      if (viewMode === "draft" && data.type === "no-mess:preview-loaded") {
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

      if (viewMode === "draft" && data.type === "no-mess:preview-error") {
        setError(data.error || "Preview failed to load");
        setState("error");
      }

      if (viewMode === "draft" && data.type === "no-mess:field-map") {
        onFieldMap?.(data.fields ?? []);
      }

      if (viewMode === "draft" && data.type === "no-mess:field-clicked") {
        onFieldClicked?.(data.fieldName);
      }

      if (
        viewMode === "draft" &&
        data.type === "no-mess:entry-bound" &&
        data.entryId === entryId
      ) {
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
    viewMode,
  ]);

  useEffect(() => {
    if (viewMode !== "draft" || state !== "active") return;
    sendToIframe({ type: "no-mess:select-mode", enabled: isSelectModeEnabled });
  }, [isSelectModeEnabled, sendToIframe, state, viewMode]);

  useEffect(() => {
    if (viewMode !== "draft") {
      clearTimers();
      setBridgeWarning(null);
      setEntryBindingWarning(null);
    }
  }, [clearTimers, viewMode]);

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
    if (state !== "active" || viewMode !== "draft") return;

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

          const nextRouteUrl = currentRouteUrl
            ? getCompatibleRouteUrl(currentRouteUrl, nextSession.siteBaseUrl)
            : null;

          if (nextRouteUrl) {
            await navigateToRoute(nextRouteUrl, {
              sessionOverride: nextSession,
              modeOverride: "draft",
            });
            return;
          }

          navigateToConfiguredPreview(nextSession, "draft");
        } catch {
          // Ignore silent refresh failures; the user can still continue editing.
        }
      },
      8 * 60 * 1000,
    );

    return () => window.clearTimeout(refreshTimer);
  }, [
    createSession,
    currentRouteUrl,
    entryId,
    navigateToConfiguredPreview,
    navigateToRoute,
    state,
    viewMode,
  ]);

  useEffect(() => {
    const shell = viewportShellRef.current;
    if (!shell || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(([entry]) => {
      const nextWidth = Math.round(entry.contentRect.width);
      const nextHeight = Math.round(entry.contentRect.height);

      setViewportWidth((current) => {
        return current === nextWidth ? current : nextWidth;
      });
      setViewportHeight((current) => {
        return current === nextHeight ? current : nextHeight;
      });
    });

    observer.observe(shell);
    return () => observer.disconnect();
  }, []);

  const handleRefresh = () => {
    if (viewMode === "draft" && state === "active") {
      sendToIframe({ type: "no-mess:refresh" });
      syncLiveValues();
      return;
    }

    if (iframeSrc) {
      setState("waiting_for_iframe");
      setIframeRefreshKey((current) => current + 1);
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

    await navigateToRoute(urlInput, { persist: true, modeOverride: viewMode });
  };

  const handlePreviewModeChange = (nextMode: LiveEditPreviewMode) => {
    if (nextMode === viewMode || !sessionData) return;

    if (nextMode === "production" && !currentRouteUrl) {
      setUrlError("Production view requires a saved page URL.");
      return;
    }

    onViewModeChange(nextMode);

    if (currentRouteUrl) {
      void navigateToRoute(currentRouteUrl, {
        sessionOverride: sessionData,
        modeOverride: nextMode,
      });
      return;
    }

    navigateToConfiguredPreview(sessionData, nextMode);
  };

  const handleViewportFamilyChange = (family: ViewportFamily) => {
    const nextPreset = VIEWPORT_PRESETS[family][0];
    setViewportFamily(family);
    setViewportPresetKey(nextPreset.key);
    setViewportWidth(nextPreset.width);
    setViewportHeight(nextPreset.height);
  };

  const handlePresetChange = (presetKey: string | null) => {
    if (!presetKey) return;

    const preset = getPresetByKey(presetKey);
    setViewportFamily(preset.family);
    setViewportPresetKey(preset.key);
    setViewportWidth(preset.width);
    setViewportHeight(preset.height);
  };

  const currentPresetOptions = VIEWPORT_PRESETS[viewportFamily];
  const frameTitle =
    viewMode === "production" ? "Production preview" : "Live edit preview";

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background">
      <div className="shrink-0 border-b px-3 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
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

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border p-1">
              <Button
                variant={viewMode === "draft" ? "default" : "ghost"}
                size="sm"
                onClick={() => handlePreviewModeChange("draft")}
              >
                Draft
              </Button>
              <Button
                variant={viewMode === "production" ? "default" : "ghost"}
                size="sm"
                onClick={() => handlePreviewModeChange("production")}
                disabled={!canViewProduction}
                title={
                  canViewProduction
                    ? "Show the published page on this route"
                    : "Production view requires a saved page URL"
                }
              >
                Production
              </Button>
            </div>
            <Button
              variant={isSelectModeEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => setIsSelectModeEnabled((current) => !current)}
              disabled={viewMode !== "draft"}
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

        <div className="mt-3 flex flex-col gap-2 xl:flex-row xl:items-center">
          <form className="min-w-0 flex-1" onSubmit={handleUrlSubmit}>
            <InputGroup>
              <InputGroupInput
                className="font-mono text-xs sm:text-sm"
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
            value={currentRouteUrl ?? CONFIGURED_PREVIEW_VALUE}
            onValueChange={(value) => {
              if (!value) return;
              if (value === CONFIGURED_PREVIEW_VALUE) {
                navigateToConfiguredPreview();
                return;
              }
              void navigateToRoute(value, {
                persist: true,
                modeOverride: viewMode,
              });
            }}
          >
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Preview source" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Configured preview</SelectLabel>
                <SelectItem value={CONFIGURED_PREVIEW_VALUE}>
                  {configuredPreviewPath}
                </SelectItem>
              </SelectGroup>
              {availableRoutes.length > 0 && (
                <>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel>Available routes</SelectLabel>
                    {availableRoutes.map((route) => (
                      <SelectItem
                        key={route._id}
                        value={route.normalizedUrl ?? route.url}
                      >
                        {route.displayUrl}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </>
              )}
              {unavailableRoutes.length > 0 && (
                <>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel>Unavailable routes</SelectLabel>
                    {unavailableRoutes.map((route) => (
                      <SelectItem key={route._id} value={route.url} disabled>
                        {route.displayUrl} (unavailable)
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-3 rounded-lg border bg-card/50 p-3">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={viewportFamily === "desktop" ? "default" : "outline"}
                size="sm"
                onClick={() => handleViewportFamilyChange("desktop")}
              >
                <Monitor className="mr-2 h-3.5 w-3.5" />
                Desktop
              </Button>
              <Button
                variant={viewportFamily === "tablet" ? "default" : "outline"}
                size="sm"
                onClick={() => handleViewportFamilyChange("tablet")}
              >
                <Tablet className="mr-2 h-3.5 w-3.5" />
                Tablet
              </Button>
              <Button
                variant={viewportFamily === "mobile" ? "default" : "outline"}
                size="sm"
                onClick={() => handleViewportFamilyChange("mobile")}
              >
                <Smartphone className="mr-2 h-3.5 w-3.5" />
                Mobile
              </Button>
            </div>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_auto_auto_auto]">
              <div className="space-y-1">
                <Label htmlFor="live-edit-viewport-preset">
                  Viewport preset
                </Label>
                <Select
                  value={viewportPresetKey}
                  onValueChange={handlePresetChange}
                >
                  <SelectTrigger
                    id="live-edit-viewport-preset"
                    className="w-full"
                  >
                    <SelectValue placeholder="Viewport preset" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentPresetOptions.map((preset) => (
                      <SelectItem key={preset.key} value={preset.key}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="live-edit-viewport-width">Width</Label>
                <Input
                  id="live-edit-viewport-width"
                  type="number"
                  min={240}
                  step={1}
                  value={viewportWidth}
                  onChange={(event) => {
                    const nextWidth = Number(event.target.value);
                    if (Number.isFinite(nextWidth) && nextWidth >= 240) {
                      setViewportWidth(nextWidth);
                    }
                  }}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="live-edit-viewport-height">Height</Label>
                <Input
                  id="live-edit-viewport-height"
                  type="number"
                  min={320}
                  step={1}
                  value={viewportHeight}
                  onChange={(event) => {
                    const nextHeight = Number(event.target.value);
                    if (Number.isFinite(nextHeight) && nextHeight >= 320) {
                      setViewportHeight(nextHeight);
                    }
                  }}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="live-edit-zoom">Zoom</Label>
                <Select
                  value={String(zoomPercent)}
                  onValueChange={(value) => {
                    const nextZoom = Number(value);
                    if (
                      ZOOM_VALUES.includes(
                        nextZoom as (typeof ZOOM_VALUES)[number],
                      )
                    ) {
                      setZoomPercent(nextZoom as (typeof ZOOM_VALUES)[number]);
                    }
                  }}
                >
                  <SelectTrigger id="live-edit-zoom" className="w-full">
                    <SelectValue placeholder="Zoom" />
                  </SelectTrigger>
                  <SelectContent>
                    {ZOOM_VALUES.map((zoom) => (
                      <SelectItem key={zoom} value={String(zoom)}>
                        {zoom}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {siteBaseUrl && (
          <p className="mt-2 break-all text-[11px] text-muted-foreground">
            Preview base{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
              {siteBaseUrl}
            </code>
          </p>
        )}

        {urlError && (
          <p className="mt-2 text-xs text-destructive">{urlError}</p>
        )}

        {viewMode === "production" && !canViewProduction && (
          <p className="mt-2 text-xs text-muted-foreground">
            Production view is available only on saved page URLs, not the legacy
            preview route.
          </p>
        )}

        {unavailableRoutes.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            {unavailableRoutes.length} saved route
            {unavailableRoutes.length === 1 ? " is" : "s are"} unavailable for
            the current preview base.
          </p>
        )}

        {viewMode === "draft" && (bridgeWarning || entryBindingWarning) && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>{bridgeWarning ?? entryBindingWarning}</p>
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant={viewMode === "draft" ? "default" : "secondary"}>
            {viewMode === "draft" ? "Draft view" : "Production view"}
          </Badge>
          <Badge variant={currentRouteUrl ? "secondary" : "outline"}>
            {currentRouteUrl ? "Saved page URL" : "Configured preview"}
          </Badge>
          <Badge variant="outline">
            {viewportWidth} x {viewportHeight}
          </Badge>
          <Badge variant="outline">{zoomPercent}% zoom</Badge>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-muted/20">
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
          <div className="flex h-full items-start justify-center overflow-auto p-4">
            <div className="flex min-h-full flex-col items-center gap-3">
              <p className="text-xs text-muted-foreground">
                Drag the viewport corner to resize. Zoom scales the page inside
                the frame.
              </p>
              <div
                ref={viewportShellRef}
                className="relative overflow-hidden rounded-2xl border bg-white shadow-xl"
                style={{
                  width: `${viewportWidth}px`,
                  height: `${viewportHeight}px`,
                  resize: "both",
                }}
              >
                <div className="size-full overflow-hidden bg-white">
                  <div
                    style={{
                      width: `${100 / zoomScale}%`,
                      height: `${100 / zoomScale}%`,
                      transform: `scale(${zoomScale})`,
                      transformOrigin: "top left",
                    }}
                  >
                    <iframe
                      key={`${iframeSrc}:${iframeRefreshKey}`}
                      ref={iframeRef}
                      src={iframeSrc}
                      className="h-full w-full border-0"
                      title={frameTitle}
                      sandbox="allow-scripts allow-same-origin allow-forms"
                      onLoad={() => {
                        if (viewMode === "production") {
                          setState("active");
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
