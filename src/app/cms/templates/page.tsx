"use client";

import Link from "next/link";
import * as React from "react";
import { useMutation } from "convex/react";
import { anyApi } from "convex/server";
import { clearCmsSessionToken, readCmsSessionToken } from "@/lib/cmsSession";
import { getTemplateLabel, type TemplateKey, templates } from "@/lib/templates";

const api = anyApi;

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 cursor-default bg-black/40"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-start justify-between gap-4">
          <div className="text-sm font-semibold">{title}</div>
          <button type="button" onClick={onClose} className="text-sm font-medium underline">
            Close
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

type PreviewState = {
  template?: string;
  title?: string;
  slug?: string;
  body?: string;
  content?: unknown;
};

export default function CmsTemplatesPage() {
  const sessionToken = readCmsSessionToken() ?? "";
  const create = useMutation(api.pages.create);
  const logout = useMutation(api.auth.logout);

  const [selectedTemplate, setSelectedTemplate] = React.useState<TemplateKey>("home");

  const iframeRef = React.useRef<HTMLIFrameElement | null>(null);
  const [isPreviewReady, setIsPreviewReady] = React.useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isCreating, setIsCreating] = React.useState(false);

  React.useEffect(() => {
    type CmsMessage = { type: "cmsPreviewReady" } | { type: string; payload?: unknown };
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (!e.data || typeof e.data !== "object") return;
      const data = e.data as CmsMessage;
      if (data.type === "cmsPreviewReady") setIsPreviewReady(true);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const sendPreviewUpdate = React.useCallback((key: TemplateKey) => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    const payload: PreviewState =
      key === "home"
        ? {
            template: "home",
            title: "Home",
            slug: "",
            content: templates.home.defaultContent,
          }
        : {
            template: "basic",
            title: "Basic page",
            slug: "basic-page",
            body: "This is the Basic template. Use the editor to write your page body.",
            content: {},
          };

    win.postMessage({ type: "cmsPreviewUpdate", payload }, window.location.origin);
  }, []);

  React.useEffect(() => {
    if (!isPreviewReady) return;
    sendPreviewUpdate(selectedTemplate);
  }, [isPreviewReady, selectedTemplate, sendPreviewUpdate]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsCreating(true);
    try {
      const content = selectedTemplate === "home" ? templates.home.defaultContent : {};
      const id = await create({
        sessionToken,
        title,
        slug: slug.trim() ? slug : undefined,
        template: selectedTemplate,
        content,
      });
      setTitle("");
      setSlug("");
      setIsCreateModalOpen(false);
      window.location.href = `/cms/pages/${id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create page");
    } finally {
      setIsCreating(false);
    }
  }

  const templateChoices: { key: TemplateKey; blurb: string }[] = [
    { key: "basic", blurb: "A simple page with a rich-text Body." },
    { key: "home", blurb: "A section-based home page with structured fields." },
  ];

  return (
    <div className="h-screen w-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="flex h-full w-full flex-col lg:flex-row">
        <div className="min-h-0 w-full overflow-y-auto p-6 lg:w-1/2">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 py-10">
            <header className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    Pick a template, preview it, then create a new page.
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
                {templateChoices.map((t) => {
                  const isSelected = selectedTemplate === t.key;
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
                          <div className="truncate text-sm font-medium">{getTemplateLabel(t.key)}</div>
                          <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{t.blurb}</div>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <button
                            type="button"
                            className="text-sm font-medium underline"
                            onClick={() => {
                              setSelectedTemplate(t.key);
                              if (isPreviewReady) sendPreviewUpdate(t.key);
                            }}
                          >
                            Preview
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-9 items-center justify-center rounded-full bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
                            onClick={() => {
                              setSelectedTemplate(t.key);
                              setIsCreateModalOpen(true);
                              setError(null);
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
              <div className="text-xs text-zinc-600 dark:text-zinc-400">
                {getTemplateLabel(selectedTemplate)}
              </div>
            </div>
            <div className="min-h-0 flex-1">
              <iframe
                ref={iframeRef}
                src="/cms/preview"
                className="h-full w-full bg-white dark:bg-black"
                onLoad={() => {
                  // In case the iframe loads before we receive the ready message.
                  sendPreviewUpdate(selectedTemplate);
                }}
              />
            </div>
          </div>
        </aside>
      </div>

      {isCreateModalOpen ? (
        <Modal
          title={`Create page from ${getTemplateLabel(selectedTemplate)}`}
          onClose={() => {
            setIsCreateModalOpen(false);
            setError(null);
          }}
        >
          <form className="flex flex-col gap-3" onSubmit={onCreate}>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950"
                placeholder="About"
                required
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Slug (optional)</span>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950"
                placeholder="about"
              />
            </label>

            {error ? <div className="text-sm text-red-600 dark:text-red-400">{error}</div> : null}

            <div className="mt-1 flex items-center justify-between gap-3">
              <div className="text-xs text-zinc-600 dark:text-zinc-400">
                You’ll be redirected to the editor after creation.
              </div>
              <button
                type="submit"
                disabled={isCreating}
                className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
              >
                {isCreating ? "Creating…" : "Create"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

