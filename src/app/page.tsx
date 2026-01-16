import Link from "next/link";
import * as React from "react";
import HomeClient from "./HomeClient";

export default function Home() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return (
      <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900">
        <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-16">
          <header className="flex flex-col gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">yolo-cms</h1>
            <p className="text-base leading-7 text-zinc-600">
              Minimal CMS starter powered by Next.js + Convex.
            </p>
          </header>

          <section className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-medium">Convex not configured</div>
                <div className="text-sm text-zinc-600">
                  Set <span className="font-mono">NEXT_PUBLIC_CONVEX_URL</span> to load
                  published pages.
                </div>
              </div>
              <Link
                href="/cms"
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700"
              >
                Open CMS
              </Link>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900">
          <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-16">
            <div className="text-sm text-zinc-600">Loading…</div>
          </main>
        </div>
      }
    >
      <HomeClient />
    </React.Suspense>
  );
}
