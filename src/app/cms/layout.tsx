import { AuthGate } from "./AuthGate";
import * as React from "react";

export default function CmsLayout({ children }: { children: React.ReactNode }) {
  // Force dark-mode Tailwind variants for the CMS, regardless of OS preference.
  return (
    <div className="dark">
      <React.Suspense
        fallback={
          <div className="min-h-screen bg-zinc-50 px-6 py-16 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
            <div className="mx-auto w-full max-w-3xl">
              <div className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</div>
            </div>
          </div>
        }
      >
        <AuthGate>{children}</AuthGate>
      </React.Suspense>
    </div>
  );
}

