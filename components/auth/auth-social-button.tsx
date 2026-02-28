"use client";

import * as Clerk from "@clerk/elements/common";

export function AuthSocialButton() {
  return (
    <Clerk.Connection name="google" asChild>
      <button
        type="button"
        className="group flex w-full items-center justify-center gap-3 border-[5px] border-foreground bg-background px-4 py-3 font-display text-sm tracking-wide shadow-brutal transition-all hover:-translate-y-1 hover:shadow-brutal-lg active:translate-y-0 active:shadow-none"
      >
        <Clerk.Loading scope="provider:google">
          {(isLoading) =>
            isLoading ? (
              <span className="inline-block h-5 w-5 animate-spin border-[3px] border-foreground border-t-transparent" />
            ) : (
              <>
                <Clerk.Icon className="h-5 w-5" />
                <span>CONTINUE WITH GOOGLE</span>
              </>
            )
          }
        </Clerk.Loading>
      </button>
    </Clerk.Connection>
  );
}
