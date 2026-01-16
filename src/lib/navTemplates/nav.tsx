import Link from "next/link";
import * as React from "react";
import type { NavLinkItem } from "./types";

function NavLinks({
  items,
  loadingText,
}: {
  items: NavLinkItem[];
  loadingText?: string;
}) {
  return (
    <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-sm">
      {loadingText ? (
        <div className="text-xs text-zinc-600">{loadingText}</div>
      ) : items.length === 0 ? (
        <Link className="text-sm font-medium underline" href="/cms">
          CMS
        </Link>
      ) : (
        items.map((it, idx) => {
          if (it.external) {
            return (
              <a
                key={`${it.href}-${idx}`}
                className="text-sm font-medium underline"
                href={it.href}
                target="_blank"
                rel="noreferrer"
              >
                {it.label}
              </a>
            );
          }
          return (
            <Link key={`${it.href}-${idx}`} className="text-sm font-medium underline" href={it.href}>
              {it.label}
            </Link>
          );
        })
      )}
    </nav>
  );
}

export function NavTemplate({
  title,
  items,
  loadingText,
}: {
  title: string;
  items: NavLinkItem[];
  loadingText?: string;
}) {
  return (
    <div className="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-6 px-6 py-3 font-sans">
        <Link href="/" className="text-sm font-semibold tracking-tight text-zinc-900">
          {title}
        </Link>
        <NavLinks items={items} loadingText={loadingText} />
      </div>
    </div>
  );
}

