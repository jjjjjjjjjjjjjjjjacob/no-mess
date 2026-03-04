"use client";

import * as Clerk from "@clerk/elements/common";
import * as SignUp from "@clerk/elements/sign-up";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthOtpInput } from "@/components/auth/auth-otp-input";
import { AuthSocialButton } from "@/components/auth/auth-social-button";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";

export default function SignUpPage() {
  return (
    <SignUp.Root>
      <Clerk.GlobalError className="mb-4 border-[3px] border-destructive bg-destructive/10 px-4 py-3 font-mono text-sm text-destructive" />

      {/* ── Start step ── */}
      <SignUp.Step name="start">
        <AuthCard
          title="CREATE ACCOUNT"
          footer={
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/sign-in"
                className="border-b-[3px] border-primary font-display text-sm text-foreground transition-colors hover:text-primary"
              >
                SIGN IN
              </Link>
            </p>
          }
        >
          <AuthSocialButton />
          <AuthDivider />

          <div className="space-y-4">
            <Clerk.Field name="emailAddress">
              <Clerk.Label className="mb-1.5 block font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
                EMAIL
              </Clerk.Label>
              <Clerk.Input
                className="w-full border-[3px] border-foreground bg-background px-4 py-3 font-mono text-sm outline-none transition-shadow focus:border-primary focus:shadow-brutal"
                placeholder="you@example.com"
              />
              <Clerk.FieldError className="mt-1 font-mono text-xs text-destructive" />
            </Clerk.Field>

            <Clerk.Field name="password">
              <Clerk.Label className="mb-1.5 block font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
                PASSWORD
              </Clerk.Label>
              <Clerk.Input
                type="password"
                validatePassword
                className="w-full border-[3px] border-foreground bg-background px-4 py-3 font-mono text-sm outline-none transition-shadow focus:border-primary focus:shadow-brutal"
              />
              <Clerk.FieldError className="mt-1 font-mono text-xs text-destructive" />
              <Clerk.FieldState>
                {({ state }) => (
                  <div className="mt-2 h-1.5 w-full bg-foreground/10">
                    <div
                      className={`h-full transition-all duration-300 ${
                        state === "success"
                          ? "w-full bg-primary"
                          : state === "warning"
                            ? "w-2/3 bg-accent"
                            : state === "error"
                              ? "w-1/3 bg-destructive"
                              : "w-0"
                      }`}
                    />
                  </div>
                )}
              </Clerk.FieldState>
            </Clerk.Field>

            <div id="clerk-captcha" />

            <SignUp.Action submit asChild>
              <AuthSubmitButton>SIGN UP</AuthSubmitButton>
            </SignUp.Action>
          </div>
        </AuthCard>
      </SignUp.Step>

      {/* ── Continue step (missing fields after OAuth) ── */}
      <SignUp.Step name="continue">
        <AuthCard title="ALMOST THERE">
          <div className="space-y-4">
            <p className="font-mono text-sm text-muted-foreground">
              Please fill in the remaining details.
            </p>

            <Clerk.Field name="username">
              <Clerk.Label className="mb-1.5 block font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
                USERNAME
              </Clerk.Label>
              <Clerk.Input className="w-full border-[3px] border-foreground bg-background px-4 py-3 font-mono text-sm outline-none transition-shadow focus:border-primary focus:shadow-brutal" />
              <Clerk.FieldError className="mt-1 font-mono text-xs text-destructive" />
            </Clerk.Field>

            <SignUp.Action submit asChild>
              <AuthSubmitButton>CONTINUE</AuthSubmitButton>
            </SignUp.Action>
          </div>
        </AuthCard>
      </SignUp.Step>

      {/* ── Verifications step ── */}
      <SignUp.Step name="verifications">
        <SignUp.Strategy name="email_code">
          <AuthCard title="VERIFY EMAIL">
            <div className="space-y-4">
              <p className="text-center font-mono text-sm text-muted-foreground">
                We sent a verification code to your email.
              </p>

              <Clerk.Field name="code">
                <AuthOtpInput />
                <Clerk.FieldError className="mt-2 text-center font-mono text-xs text-destructive" />
              </Clerk.Field>

              <SignUp.Action submit asChild>
                <AuthSubmitButton>VERIFY</AuthSubmitButton>
              </SignUp.Action>

              <SignUp.Action
                resend
                asChild
                fallback={({ resendableAfter }) => (
                  <p className="text-center font-mono text-xs text-muted-foreground">
                    Resend code in {resendableAfter}s
                  </p>
                )}
              >
                <button
                  type="button"
                  className="w-full text-center font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
                >
                  RESEND CODE
                </button>
              </SignUp.Action>
            </div>
          </AuthCard>
        </SignUp.Strategy>
      </SignUp.Step>
    </SignUp.Root>
  );
}
