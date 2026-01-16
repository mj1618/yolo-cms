"use client";

import Link from "next/link";
import * as React from "react";
import { useQuery } from "convex/react";
import { anyApi } from "convex/server";
import type { NavbarDoc, PageDoc } from "@/lib/cmsTypes";

const api = anyApi;

function isInternalHref(href: string) {
  return href.startsWith("/");
}

export function SiteNavbar({ title = "Site" }: { title?: string }) {
  const navbar = useQuery(api.navbar.get, {}) as NavbarDoc | null | undefined;
  const pages = useQuery(api.pages.listPublished, {}) as PageDoc[] | undefined;

  const pagesById = React.useMemo(() => {
    const m = new Map<string, PageDoc>();
    for (const p of pages ?? []) m.set(p._id, p);
    return m;
  }, [pages]);

  const items = (navbar?.items ?? []) as NavbarDoc["items"];

  return (
    <div className="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-6 px-6 py-3 font-sans">
        <Link href="/" className="text-sm font-semibold tracking-tight text-zinc-900">
          {title}
        </Link>

        <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-sm">
          {navbar === undefined || pages === undefined ? (
            <div className="text-xs text-zinc-600">Loading…</div>
          ) : items.length === 0 ? (
            <Link className="text-sm font-medium underline" href="/cms">
              CMS
            </Link>
          ) : (
            items.map((it, idx) => {
              if (it.type === "link") {
                const href = it.url;
                if (isInternalHref(href)) {
                  return (
                    <Link key={`${it.type}-${idx}`} className="text-sm font-medium underline" href={href}>
                      {it.label}
                    </Link>
                  );
                }
                return (
                  <a
                    key={`${it.type}-${idx}`}
                    className="text-sm font-medium underline"
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {it.label}
                  </a>
                );
              }

              const p = pagesById.get(it.pageId);
              if (!p) return null;
              return (
                <Link key={`${it.type}-${idx}`} className="text-sm font-medium underline" href={`/${p.slug}`}>
                  {p.title}
                </Link>
              );
            })
          )}
        </nav>
      </div>
    </div>
  );
}

