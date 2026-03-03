"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFavicon } from "@/hooks/use-favicon";
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

export function PaletteSwitcher() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme, theme, setTheme } = useTheme();
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
    cancelClose();
    setOpen(true);
  }, [cancelClose]);

  const handleMouseLeave = useCallback(() => {
    scheduleClose();
  }, [scheduleClose]);

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

  // Dynamic favicon
  useFavicon(activeId, resolvedTheme ?? "light");

  // Persist to localStorage
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("palette", activeId);
  }, [activeId, mounted]);

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

  return (
    <div
      ref={panelRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Toggle button — sun/moon icon + palette swatches + name */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-2 border-[3px] border-foreground bg-background px-2 font-mono text-xs font-bold uppercase tracking-wider transition-colors hover:bg-muted"
      >
        {/* Sun/Moon icon */}
        <span className="relative h-4 w-4 shrink-0">
          <SunIcon
            className={`absolute inset-0 h-4 w-4 transition-all duration-300 ${
              isDark
                ? "rotate-0 scale-100 opacity-100"
                : "rotate-90 scale-0 opacity-0"
            }`}
          />
          <MoonIcon
            className={`absolute inset-0 h-4 w-4 transition-all duration-300 ${
              isDark
                ? "-rotate-90 scale-0 opacity-0"
                : "rotate-0 scale-100 opacity-100"
            }`}
          />
        </span>
        {/* Palette swatches */}
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

      {/* Dropdown panel — always rendered, animated via CSS */}
      <div
        className={`absolute top-full right-0 z-[60] mt-2 w-72 border-[3px] border-foreground bg-background shadow-brutal-lg transition-all duration-200 ease-out origin-top-right ${
          open
            ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
            : "opacity-0 -translate-y-2 scale-95 pointer-events-none"
        }`}
      >
        {/* Theme section */}
        <div className="border-b-[3px] border-foreground px-3 py-2">
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Theme
          </span>
        </div>
        <div className="flex gap-1 border-b-[3px] border-foreground px-3 py-2">
          {(["light", "dark", "system"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={(e) => {
                const origin = getButtonCenter(e);
                switchThemeWithTransition(t, setTheme, origin);
              }}
              className={`flex-1 px-2 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest transition-colors ${
                theme === t
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-foreground/10"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Palette section */}
        <div className="border-b-[3px] border-foreground px-3 py-2">
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Palette
          </span>
        </div>
        {PALETTES.map((palette) => (
          <button
            key={palette.id}
            type="button"
            onClick={(e) => {
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
            }}
            className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted ${
              palette.id === activeId ? "bg-muted font-bold" : ""
            }`}
          >
            <span
              className="h-4 w-4 shrink-0 border border-foreground"
              style={{ background: palette.primary }}
            />
            <span
              className="h-4 w-4 shrink-0 border border-foreground"
              style={{ background: palette.accent }}
            />
            <span className="flex-1 font-mono text-xs uppercase tracking-wide">
              {palette.name}
            </span>
            {palette.id === activeId && (
              <span className="font-mono text-[10px] text-primary">[ON]</span>
            )}
          </button>
        ))}
        <div className="border-t-[3px] border-foreground px-3 py-2">
          <span className="font-mono text-[10px] text-muted-foreground">
            {`?palette=${activeId}`}
          </span>
        </div>
      </div>
    </div>
  );
}
