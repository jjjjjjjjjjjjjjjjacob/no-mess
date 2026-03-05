"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef, useState } from "react";
import { Drawer } from "vaul";
import { useAbPalette } from "@/hooks/use-ab-palette";
import { useAnalytics } from "@/hooks/use-analytics";
import { useFavicon } from "@/hooks/use-favicon";
import { useHaptics } from "@/hooks/use-haptics";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  switchThemeWithTransition,
  withViewTransition,
} from "@/lib/view-transition";

// ---------------------------------------------------------------------------
// Palette definitions — CSS class-driven
// ---------------------------------------------------------------------------

type Palette = {
  id: string;
  name: string;
  primary: string; // display swatch color
  accent: string; // display swatch color
};

const PALETTES: Palette[] = [
  {
    id: "oceanic",
    name: "Oceanic",
    primary: "oklch(0.55 0.18 195)",
    accent: "oklch(0.65 0.2 30)",
  },
  {
    id: "electric-blue",
    name: "Electric Blue + Signal Red",
    primary: "oklch(0.55 0.24 260)",
    accent: "oklch(0.57 0.24 25)",
  },
  {
    id: "neon-watermelon",
    name: "Neon Watermelon",
    primary: "oklch(0.72 0.25 145)",
    accent: "oklch(0.62 0.27 340)",
  },
  {
    id: "sunset",
    name: "Sunset Brutalist",
    primary: "oklch(0.62 0.22 50)",
    accent: "oklch(0.8 0.18 85)",
  },
  {
    id: "cyber-mint",
    name: "Cyber Mint",
    primary: "oklch(0.68 0.15 170)",
    accent: "oklch(0.50 0.08 260)",
  },
  {
    id: "midnight-amber",
    name: "Midnight Amber",
    primary: "oklch(0.40 0.12 260)",
    accent: "oklch(0.72 0.14 70)",
  },
  {
    id: "phosphor",
    name: "Phosphor Terminal",
    primary: "oklch(0.65 0.18 150)",
    accent: "oklch(0.72 0.14 80)",
  },
  {
    id: "blood-bone",
    name: "Blood & Bone",
    primary: "oklch(0.50 0.18 20)",
    accent: "oklch(0.85 0.06 90)",
  },
  {
    id: "ultraviolet",
    name: "Ultraviolet",
    primary: "oklch(0.45 0.22 290)",
    accent: "oklch(0.75 0.16 60)",
  },
  {
    id: "sakura",
    name: "Sakura",
    primary: "oklch(0.68 0.18 350)",
    accent: "oklch(0.55 0.12 230)",
  },
  {
    id: "acid-rain",
    name: "Acid Rain",
    primary: "oklch(0.78 0.22 110)",
    accent: "oklch(0.55 0.20 300)",
  },
  {
    id: "rust-steel",
    name: "Rust & Steel",
    primary: "oklch(0.55 0.14 40)",
    accent: "oklch(0.58 0.04 240)",
  },
  {
    id: "tropical",
    name: "Tropical",
    primary: "oklch(0.60 0.20 210)",
    accent: "oklch(0.72 0.22 135)",
  },
];

const ALL_PALETTE_CLASSES = PALETTES.filter((p) => p.id !== "oceanic").map(
  (p) => `palette-${p.id}`,
);

const DEFAULT_PALETTE_ID = "oceanic";

// Legacy URL param IDs → new semantic IDs
const LEGACY_ID_MAP: Record<string, string> = {
  current: "electric-blue",
  a: "neon-watermelon",
  b: "sunset",
  c: "cyber-mint",
  d: "midnight-amber",
  e: "oceanic",
  royal: "cyber-mint",
  "mono-yellow": "midnight-amber",
};

function resolveId(raw: string | null): string {
  if (!raw) return DEFAULT_PALETTE_ID;
  if (LEGACY_ID_MAP[raw]) return LEGACY_ID_MAP[raw];
  if (PALETTES.some((p) => p.id === raw)) return raw;
  return DEFAULT_PALETTE_ID;
}

// ---------------------------------------------------------------------------
// Apply palette via classList
// ---------------------------------------------------------------------------

function applyPalette(id: string): void {
  const el = document.documentElement;
  // Remove all palette classes
  el.classList.remove(...ALL_PALETTE_CLASSES);
  // Add the new one (oceanic = default, no class needed)
  if (id !== DEFAULT_PALETTE_ID) {
    el.classList.add(`palette-${id}`);
  }
}

// ---------------------------------------------------------------------------
// Theme toggle icons
// ---------------------------------------------------------------------------

function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="square"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="square"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getButtonCenter(e: React.MouseEvent) {
  const rect = e.currentTarget.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PaletteSwitcher({
  variant = "default",
}: {
  variant?: "default" | "sidebar";
} = {}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme, theme, setTheme } = useTheme();
  const haptic = useHaptics();
  const analytics = useAnalytics();
  const isMobile = useIsMobile();
  const abPalette = useAbPalette(PALETTES.map((p) => p.id));
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 300);
  }, [cancelClose]);

  const handleMouseEnter = useCallback(() => {
    if (isMobile) return;
    cancelClose();
    setOpen(true);
  }, [cancelClose, isMobile]);

  const handleMouseLeave = useCallback(() => {
    if (isMobile) return;
    scheduleClose();
  }, [scheduleClose, isMobile]);

  // Resolve initial palette from ?palette= → localStorage → default
  const paramPalette = searchParams.get("palette");
  const [activeId, setActiveId] = useState(() => {
    const fromUrl = resolveId(paramPalette);
    if (paramPalette) return fromUrl;
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("palette");
      if (stored) return resolveId(stored);
    }
    return DEFAULT_PALETTE_ID;
  });

  useEffect(() => setMounted(true), []);

  // Clean up hover close timer on unmount
  useEffect(() => () => cancelClose(), [cancelClose]);

  // Apply palette class whenever activeId changes
  useEffect(() => {
    if (!mounted) return;
    applyPalette(activeId);
  }, [activeId, mounted]);

  // Apply A/B assigned palette when it resolves (if no manual override)
  useEffect(() => {
    if (!mounted || abPalette.isLoading || abPalette.isOverridden) return;
    // Don't override URL param or existing localStorage preference
    if (paramPalette) return;
    if (localStorage.getItem("palette")) return;

    applyPalette(abPalette.assignedPalette);
    setActiveId(abPalette.assignedPalette);
  }, [
    mounted,
    abPalette.isLoading,
    abPalette.assignedPalette,
    abPalette.isOverridden,
    paramPalette,
  ]);

  // Dynamic favicon
  useFavicon(activeId, resolvedTheme ?? "light");

  // Sync search param when palette changes (and handle legacy redirects)
  const selectPalette = useCallback(
    (id: string) => {
      setActiveId(id);
      const params = new URLSearchParams(searchParams.toString());
      if (id === DEFAULT_PALETTE_ID) {
        params.delete("palette");
      } else {
        params.set("palette", id);
      }
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  // Handle legacy URL params on mount — silently rewrite old IDs
  useEffect(() => {
    if (!mounted || !paramPalette) return;
    const resolved = resolveId(paramPalette);
    if (resolved !== paramPalette) {
      setActiveId(resolved);
      const params = new URLSearchParams(searchParams.toString());
      if (resolved === DEFAULT_PALETTE_ID) {
        params.delete("palette");
      } else {
        params.set("palette", resolved);
      }
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    }
  }, [mounted, paramPalette, searchParams, router, pathname]);

  // Close panel on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  if (!mounted) return null;

  const active = PALETTES.find((p) => p.id === activeId) ?? PALETTES[0];
  const isDark = resolvedTheme === "dark";

  const isSidebar = variant === "sidebar";

  const handlePaletteClick = (palette: Palette, e: React.MouseEvent) => {
    haptic("select");
    analytics.trackPaletteChanged(palette.id, activeId, "manual");
    const wasOverridden = abPalette.isOverridden;
    abPalette.markOverride(palette.id);
    if (!wasOverridden) {
      analytics.trackPaletteOverride(palette.id, abPalette.assignedPalette);
    }
    const origin = getButtonCenter(e);
    withViewTransition(
      () => {
        applyPalette(palette.id);
        setActiveId(palette.id);
      },
      origin,
      () => {
        selectPalette(palette.id);
        setOpen(false);
      },
    );
  };

  // Shared panel content used in both desktop dropdown and mobile sheet
  const palettePanel = (
    <>
      {/* Theme section */}
      <div
        className={
          isSidebar
            ? "border-b border-border px-3 py-2"
            : "border-b-[3px] border-foreground px-3 py-2"
        }
      >
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Theme
        </span>
      </div>
      <div
        className={
          isSidebar
            ? "flex gap-1 border-b border-border px-3 py-2"
            : "flex gap-1 border-b-[3px] border-foreground px-3 py-2"
        }
      >
        {(["light", "dark", "system"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={(e) => {
              haptic("select");
              analytics.trackThemeChanged(t, theme ?? "system");
              const origin = getButtonCenter(e);
              switchThemeWithTransition(t, setTheme, origin);
            }}
            className={
              isSidebar
                ? `flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium capitalize transition-colors ${
                    theme === t
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/50"
                  }`
                : `flex-1 px-2 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest transition-colors ${
                    theme === t
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:bg-foreground/10"
                  }`
            }
          >
            {t}
          </button>
        ))}
      </div>

      {/* Palette section */}
      <div
        className={
          isSidebar
            ? "border-b border-border px-3 py-2"
            : "border-b-[3px] border-foreground px-3 py-2"
        }
      >
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Palette
        </span>
      </div>
      {PALETTES.map((palette) => (
        <button
          key={palette.id}
          type="button"
          onClick={(e) => handlePaletteClick(palette, e)}
          className={
            isSidebar
              ? `flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-sidebar-accent rounded-sm ${
                  palette.id === activeId ? "bg-sidebar-accent font-medium" : ""
                }`
              : `flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted ${
                  palette.id === activeId ? "bg-muted font-bold" : ""
                }`
          }
        >
          <span
            className={`h-3.5 w-3.5 shrink-0 ${isSidebar ? "rounded-sm" : "border border-foreground"}`}
            style={{ background: palette.primary }}
          />
          <span
            className={`h-3.5 w-3.5 shrink-0 ${isSidebar ? "rounded-sm" : "border border-foreground"}`}
            style={{ background: palette.accent }}
          />
          <span
            className={
              isSidebar
                ? "flex-1 text-xs"
                : "flex-1 font-mono text-xs uppercase tracking-wide"
            }
          >
            {palette.name}
          </span>
          {palette.id === activeId &&
            (isSidebar ? (
              <span className="text-[10px] text-primary">&#10003;</span>
            ) : (
              <span className="font-mono text-[10px] text-primary">[ON]</span>
            ))}
        </button>
      ))}
    </>
  );

  const themeIcon = (
    <span className="relative h-4 w-4 shrink-0">
      <SunIcon
        className={`absolute inset-0 h-4 w-4 transition-all duration-300 ${
          isDark
            ? "rotate-90 scale-0 opacity-0"
            : "rotate-0 scale-100 opacity-100"
        }`}
      />
      <MoonIcon
        className={`absolute inset-0 h-4 w-4 transition-all duration-300 ${
          isDark
            ? "rotate-0 scale-100 opacity-100"
            : "-rotate-90 scale-0 opacity-0"
        }`}
      />
    </span>
  );

  const triggerButton =
    variant === "sidebar" ? (
      <button
        type="button"
        onClick={() => {
          haptic("tap");
          setOpen((v) => !v);
        }}
        className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-0"
      >
        {themeIcon}
        <span
          className="h-3 w-3 rounded-sm group-data-[collapsible=icon]:hidden"
          style={{ background: active.primary }}
        />
        <span
          className="h-3 w-3 rounded-sm group-data-[collapsible=icon]:hidden"
          style={{ background: active.accent }}
        />
        <span className="truncate text-xs text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
          {active.name}
        </span>
      </button>
    ) : (
      <button
        type="button"
        onClick={() => {
          haptic("tap");
          setOpen((v) => !v);
        }}
        className="flex h-9 items-center gap-2 border-[3px] border-foreground bg-background px-2 font-mono text-xs font-bold uppercase tracking-wider transition-colors hover:bg-muted"
      >
        {themeIcon}
        <span
          className="h-3 w-3 border border-foreground"
          style={{ background: active.primary }}
        />
        <span
          className="h-3 w-3 border border-foreground"
          style={{ background: active.accent }}
        />
        <span className="hidden lg:inline">{active.name}</span>
      </button>
    );

  // Mobile: Vaul drawer with scale effect
  // When inside the sidebar drawer (variant="sidebar"), use NestedRoot so Vaul
  // handles 2-level nesting: sidebar scales page (L1), palette scales sidebar (L2).
  if (isMobile) {
    const DrawerRoot = isSidebar ? Drawer.NestedRoot : Drawer.Root;
    const drawerRootProps = isSidebar
      ? { open, onOpenChange: setOpen }
      : { open, onOpenChange: setOpen, shouldScaleBackground: true as const };

    return (
      <>
        {triggerButton}
        <DrawerRoot {...drawerRootProps}>
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
            <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 rounded-t-xl bg-background border-t border-foreground/10 outline-none">
              <div className="mx-auto mt-3 mb-2 h-1 w-10 rounded-full bg-muted-foreground/30" />
              <Drawer.Title className="sr-only">Theme & Palette</Drawer.Title>
              <Drawer.Description className="sr-only">
                Choose a theme and color palette.
              </Drawer.Description>
              <div className="pb-safe max-h-[80svh] overflow-y-auto">
                {palettePanel}
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </DrawerRoot>
      </>
    );
  }

  // Desktop: hover dropdown
  return (
    <div
      ref={panelRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {triggerButton}

      {/* Dropdown panel — always rendered, animated via CSS */}
      <div
        className={`absolute z-[60] w-72 max-h-[calc(100svh-8rem)] overflow-y-auto transition-all duration-200 ease-out ${
          isSidebar
            ? "bottom-full left-0 mb-2 origin-bottom-left rounded-lg border border-border bg-popover shadow-md"
            : "top-full right-0 mt-2 origin-top-right border-[3px] border-foreground bg-background shadow-brutal-lg"
        } ${
          open
            ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
            : isSidebar
              ? "opacity-0 translate-y-2 scale-95 pointer-events-none"
              : "opacity-0 -translate-y-2 scale-95 pointer-events-none"
        }`}
      >
        {palettePanel}
      </div>
    </div>
  );
}
