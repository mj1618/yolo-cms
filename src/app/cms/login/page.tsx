import * as React from "react";
import LoginClient from "./LoginClient";

export default function CmsLoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 px-6 py-16 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
          <div className="mx-auto w-full max-w-md">
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</div>
          </div>
        </div>
      }
    >
      <LoginClient />
    </React.Suspense>
  );
}

