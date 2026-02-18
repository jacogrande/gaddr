"use client";

import Link from "next/link";
import { useState } from "react";
import { SignOutButton } from "./sign-out-button";

type Props = {
  name: string;
  image: string | null | undefined;
  initials: string;
};

export function MobileNav({ name, image, initials }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => { setOpen(!open); }}
        aria-label={open ? "Close menu" : "Open menu"}
        className="flex h-8 w-8 items-center justify-center text-stone-600"
      >
        {open ? (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {open && (
        <>
          {/* Overlay */}
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => { setOpen(false); }}
            aria-label="Close menu"
          />

          {/* Panel */}
          <div className="fixed top-[57px] right-0 z-50 w-64 border-l border-stone-200 bg-white shadow-lg">
            <div className="flex flex-col p-4">
              {/* User info */}
              <div className="mb-4 flex items-center gap-3 border-b border-stone-100 pb-4">
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={image}
                    alt={name}
                    className="h-8 w-8 rounded-full ring-2 ring-stone-200"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-xs font-semibold text-stone-600 ring-2 ring-stone-200">
                    {initials}
                  </div>
                )}
                <span className="text-sm font-medium text-stone-900">{name}</span>
              </div>

              {/* Nav links */}
              <Link
                href="/dashboard"
                onClick={() => { setOpen(false); }}
                className="rounded px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900"
              >
                Dashboard
              </Link>
              <Link
                href="/library"
                onClick={() => { setOpen(false); }}
                className="rounded px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900"
              >
                Library
              </Link>

              {/* Sign out */}
              <div className="mt-4 border-t border-stone-100 pt-4">
                <SignOutButton />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
