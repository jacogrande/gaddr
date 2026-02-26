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
      className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
    >
      Sign out
    </button>
  );
}
