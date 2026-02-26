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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-lg border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">Sign in</h1>
        <p className="mt-1 text-sm text-gray-600">Continue to the editor.</p>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Continue with Google
          </button>
          <button
            type="button"
            onClick={handleGithubSignIn}
            className="w-full rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
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
