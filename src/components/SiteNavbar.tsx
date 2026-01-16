"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { anyApi } from "convex/server";
import type { NavbarDoc, PageDoc } from "@/lib/cmsTypes";
import { RenderNavTemplate } from "@/lib/navTemplates";
import type { NavLinkItem } from "@/lib/navTemplates/types";

const api = anyApi;

export function SiteNavbar({ title = "Site" }: { title?: string }) {
  const navbar = useQuery(api.navbar.get, {}) as NavbarDoc | null | undefined;
  const pages = useQuery(api.pages.listPublished, {}) as PageDoc[] | undefined;

  const pagesById = React.useMemo(() => {
    const m = new Map<string, PageDoc>();
    for (const p of pages ?? []) m.set(p._id, p);
    return m;
  }, [pages]);

  const items = (navbar?.items ?? []) as NavbarDoc["items"];

  const navItems: NavLinkItem[] = React.useMemo(() => {
    const out: NavLinkItem[] = [];
    for (const it of items) {
      if (it.type === "link") {
        const href = it.url;
        out.push({ label: it.label, href, external: !href.startsWith("/") });
        continue;
      }
      const p = pagesById.get(it.pageId);
      if (!p) continue;
      out.push({ label: p.title, href: `/${p.slug}` });
    }
    return out;
  }, [items, pagesById]);

  const loadingText = navbar === undefined || pages === undefined ? "Loading…" : undefined;

  return (
    <RenderNavTemplate
      template={navbar?.template}
      title={title}
      items={loadingText ? [] : navItems}
      loadingText={loadingText}
    />
  );
}

