"use client";

import { useRouter } from "next/navigation";
import { authClient } from "../../infra/auth/auth-client";

export function SignOutButton() {
  const router = useRouter();

  const handleSignOut = () => {
    void authClient.signOut().finally(() => {
      router.push("/sign-in");
    });
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="rounded border border-[color:var(--border-soft)] bg-[var(--surface-1)] px-3 py-1.5 text-sm font-medium text-[color:var(--app-muted)] hover:bg-[var(--surface-2)]"
    >
      Sign out
    </button>
  );
}
