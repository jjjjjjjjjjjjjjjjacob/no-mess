"use client";

import { usePostHog } from "posthog-js/react";
import { useCallback, useMemo } from "react";
import {
  type BeatName,
  DASHBOARD_API_KEY_COPIED,
  DASHBOARD_API_KEY_REGENERATED,
  DASHBOARD_FIELD_ADDED,
  DASHBOARD_FIELD_DUPLICATED,
  DASHBOARD_FIELD_REMOVED,
  DASHBOARD_FIELD_REORDERED,
  DASHBOARD_ONBOARDING_COMPLETED,
  DASHBOARD_ONBOARDING_DISMISSED,
  DASHBOARD_SCHEMA_CREATED,
  DASHBOARD_SCHEMA_DELETED,
  DASHBOARD_SCHEMA_DRAFT_SAVED,
  DASHBOARD_SCHEMA_EXPORTED,
  DASHBOARD_SCHEMA_IMPORTED,
  DASHBOARD_SCHEMA_PUBLISHED,
  DASHBOARD_SEARCH_PERFORMED,
  DASHBOARD_SIDEBAR_TOGGLED,
  DASHBOARD_SITE_CREATED,
  DASHBOARD_SITE_DELETED,
  DASHBOARD_SITE_SETTINGS_SAVED,
  DASHBOARD_SORT_CHANGED,
  DASHBOARD_TAB_NAVIGATED,
  LANDING_CTA_CLICKED,
  LANDING_EXTERNAL_LINK_CLICKED,
  LANDING_FEATURE_CARD_HOVER,
  LANDING_MOBILE_MENU_TOGGLED,
  LANDING_NEWSLETTER_SUBMITTED,
  LANDING_PALETTE_CHANGED,
  LANDING_PALETTE_OVERRIDE,
  LANDING_SCROLL_DEPTH,
  LANDING_SCROLL_NAVIGATION,
  LANDING_SECTION_TIME,
  LANDING_SECTION_VIEWED,
  LANDING_THEME_CHANGED,
} from "@/lib/analytics-events";

export function useAnalytics() {
  const posthog = usePostHog();

  const track = useCallback(
    (event: string, properties?: Record<string, unknown>) => {
      posthog?.capture(event, properties);
    },
    [posthog],
  );

  // ---------------------------------------------------------------------------
  // Landing page methods
  // ---------------------------------------------------------------------------

  const trackSectionViewed = useCallback(
    (section: BeatName, beatIndex: number) => {
      track(LANDING_SECTION_VIEWED, { section, beat_index: beatIndex });
    },
    [track],
  );

  const trackSectionTime = useCallback(
    (section: BeatName, beatIndex: number, durationMs: number) => {
      track(LANDING_SECTION_TIME, {
        section,
        beat_index: beatIndex,
        duration_ms: durationMs,
      });
    },
    [track],
  );

  const trackScrollNavigation = useCallback(
    (
      method: string,
      direction: "up" | "down",
      fromBeat: number,
      toBeat: number,
    ) => {
      track(LANDING_SCROLL_NAVIGATION, {
        method,
        direction,
        from_beat: fromBeat,
        to_beat: toBeat,
      });
    },
    [track],
  );

  const trackScrollDepth = useCallback(
    (maxBeat: number, totalBeats: number) => {
      track(LANDING_SCROLL_DEPTH, {
        max_beat: maxBeat,
        total_beats: totalBeats,
        depth_pct: Math.round((maxBeat / (totalBeats - 1)) * 100),
      });
    },
    [track],
  );

  const trackCtaClicked = useCallback(
    (label: string, location: string) => {
      track(LANDING_CTA_CLICKED, { label, location });
    },
    [track],
  );

  const trackFeatureCardHover = useCallback(
    (cardIndex: number, title: string, durationMs: number) => {
      track(LANDING_FEATURE_CARD_HOVER, {
        card_index: cardIndex,
        title,
        duration_ms: durationMs,
      });
    },
    [track],
  );

  const trackMobileMenuToggled = useCallback(
    (isOpen: boolean) => {
      track(LANDING_MOBILE_MENU_TOGGLED, { is_open: isOpen });
    },
    [track],
  );

  const trackNewsletterSubmitted = useCallback(() => {
    track(LANDING_NEWSLETTER_SUBMITTED);
  }, [track]);

  const trackExternalLinkClicked = useCallback(
    (url: string, label: string) => {
      track(LANDING_EXTERNAL_LINK_CLICKED, { url, label });
    },
    [track],
  );

  const trackThemeChanged = useCallback(
    (newTheme: string, previousTheme: string) => {
      track(LANDING_THEME_CHANGED, {
        new_theme: newTheme,
        previous_theme: previousTheme,
      });
    },
    [track],
  );

  const trackPaletteChanged = useCallback(
    (newId: string, previousId: string, source: "manual" | "ab_test") => {
      track(LANDING_PALETTE_CHANGED, {
        new_id: newId,
        previous_id: previousId,
        source,
      });
    },
    [track],
  );

  const trackPaletteOverride = useCallback(
    (newId: string, abAssignedId: string) => {
      track(LANDING_PALETTE_OVERRIDE, {
        new_id: newId,
        ab_assigned_id: abAssignedId,
      });
    },
    [track],
  );

  // ---------------------------------------------------------------------------
  // Dashboard methods
  // ---------------------------------------------------------------------------

  const trackSiteCreated = useCallback(
    (properties: { source: "header" | "empty_state" }) => {
      track(DASHBOARD_SITE_CREATED, properties);
    },
    [track],
  );

  const trackSiteDeleted = useCallback(
    (properties: { site_id: string }) => {
      track(DASHBOARD_SITE_DELETED, properties);
    },
    [track],
  );

  const trackSiteSettingsSaved = useCallback(
    (properties: { site_id: string; fields_changed: string[] }) => {
      track(DASHBOARD_SITE_SETTINGS_SAVED, properties);
    },
    [track],
  );

  const trackSchemaCreated = useCallback(
    (properties: { source: "button" | "import" }) => {
      track(DASHBOARD_SCHEMA_CREATED, properties);
    },
    [track],
  );

  const trackSchemaPublished = useCallback(
    (properties: {
      site_id: string;
      field_count: number;
      field_types: string[];
    }) => {
      track(DASHBOARD_SCHEMA_PUBLISHED, properties);
    },
    [track],
  );

  const trackSchemaDraftSaved = useCallback(
    (properties: {
      site_id?: string;
      field_count?: number;
      is_new?: boolean;
      action?: "discarded";
      source?: "keyboard";
    }) => {
      track(DASHBOARD_SCHEMA_DRAFT_SAVED, properties);
    },
    [track],
  );

  const trackSchemaDeleted = useCallback(
    (properties: { site_id: string }) => {
      track(DASHBOARD_SCHEMA_DELETED, properties);
    },
    [track],
  );

  const trackSchemaImported = useCallback(
    (properties: {
      step: "dialog_opened" | "tab_switched" | "parsed" | "completed";
      tab?: "paste" | "upload";
      schemas_found?: number;
      errors_count?: number;
      warnings_count?: number;
      schemas_added?: number;
      schemas_modified?: number;
    }) => {
      track(DASHBOARD_SCHEMA_IMPORTED, properties);
    },
    [track],
  );

  const trackSchemaExported = useCallback(
    (properties: {
      schema_count?: number;
      export_type: "all" | "single";
      method?: "copy" | "download";
    }) => {
      track(DASHBOARD_SCHEMA_EXPORTED, properties);
    },
    [track],
  );

  const trackFieldAction = useCallback(
    (
      action: "added" | "removed" | "duplicated" | "reordered",
      properties: Record<string, unknown>,
    ) => {
      const eventMap = {
        added: DASHBOARD_FIELD_ADDED,
        removed: DASHBOARD_FIELD_REMOVED,
        duplicated: DASHBOARD_FIELD_DUPLICATED,
        reordered: DASHBOARD_FIELD_REORDERED,
      };
      track(eventMap[action], properties);
    },
    [track],
  );

  const trackApiKeyCopied = useCallback(
    (properties: {
      key_type: "secret" | "publishable" | "preview" | "cli_install";
    }) => {
      track(DASHBOARD_API_KEY_COPIED, properties);
    },
    [track],
  );

  const trackApiKeyRegenerated = useCallback(
    (properties: { key_type: string }) => {
      track(DASHBOARD_API_KEY_REGENERATED, properties);
    },
    [track],
  );

  const trackTabNavigated = useCallback(
    (properties: { tab?: string; target?: string; site_id?: string }) => {
      track(DASHBOARD_TAB_NAVIGATED, properties);
    },
    [track],
  );

  const trackSidebarToggled = useCallback(
    (properties: { is_collapsed: boolean }) => {
      track(DASHBOARD_SIDEBAR_TOGGLED, properties);
    },
    [track],
  );

  const trackSearchPerformed = useCallback(
    (properties: {
      query_length: number;
      results_count: number;
      context: string;
    }) => {
      track(DASHBOARD_SEARCH_PERFORMED, properties);
    },
    [track],
  );

  const trackSortChanged = useCallback(
    (properties: { sort_by: string }) => {
      track(DASHBOARD_SORT_CHANGED, properties);
    },
    [track],
  );

  const trackOnboardingAction = useCallback(
    (action: "completed" | "dismissed") => {
      track(
        action === "completed"
          ? DASHBOARD_ONBOARDING_COMPLETED
          : DASHBOARD_ONBOARDING_DISMISSED,
      );
    },
    [track],
  );

  return useMemo(
    () => ({
      track,
      // Landing
      trackSectionViewed,
      trackSectionTime,
      trackScrollNavigation,
      trackScrollDepth,
      trackCtaClicked,
      trackFeatureCardHover,
      trackMobileMenuToggled,
      trackNewsletterSubmitted,
      trackExternalLinkClicked,
      trackThemeChanged,
      trackPaletteChanged,
      trackPaletteOverride,
      // Dashboard
      trackSiteCreated,
      trackSiteDeleted,
      trackSiteSettingsSaved,
      trackSchemaCreated,
      trackSchemaPublished,
      trackSchemaDraftSaved,
      trackSchemaDeleted,
      trackSchemaImported,
      trackSchemaExported,
      trackFieldAction,
      trackApiKeyCopied,
      trackApiKeyRegenerated,
      trackTabNavigated,
      trackSidebarToggled,
      trackSearchPerformed,
      trackSortChanged,
      trackOnboardingAction,
    }),
    [
      track,
      trackSectionViewed,
      trackSectionTime,
      trackScrollNavigation,
      trackScrollDepth,
      trackCtaClicked,
      trackFeatureCardHover,
      trackMobileMenuToggled,
      trackNewsletterSubmitted,
      trackExternalLinkClicked,
      trackThemeChanged,
      trackPaletteChanged,
      trackPaletteOverride,
      trackSiteCreated,
      trackSiteDeleted,
      trackSiteSettingsSaved,
      trackSchemaCreated,
      trackSchemaPublished,
      trackSchemaDraftSaved,
      trackSchemaDeleted,
      trackSchemaImported,
      trackSchemaExported,
      trackFieldAction,
      trackApiKeyCopied,
      trackApiKeyRegenerated,
      trackTabNavigated,
      trackSidebarToggled,
      trackSearchPerformed,
      trackSortChanged,
      trackOnboardingAction,
    ],
  );
}
