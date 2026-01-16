"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { anyApi } from "convex/server";
import { clearCmsSessionToken, setCmsSessionToken } from "@/lib/cmsSession";

const api = anyApi;

function useNextHref() {
  const sp = useSearchParams();
  const next = sp.get("next");
  if (!next) return "/cms";
  // Only allow internal CMS paths.
  if (!next.startsWith("/cms")) return "/cms";
  return next;
}

export default function CmsLoginPage() {
  const hasAnyUsers = useQuery(api.auth.hasAny, {}) as boolean | undefined;
  const login = useMutation(api.auth.login);
  const bootstrap = useMutation(api.auth.bootstrapFirstUser);

  const nextHref = useNextHref();

  const [mode, setMode] = React.useState<"login" | "setup">("login");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (hasAnyUsers === undefined) return;
    setMode(hasAnyUsers ? "login" : "setup");
  }, [hasAnyUsers]);

  React.useEffect(() => {
    // If someone landed here with a stale cookie, clear it so middleware doesn't bounce them.
    clearCmsSessionToken();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res =
        mode === "setup"
          ? await bootstrap({ email, password })
          : await login({ email, password });
      const token = (res as { sessionToken: string }).sessionToken;
      if (!token) throw new Error("Login failed");
      setCmsSessionToken(token);
      window.location.href = nextHref;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  const title = mode === "setup" ? "Create your first admin user" : "Sign in";
  const subtitle =
    hasAnyUsers === undefined
      ? "Loading…"
      : mode === "setup"
        ? "No users exist yet. Create the first admin to unlock the CMS."
        : "Use an existing account. New users cannot be created anonymously.";

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-16 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto w-full max-w-md">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{subtitle}</p>
          </div>
          <Link className="text-sm font-medium underline" href="/">
            Home
          </Link>
        </header>

        <form
          onSubmit={onSubmit}
          className="mt-10 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950"
              placeholder="you@company.com"
              type="email"
              autoComplete="email"
              required
            />
          </label>

          <label className="mt-3 flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Password</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950"
              type="password"
              autoComplete={mode === "setup" ? "new-password" : "current-password"}
              required
            />
          </label>

          {error ? <div className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</div> : null}

          <button
            type="submit"
            disabled={isSubmitting || hasAnyUsers === undefined}
            className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-full bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
          >
            {isSubmitting ? "Working…" : mode === "setup" ? "Create admin" : "Sign in"}
          </button>

          {hasAnyUsers ? (
            <div className="mt-4 text-xs text-zinc-600 dark:text-zinc-400">
              Need to create a new user? Sign in first, then use the protected user creation endpoint.
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}

