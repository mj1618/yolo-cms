"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { useQuery } from "convex/react";
import { anyApi } from "convex/server";
import { clearCmsSessionToken, readCmsSessionToken } from "@/lib/cmsSession";

const api = anyApi;

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isLogin = pathname === "/cms/login";

  const sessionToken = readCmsSessionToken() ?? "";
  const me = useQuery(
    api.auth.me,
    isLogin ? undefined : { sessionToken: sessionToken || undefined },
  ) as { id: string; email: string; role: string } | null | undefined;

  React.useEffect(() => {
    if (isLogin) return;

    // Missing token: middleware should catch this, but this also covers client-side navigation.
    if (!sessionToken) {
      const next = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`;
      router.replace(`/cms/login?next=${encodeURIComponent(next)}`);
      return;
    }

    // Invalid/expired token.
    if (me === null) {
      clearCmsSessionToken();
      const next = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`;
      router.replace(`/cms/login?next=${encodeURIComponent(next)}`);
    }
  }, [isLogin, me, pathname, router, searchParams, sessionToken]);

  if (isLogin) return <>{children}</>;

  // While checking session, avoid rendering protected pages to prevent Convex errors flashing.
  if (!sessionToken || me === undefined) {
    return (
      <div className="min-h-screen bg-zinc-50 px-6 py-16 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
        <div className="mx-auto w-full max-w-3xl">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">Checking session…</div>
        </div>
      </div>
    );
  }

  if (me === null) return null;

  return <>{children}</>;
}

