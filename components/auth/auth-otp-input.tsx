"use client";

import * as Clerk from "@clerk/elements/common";
import { cn } from "@/lib/utils";

export function AuthOtpInput() {
  return (
    <div className="flex justify-center">
      <Clerk.Input
        type="otp"
        autoSubmit
        className="flex gap-2"
        render={({ value, status }) => (
          <div
            className={cn(
              "flex h-12 w-10 items-center justify-center border-[3px] border-foreground bg-background font-mono text-lg font-bold sm:h-14 sm:w-12",
              status === "cursor" && "border-primary shadow-brutal",
              status === "selected" && "border-primary shadow-brutal",
            )}
          >
            {value}
          </div>
        )}
      />
    </div>
  );
}
