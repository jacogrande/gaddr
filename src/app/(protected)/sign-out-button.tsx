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
      className="rounded-full border-2 border-black bg-white px-4 py-1.5 text-sm font-medium text-black shadow-[2px_2px_0_0_#000] transition-transform hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_#000]"
    >
      Sign out
    </button>
  );
}
