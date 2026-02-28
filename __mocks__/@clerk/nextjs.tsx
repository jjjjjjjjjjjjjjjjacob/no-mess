import type { ReactNode } from "react";
import { vi } from "vitest";

export const ClerkProvider = ({ children }: { children: ReactNode }) => (
  <>{children}</>
);

export const SignInButton = ({ children }: { children?: ReactNode }) => (
  <>{children ?? <button type="button">Sign In</button>}</>
);

export const SignUpButton = ({ children }: { children?: ReactNode }) => (
  <>{children ?? <button type="button">Sign Up</button>}</>
);

export const UserButton = () => <div data-testid="user-button" />;

export const useUser = vi.fn().mockReturnValue({
  isSignedIn: false,
  isLoaded: true,
  user: null,
});

export const useAuth = vi.fn().mockReturnValue({
  isSignedIn: false,
  isLoaded: true,
  userId: null,
  getToken: vi.fn().mockResolvedValue(null),
});

export const SignIn = () => <div data-testid="clerk-sign-in" />;
export const SignUp = () => <div data-testid="clerk-sign-up" />;

export const SignedIn = ({ children }: { children: ReactNode }) => (
  <>{children}</>
);
export const SignedOut = ({ children }: { children: ReactNode }) => (
  <>{children}</>
);
