// ---------------------------------------------------------------------------
// Analytics event name constants — single source of truth
// ---------------------------------------------------------------------------

// Landing page events
export const LANDING_SECTION_VIEWED = "landing_section_viewed";
export const LANDING_SECTION_TIME = "landing_section_time";
export const LANDING_SCROLL_NAVIGATION = "landing_scroll_navigation";
export const LANDING_SCROLL_DEPTH = "landing_scroll_depth";
export const LANDING_CTA_CLICKED = "landing_cta_clicked";
export const LANDING_FEATURE_CARD_HOVER = "landing_feature_card_hover";
export const LANDING_MOBILE_MENU_TOGGLED = "landing_mobile_menu_toggled";
export const LANDING_NEWSLETTER_SUBMITTED = "landing_newsletter_submitted";
export const LANDING_EXTERNAL_LINK_CLICKED = "landing_external_link_clicked";
export const LANDING_THEME_CHANGED = "landing_theme_changed";
export const LANDING_PALETTE_CHANGED = "landing_palette_changed";
export const LANDING_PALETTE_OVERRIDE = "landing_palette_override";
export const LANDING_AB_PALETTE_ASSIGNED = "landing_ab_palette_assigned";

// Dashboard events
export const DASHBOARD_SITE_CREATED = "dashboard_site_created";
export const DASHBOARD_SITE_DELETED = "dashboard_site_deleted";
export const DASHBOARD_SITE_SETTINGS_SAVED = "dashboard_site_settings_saved";
export const DASHBOARD_SCHEMA_CREATED = "dashboard_schema_created";
export const DASHBOARD_SCHEMA_PUBLISHED = "dashboard_schema_published";
export const DASHBOARD_SCHEMA_DRAFT_SAVED = "dashboard_schema_draft_saved";
export const DASHBOARD_SCHEMA_DELETED = "dashboard_schema_deleted";
export const DASHBOARD_SCHEMA_IMPORTED = "dashboard_schema_imported";
export const DASHBOARD_SCHEMA_EXPORTED = "dashboard_schema_exported";
export const DASHBOARD_FIELD_ADDED = "dashboard_field_added";
export const DASHBOARD_FIELD_REMOVED = "dashboard_field_removed";
export const DASHBOARD_FIELD_DUPLICATED = "dashboard_field_duplicated";
export const DASHBOARD_FIELD_REORDERED = "dashboard_field_reordered";
export const DASHBOARD_API_KEY_COPIED = "dashboard_api_key_copied";
export const DASHBOARD_API_KEY_REGENERATED = "dashboard_api_key_regenerated";
export const DASHBOARD_TAB_NAVIGATED = "dashboard_tab_navigated";
export const DASHBOARD_SIDEBAR_TOGGLED = "dashboard_sidebar_toggled";
export const DASHBOARD_SEARCH_PERFORMED = "dashboard_search_performed";
export const DASHBOARD_SORT_CHANGED = "dashboard_sort_changed";
export const DASHBOARD_ONBOARDING_COMPLETED = "dashboard_onboarding_completed";
export const DASHBOARD_ONBOARDING_DISMISSED = "dashboard_onboarding_dismissed";

// Beat names — maps beat index to semantic section name
export const BEAT_NAMES = [
  "hero",
  "features_beat_1",
  "features_beat_2",
  "how_it_works_header",
  "how_it_works_step_1",
  "how_it_works_step_2",
  "how_it_works_step_3",
  "cta",
  "footer",
] as const;

export type BeatName = (typeof BEAT_NAMES)[number];
