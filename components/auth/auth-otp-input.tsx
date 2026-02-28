"use client";

import * as Clerk from "@clerk/elements/common";
import { cn } from "@/lib/utils";

export function AuthOtpInput() {
  return (
    <Clerk.Input
      type="otp"
      autoSubmit
      render={({ value, status }) => (
        <div className="flex justify-center gap-2">
          {value.split("").map((char, i) => (
            <div
              key={`otp-${String(i)}`}
              className={cn(
                "flex h-12 w-10 items-center justify-center border-[3px] border-foreground bg-background font-mono text-lg font-bold sm:h-14 sm:w-12",
                status === "cursor" &&
                  i === value.length - 1 &&
                  "border-primary shadow-brutal",
                status === "selected" && "border-primary shadow-brutal",
              )}
            >
              {char}
            </div>
          ))}
          {/* Remaining empty cells */}
          {Array.from({ length: 6 - value.length }).map((_, i) => (
            <div
              key={`otp-empty-${String(i)}`}
              className={cn(
                "flex h-12 w-10 items-center justify-center border-[3px] border-foreground bg-background font-mono text-lg font-bold sm:h-14 sm:w-12",
                status === "cursor" &&
                  i === 0 &&
                  "border-primary shadow-brutal",
              )}
            />
          ))}
        </div>
      )}
    />
  );
}
