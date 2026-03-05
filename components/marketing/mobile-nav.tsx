"use client";

import Link from "next/link";
import { useState } from "react";
import { useAnalytics } from "@/hooks/use-analytics";
import { useHaptics } from "@/hooks/use-haptics";

export function MobileNav({ isSignedIn }: { isSignedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const haptic = useHaptics();
  const analytics = useAnalytics();

  return (
    <>
      {/* Mobile controls — visible below md */}
      <div className="flex items-center gap-2 md:hidden">
        <button
          type="button"
          onClick={() => {
            haptic("tap");
            const nextOpen = !open;
            setOpen(nextOpen);
            analytics.trackMobileMenuToggled(nextOpen);
          }}
          className="flex h-11 w-11 items-center justify-center border-[3px] border-foreground bg-background transition-colors hover:bg-primary hover:border-primary group"
          aria-label="Toggle menu"
        >
          <div className="flex flex-col gap-[5px]">
            <span
              className={`block h-[3px] w-4 bg-foreground transition-all duration-200 group-hover:bg-primary-foreground ${
                open ? "translate-y-[8px] rotate-45" : ""
              }`}
            />
            <span
              className={`block h-[3px] w-4 bg-foreground transition-all duration-200 group-hover:bg-primary-foreground ${
                open ? "opacity-0" : ""
              }`}
            />
            <span
              className={`block h-[3px] w-4 bg-foreground transition-all duration-200 group-hover:bg-primary-foreground ${
                open ? "-translate-y-[8px] -rotate-45" : ""
              }`}
            />
          </div>
        </button>
      </div>

      {/* Mobile menu panel */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 border-b-[5px] border-foreground bg-background md:hidden">
          <div className="flex flex-col gap-0">
            <Link
              href="/docs"
              onClick={() => {
                haptic("tap");
                analytics.trackCtaClicked("DOCS", "navbar");
                setOpen(false);
              }}
              className="border-b-[3px] border-foreground/10 px-6 py-4 font-mono text-xs font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              DOCS
            </Link>
            {isSignedIn ? (
              <Link
                href="/dashboard"
                onClick={() => {
                  haptic("tap");
                  analytics.trackCtaClicked("DASHBOARD", "navbar");
                  setOpen(false);
                }}
                className="bg-primary px-6 py-4 font-display text-sm text-primary-foreground"
              >
                DASHBOARD →
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  onClick={() => {
                    haptic("tap");
                    analytics.trackCtaClicked("SIGN_IN", "navbar");
                    setOpen(false);
                  }}
                  className="border-b-[3px] border-foreground/10 px-6 py-4 font-mono text-xs font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  SIGN IN
                </Link>
                <Link
                  href="/sign-up"
                  onClick={() => {
                    haptic("tap");
                    analytics.trackCtaClicked("GET_STARTED", "navbar");
                    setOpen(false);
                  }}
                  className="bg-accent px-6 py-4 font-display text-sm text-accent-foreground"
                >
                  GET STARTED →
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
