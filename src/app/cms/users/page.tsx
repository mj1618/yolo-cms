"use client";

import Link from "next/link";
import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { anyApi } from "convex/server";
import { clearCmsSessionToken, readCmsSessionToken } from "@/lib/cmsSession";

const api = anyApi;

type SafeUser = {
  id: string;
  email: string;
  role: "admin" | "editor";
  createdAt: number;
  updatedAt: number;
};

export default function CmsUsersPage() {
  const sessionToken = readCmsSessionToken() ?? "";

  const me = useQuery(api.auth.me, { sessionToken: sessionToken || undefined }) as
    | { id: string; email: string; role: "admin" | "editor" }
    | null
    | undefined;

  const users = useQuery(api.auth.listUsers, me?.role === "admin" ? { sessionToken } : undefined) as
    | SafeUser[]
    | undefined;

  const createUser = useMutation(api.auth.createUser);
  const removeUser = useMutation(api.auth.removeUser);
  const logout = useMutation(api.auth.logout);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState<"admin" | "editor">("editor");
  const [error, setError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  if (!sessionToken) {
    // Middleware/AuthGate should already redirect, but keep a safe UI state.
    return (
      <div className="min-h-screen bg-zinc-50 px-6 py-16 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
        <div className="mx-auto w-full max-w-3xl">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">Redirecting…</div>
        </div>
      </div>
    );
  }

  if (me === undefined) {
    return (
      <div className="min-h-screen bg-zinc-50 px-6 py-16 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
        <div className="mx-auto w-full max-w-3xl">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</div>
        </div>
      </div>
    );
  }

  if (me === null) {
    return (
      <div className="min-h-screen bg-zinc-50 px-6 py-16 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
        <div className="mx-auto w-full max-w-3xl">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">Not authenticated.</div>
        </div>
      </div>
    );
  }

  if (me.role !== "admin") {
    return (
      <div className="min-h-screen bg-zinc-50 px-6 py-16 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
        <div className="mx-auto w-full max-w-3xl">
          <header className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                You don’t have access to manage users.
              </p>
            </div>
            <Link className="text-sm font-medium underline" href="/cms">
              CMS
            </Link>
          </header>
        </div>
      </div>
    );
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await createUser({ sessionToken, email, password, role });
      setEmail("");
      setPassword("");
      setRole("editor");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-16 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Manage who can access the CMS.
            </p>
            <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
              Signed in as <span className="font-mono">{me.email}</span> ({me.role})
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link className="text-sm font-medium underline" href="/cms">
              CMS
            </Link>
            <button
              type="button"
              className="text-sm font-medium underline"
              onClick={async () => {
                try {
                  await logout({ sessionToken });
                } finally {
                  clearCmsSessionToken();
                  window.location.href = "/cms/login";
                }
              }}
            >
              Sign out
            </button>
          </div>
        </header>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold">Add user</h2>
          <form className="mt-4 flex flex-col gap-3" onSubmit={onCreate}>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Email</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950"
                placeholder="editor@company.com"
                type="email"
                autoComplete="off"
                required
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Password</span>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950"
                type="password"
                autoComplete="new-password"
                required
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Role</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "admin" | "editor")}
                className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </select>
            </label>

            {error ? <div className="text-sm text-red-600 dark:text-red-400">{error}</div> : null}

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
            >
              {isSaving ? "Creating…" : "Create user"}
            </button>

            <div className="text-xs text-zinc-600 dark:text-zinc-400">
              New users can’t be created anonymously (only admins can add them here).
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold">Existing users</h2>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                {users ? `${users.length} total` : "Loading…"}
              </p>
            </div>
          </div>

          <div className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">
            {(users ?? []).map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{u.email}</div>
                  <div className="truncate text-xs text-zinc-600 dark:text-zinc-400">
                    {u.role}
                    {u.id === me.id ? " • you" : ""}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    disabled={u.id === me.id}
                    className="text-sm font-medium text-red-700 underline disabled:opacity-50 dark:text-red-400"
                    onClick={async () => {
                      if (u.id === me.id) return;
                      if (!confirm(`Remove user "${u.email}"?`)) return;
                      try {
                        await removeUser({ sessionToken, userId: u.id });
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Failed to remove user");
                      }
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            {users && users.length === 0 ? (
              <div className="py-6 text-sm text-zinc-600 dark:text-zinc-400">No users.</div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

