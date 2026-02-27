"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { authClient } from "../../../infra/auth/auth-client";

function SignInForm() {
  const searchParams = useSearchParams();
  const rawCallback = searchParams.get("callbackUrl");
  const callbackUrl =
    rawCallback?.startsWith("/") && !rawCallback.startsWith("//")
      ? rawCallback
      : "/editor";

  const handleGoogleSignIn = () => {
    void authClient.signIn.social({
      provider: "google",
      callbackURL: callbackUrl,
    });
  };

  const handleGithubSignIn = () => {
    void authClient.signIn.social({
      provider: "github",
      callbackURL: callbackUrl,
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] px-4">
      <div className="w-full max-w-sm rounded-lg border border-[color:var(--border-soft)] bg-[var(--surface-1)] p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-[var(--app-fg)]">Sign in</h1>
        <p className="mt-1 text-sm text-[color:var(--app-muted)]">Continue to the editor.</p>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full rounded border border-[color:var(--accent)] bg-[color:var(--accent)] px-4 py-2 text-sm font-medium text-[#1c130b] hover:bg-[color:var(--accent-strong)]"
          >
            Continue with Google
          </button>
          <button
            type="button"
            onClick={handleGithubSignIn}
            className="w-full rounded border border-[color:var(--border-soft)] bg-[var(--surface-2)] px-4 py-2 text-sm font-medium text-[var(--app-fg)] hover:bg-[var(--surface-3)]"
          >
            Continue with GitHub
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
