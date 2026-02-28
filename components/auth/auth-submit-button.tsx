"use client";

import * as Clerk from "@clerk/elements/common";

export function AuthSubmitButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="flex w-full items-center justify-center gap-2 border-[5px] border-foreground bg-primary px-4 py-3 font-display text-sm tracking-wide text-primary-foreground shadow-brutal transition-all hover:-translate-y-1 hover:shadow-brutal-lg active:translate-y-0 active:shadow-none disabled:pointer-events-none disabled:opacity-50"
    >
      <Clerk.Loading>
        {(isLoading) =>
          isLoading ? (
            <span className="inline-block h-5 w-5 animate-spin border-[3px] border-primary-foreground border-t-transparent" />
          ) : (
            children
          )
        }
      </Clerk.Loading>
    </button>
  );
}
