"use client";

import { useRouter } from "next/navigation";
import { authClient } from "../../infra/auth/auth-client";

export function SignOutButton() {
  const router = useRouter();

  const handleSignOut = () => {
    void authClient.signOut().then(
      () => {
        router.push("/sign-in");
      },
      () => {
        router.push("/sign-in");
      },
    );
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="rounded-full border border-stone-200 bg-white px-4 py-1.5 text-sm font-medium text-stone-600 transition-all duration-200 hover:border-stone-300 hover:text-stone-900 hover:shadow-[2px_2px_0px_#2C2416]"
    >
      Sign out
    </button>
  );
}
