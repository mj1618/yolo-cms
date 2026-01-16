"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useQuery } from "convex/react";
import { anyApi } from "convex/server";
import type { NavbarDoc, PageDoc } from "@/lib/cmsTypes";
import { isTemplateKey, RenderTemplate, type TemplateKey } from "@/lib/templates";

const api = anyApi;

function firstNavbarHref(navbar: NavbarDoc | null, pagesById: Map<string, PageDoc>) {
  const items = (navbar?.items ?? []) as NavbarDoc["items"];
  for (const it of items) {
    if (it.type === "link") {
      const href = it.url?.trim();
      if (href) return href;
      continue;
    }
    const p = pagesById.get(it.pageId);
    if (p) return `/${p.slug}`;
  }
  return null;
}

function HomeWithConvex() {
  const router = useRouter();
  const homePage = useQuery(api.pages.getBySlug, { slug: "home" }) as PageDoc | null | undefined;
  const navbar = useQuery(api.navbar.get, {}) as NavbarDoc | null | undefined;
  const pages = useQuery(api.pages.listPublished, {}) as PageDoc[] | undefined;
  const hasAnyPages = useQuery(api.pages.hasAny, {}) as boolean | undefined;

  const pagesById = React.useMemo(() => {
    const m = new Map<string, PageDoc>();
    for (const p of pages ?? []) m.set(p._id, p);
    return m;
  }, [pages]);

  const redirectHref =
    navbar === undefined || pages === undefined ? null : firstNavbarHref(navbar, pagesById);

  React.useEffect(() => {
    if (hasAnyPages === false) {
      router.replace("/cms");
      return;
    }
    if (!redirectHref) return;
    if (redirectHref === "/") return;
    if (redirectHref.startsWith("/")) {
      router.replace(redirectHref);
    } else {
      window.location.href = redirectHref;
    }
  }, [hasAnyPages, redirectHref, router]);

  if (homePage === undefined || pages === undefined || navbar === undefined || hasAnyPages === undefined) {
    return (
      <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900">
        <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-16">
          <div className="text-sm text-zinc-600">Loading…</div>
        </main>
      </div>
    );
  }

  if (!hasAnyPages || redirectHref) {
    return (
      <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900">
        <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-16">
          <div className="text-sm text-zinc-600">Redirecting…</div>
        </main>
      </div>
    );
  }

  if (homePage && homePage.published) {
    const hp = homePage as PageDoc & { template?: string; content?: unknown };
    const fallback = (
      <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900">
        <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-16">
          <header className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">{homePage.title}</h1>
              <div className="mt-2 text-sm text-zinc-600">
                Home page (slug: <span className="font-mono">home</span>)
              </div>
            </div>
            <Link className="text-sm font-medium underline" href="/cms">
              CMS
            </Link>
          </header>
          <pre className="whitespace-pre-wrap rounded-2xl border border-zinc-200 bg-white p-4 text-sm leading-6">
            {homePage.body || " "}
          </pre>
        </main>
      </div>
    );
    const rawTemplate = typeof hp.template === "string" ? hp.template : "";
    const template: TemplateKey | undefined =
      rawTemplate === "basic" ? "basic" : isTemplateKey(rawTemplate) ? rawTemplate : undefined;
    return <RenderTemplate template={template} content={hp.content} fallback={fallback} />;
  }

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
              <div className="text-sm font-medium">Published pages</div>
              <div className="text-sm text-zinc-600">
                {`${pages.length} live`}
              </div>
            </div>
            <Link
              href="/cms"
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Open CMS
            </Link>
          </div>

          <div className="mt-2 divide-y divide-zinc-200">
            {(pages ?? []).map((p) => (
              <div key={p._id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{p.title}</div>
                  <div className="truncate text-xs text-zinc-600">
                    /{p.slug}
                  </div>
                </div>
                <Link className="shrink-0 text-sm font-medium underline" href={`/${p.slug}`}>
                  View
                </Link>
              </div>
            ))}
            {pages && pages.length === 0 ? (
              <div className="py-6 text-sm text-zinc-600">
                No published pages yet.
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}

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

  return <HomeWithConvex />;
}
