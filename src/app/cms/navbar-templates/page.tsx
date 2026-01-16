"use client";

import Link from "next/link";
import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { anyApi } from "convex/server";
import type { NavbarDoc } from "@/lib/cmsTypes";
import { bumpCmsPreviewReload } from "@/lib/cmsPreviewReload";
import { clearCmsSessionToken, readCmsSessionToken } from "@/lib/cmsSession";
import {
  getNavTemplateLabel,
  isNavTemplateKey,
  type NavTemplateKey,
  navTemplates,
  RenderNavTemplate,
} from "@/lib/navTemplates";

const api = anyApi;

export default function CmsNavbarTemplatesPage() {
  const sessionToken = readCmsSessionToken() ?? "";
  const logout = useMutation(api.auth.logout);
  const setTemplate = useMutation(api.navbar.setTemplate);
  const navbar = useQuery(api.navbar.get, {}) as NavbarDoc | null | undefined;

  const [selectedTemplate, setSelectedTemplate] = React.useState<NavTemplateKey>("nav");

  React.useEffect(() => {
    if (navbar === undefined) return;
    const raw = typeof navbar?.template === "string" ? navbar.template : "";
    if (raw && isNavTemplateKey(raw)) setSelectedTemplate(raw);
  }, [navbar]);

  const choices: { key: NavTemplateKey; blurb: string }[] = [
    { key: "nav", blurb: "Clean light navbar with subtle blur." },
    { key: "dark-nav", blurb: "Dark navbar for a bolder look." },
  ];

  const previewItems = [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "Docs", href: "https://example.com", external: true },
  ];

  return (
    <div className="h-screen w-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="flex h-full w-full flex-col lg:flex-row">
        <div className="min-h-0 w-full overflow-y-auto p-6 lg:w-1/2">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 py-10">
            <header className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">Navbar templates</h1>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    Pick a navbar look, preview it, then apply it to your site.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <Link className="text-sm font-medium underline" href="/cms">
                    CMS
                  </Link>
                  <Link className="text-sm font-medium underline" href="/">
                    Home
                  </Link>
                  <button
                    type="button"
                    className="text-sm font-medium underline"
                    onClick={async () => {
                      try {
                        if (sessionToken) await logout({ sessionToken });
                      } finally {
                        clearCmsSessionToken();
                        window.location.href = "/cms/login";
                      }
                    }}
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </header>

            <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="text-sm font-semibold">Choose a template</div>
              <div className="mt-4 flex flex-col gap-3">
                {choices.map((t) => {
                  const isSelected = selectedTemplate === t.key;
                  const isCurrent =
                    navbar &&
                    typeof navbar.template === "string" &&
                    isNavTemplateKey(navbar.template) &&
                    navbar.template === t.key;
                  return (
                    <div
                      key={t.key}
                      className={[
                        "rounded-2xl border p-4",
                        isSelected
                          ? "border-zinc-900 bg-zinc-50 dark:border-zinc-50 dark:bg-black"
                          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="truncate text-sm font-medium">{getNavTemplateLabel(t.key)}</div>
                            {isCurrent ? (
                              <span className="rounded-full border border-zinc-200 px-2 py-0.5 text-[11px] text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
                                Current
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{t.blurb}</div>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <button
                            type="button"
                            className="text-sm font-medium underline"
                            onClick={() => setSelectedTemplate(t.key)}
                          >
                            Preview
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-9 items-center justify-center rounded-full bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
                            onClick={async () => {
                              await setTemplate({ sessionToken, template: t.key });
                              bumpCmsPreviewReload();
                              window.location.href = "/cms";
                            }}
                          >
                            Use
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>

        <aside className="min-h-0 w-full border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 lg:w-1/2 lg:border-l lg:border-t-0">
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Template preview</div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400">{getNavTemplateLabel(selectedTemplate)}</div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto bg-white dark:bg-black">
              <div className="min-h-full bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
                <RenderNavTemplate template={selectedTemplate} title="yolo-cms" items={previewItems} />
                <div className="mx-auto w-full max-w-5xl px-6 py-10">
                  <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
                    This is a simple preview canvas to help you compare navbars.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

