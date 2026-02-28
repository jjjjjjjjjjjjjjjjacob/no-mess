"use client";

import * as Clerk from "@clerk/elements/common";
import * as SignIn from "@clerk/elements/sign-in";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthOtpInput } from "@/components/auth/auth-otp-input";
import { AuthSocialButton } from "@/components/auth/auth-social-button";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";

export default function SignInPage() {
  return (
    <SignIn.Root>
      <Clerk.GlobalError className="mb-4 border-[3px] border-destructive bg-destructive/10 px-4 py-3 font-mono text-sm text-destructive" />

      {/* ── Start step ── */}
      <SignIn.Step name="start">
        <AuthCard
          title="SIGN IN"
          footer={
            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link
                href="/sign-up"
                className="border-b-[3px] border-primary font-display text-sm text-foreground transition-colors hover:text-primary"
              >
                SIGN UP
              </Link>
            </p>
          }
        >
          <AuthSocialButton />
          <AuthDivider />

          <div className="space-y-4">
            <Clerk.Field name="identifier">
              <Clerk.Label className="mb-1.5 block font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
                EMAIL
              </Clerk.Label>
              <Clerk.Input
                className="w-full border-[3px] border-foreground bg-background px-4 py-3 font-mono text-sm outline-none transition-shadow focus:border-primary focus:shadow-brutal"
                placeholder="you@example.com"
              />
              <Clerk.FieldError className="mt-1 font-mono text-xs text-destructive" />
            </Clerk.Field>

            <SignIn.Action submit asChild>
              <AuthSubmitButton>CONTINUE</AuthSubmitButton>
            </SignIn.Action>
          </div>
        </AuthCard>
      </SignIn.Step>

      {/* ── Verifications step ── */}
      <SignIn.Step name="verifications">
        {/* Password strategy */}
        <SignIn.Strategy name="password">
          <AuthCard
            title="PASSWORD"
            footer={
              <p className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link
                  href="/sign-up"
                  className="border-b-[3px] border-primary font-display text-sm text-foreground transition-colors hover:text-primary"
                >
                  SIGN UP
                </Link>
              </p>
            }
          >
            <div className="space-y-4">
              <Clerk.Field name="password">
                <Clerk.Label className="mb-1.5 block font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  PASSWORD
                </Clerk.Label>
                <Clerk.Input
                  type="password"
                  className="w-full border-[3px] border-foreground bg-background px-4 py-3 font-mono text-sm outline-none transition-shadow focus:border-primary focus:shadow-brutal"
                />
                <Clerk.FieldError className="mt-1 font-mono text-xs text-destructive" />
              </Clerk.Field>

              <SignIn.Action submit asChild>
                <AuthSubmitButton>SIGN IN</AuthSubmitButton>
              </SignIn.Action>

              <div className="flex items-center justify-between">
                <SignIn.Action navigate="forgot-password" asChild>
                  <button
                    type="button"
                    className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
                  >
                    FORGOT PASSWORD?
                  </button>
                </SignIn.Action>

                <SignIn.Action navigate="choose-strategy" asChild>
                  <button
                    type="button"
                    className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
                  >
                    OTHER METHODS
                  </button>
                </SignIn.Action>
              </div>
            </div>
          </AuthCard>
        </SignIn.Strategy>

        {/* Email code strategy */}
        <SignIn.Strategy name="email_code">
          <AuthCard title="CHECK YOUR EMAIL">
            <div className="space-y-4">
              <p className="text-center font-mono text-sm text-muted-foreground">
                We sent a verification code to your email.
              </p>

              <Clerk.Field name="code">
                <AuthOtpInput />
                <Clerk.FieldError className="mt-2 text-center font-mono text-xs text-destructive" />
              </Clerk.Field>

              <SignIn.Action submit asChild>
                <AuthSubmitButton>VERIFY</AuthSubmitButton>
              </SignIn.Action>

              <SignIn.Action
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
              </SignIn.Action>
            </div>
          </AuthCard>
        </SignIn.Strategy>

        {/* Password reset email code strategy */}
        <SignIn.Strategy name="reset_password_email_code">
          <AuthCard title="RESET PASSWORD">
            <div className="space-y-4">
              <p className="text-center font-mono text-sm text-muted-foreground">
                We sent a verification code to your email.
              </p>

              <Clerk.Field name="code">
                <AuthOtpInput />
                <Clerk.FieldError className="mt-2 text-center font-mono text-xs text-destructive" />
              </Clerk.Field>

              <SignIn.Action submit asChild>
                <AuthSubmitButton>VERIFY</AuthSubmitButton>
              </SignIn.Action>

              <SignIn.Action
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
              </SignIn.Action>
            </div>
          </AuthCard>
        </SignIn.Strategy>
      </SignIn.Step>

      {/* ── Forgot password step ── */}
      <SignIn.Step name="forgot-password">
        <AuthCard title="FORGOT PASSWORD">
          <div className="space-y-4">
            <p className="font-mono text-sm text-muted-foreground">
              We&apos;ll send you a code to reset your password.
            </p>

            <SignIn.SupportedStrategy name="reset_password_email_code" asChild>
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 border-[5px] border-foreground bg-primary px-4 py-3 font-display text-sm tracking-wide text-primary-foreground shadow-brutal transition-all hover:-translate-y-1 hover:shadow-brutal-lg active:translate-y-0 active:shadow-none"
              >
                SEND RESET CODE
              </button>
            </SignIn.SupportedStrategy>

            <SignIn.Action navigate="previous" asChild>
              <button
                type="button"
                className="w-full text-center font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
              >
                &larr; GO BACK
              </button>
            </SignIn.Action>
          </div>
        </AuthCard>
      </SignIn.Step>

      {/* ── Reset password step ── */}
      <SignIn.Step name="reset-password">
        <AuthCard title="NEW PASSWORD">
          <div className="space-y-4">
            <Clerk.Field name="password">
              <Clerk.Label className="mb-1.5 block font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
                NEW PASSWORD
              </Clerk.Label>
              <Clerk.Input
                type="password"
                className="w-full border-[3px] border-foreground bg-background px-4 py-3 font-mono text-sm outline-none transition-shadow focus:border-primary focus:shadow-brutal"
              />
              <Clerk.FieldError className="mt-1 font-mono text-xs text-destructive" />
            </Clerk.Field>

            <Clerk.Field name="confirmPassword">
              <Clerk.Label className="mb-1.5 block font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
                CONFIRM PASSWORD
              </Clerk.Label>
              <Clerk.Input
                type="password"
                className="w-full border-[3px] border-foreground bg-background px-4 py-3 font-mono text-sm outline-none transition-shadow focus:border-primary focus:shadow-brutal"
              />
              <Clerk.FieldError className="mt-1 font-mono text-xs text-destructive" />
            </Clerk.Field>

            <SignIn.Action submit asChild>
              <AuthSubmitButton>RESET PASSWORD</AuthSubmitButton>
            </SignIn.Action>
          </div>
        </AuthCard>
      </SignIn.Step>

      {/* ── Choose strategy step ── */}
      <SignIn.Step name="choose-strategy">
        <AuthCard title="OTHER METHODS">
          <div className="space-y-3">
            <SignIn.SupportedStrategy name="email_code" asChild>
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 border-[3px] border-foreground bg-background px-4 py-3 font-mono text-xs font-bold uppercase tracking-widest transition-all hover:-translate-y-0.5 hover:shadow-brutal active:translate-y-0 active:shadow-none"
              >
                EMAIL CODE
              </button>
            </SignIn.SupportedStrategy>

            <SignIn.SupportedStrategy name="password" asChild>
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 border-[3px] border-foreground bg-background px-4 py-3 font-mono text-xs font-bold uppercase tracking-widest transition-all hover:-translate-y-0.5 hover:shadow-brutal active:translate-y-0 active:shadow-none"
              >
                PASSWORD
              </button>
            </SignIn.SupportedStrategy>

            <SignIn.Action navigate="previous" asChild>
              <button
                type="button"
                className="w-full text-center font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
              >
                &larr; GO BACK
              </button>
            </SignIn.Action>
          </div>
        </AuthCard>
      </SignIn.Step>
    </SignIn.Root>
  );
}
