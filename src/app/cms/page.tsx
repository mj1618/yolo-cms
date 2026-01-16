"use client";

import Link from "next/link";
import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { anyApi } from "convex/server";
import { GripVertical } from "lucide-react";
import type { NavbarDoc, NavbarItem, PageDoc } from "@/lib/cmsTypes";
import { getTemplateLabel, type TemplateKey, templates } from "@/lib/templates";
import { clearCmsSessionToken, readCmsSessionToken } from "@/lib/cmsSession";

const api = anyApi;

type UiNavbarItem = NavbarItem & { _key: string };

function newClientKey() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

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
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium underline"
          >
            Close
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function CmsHomeWithConvex() {
  const sessionToken = readCmsSessionToken() ?? "";

  const pages = useQuery(api.pages.list, { sessionToken }) as PageDoc[] | undefined;
  const create = useMutation(api.pages.create);
  const remove = useMutation(api.pages.remove);
  const navbar = useQuery(api.navbar.get, {}) as NavbarDoc | null | undefined;
  const setNavbarItems = useMutation(api.navbar.setItems);
  const logout = useMutation(api.auth.logout);

  const [title, setTitle] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [template, setTemplate] = React.useState<TemplateKey>("basic");
  const [error, setError] = React.useState<string | null>(null);
  const [isCreating, setIsCreating] = React.useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);

  const pagesById = React.useMemo(() => {
    const m = new Map<string, PageDoc>();
    for (const p of pages ?? []) m.set(p._id, p);
    return m;
  }, [pages]);

  const [navItems, setNavItems] = React.useState<UiNavbarItem[]>([]);
  const [navDirty, setNavDirty] = React.useState(false);
  const [navError, setNavError] = React.useState<string | null>(null);
  const [navIsSaving, setNavIsSaving] = React.useState(false);
  const [draggingNavKey, setDraggingNavKey] = React.useState<string | null>(null);

  const [newNavPageId, setNewNavPageId] = React.useState("");
  const [newNavLinkLabel, setNewNavLinkLabel] = React.useState("");
  const [newNavLinkUrl, setNewNavLinkUrl] = React.useState("");
  const [isAddNavModalOpen, setIsAddNavModalOpen] = React.useState(false);
  const [navAddMode, setNavAddMode] = React.useState<"page" | "link">("page");

  React.useEffect(() => {
    if (navbar === undefined) return; // loading
    if (navDirty) return;
    const items = (navbar?.items ?? []) as NavbarItem[];
    setNavItems(items.map((it) => ({ ...it, _key: newClientKey() })));
  }, [navbar, navDirty]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsCreating(true);
    try {
      const content = template === "home" ? templates.home.defaultContent : {};
      const id = await create({
        sessionToken,
        title,
        slug: slug.trim() ? slug : undefined,
        template,
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

  function reorderIds(ids: string[], fromId: string, toId: string) {
    const fromIdx = ids.indexOf(fromId);
    const toIdx = ids.indexOf(toId);
    if (fromIdx === -1 || toIdx === -1) return ids;
    const next = ids.slice();
    next.splice(fromIdx, 1);
    next.splice(toIdx, 0, fromId);
    return next;
  }

  function updateNavItem(key: string, fn: (item: UiNavbarItem) => UiNavbarItem) {
    setNavItems((prev) => prev.map((it) => (it._key === key ? fn(it) : it)));
    setNavDirty(true);
  }

  function removeNavItem(key: string) {
    setNavItems((prev) => prev.filter((it) => it._key !== key));
    setNavDirty(true);
  }

  function addNavPageItem() {
    if (!newNavPageId) return;
    setNavItems((prev) => [...prev, { type: "page", pageId: newNavPageId, _key: newClientKey() }]);
    setNavDirty(true);
    setNewNavPageId("");
    setIsAddNavModalOpen(false);
  }

  function addNavLinkItem() {
    const label = newNavLinkLabel.trim();
    const url = newNavLinkUrl.trim();
    if (!label || !url) return;
    setNavItems((prev) => [...prev, { type: "link", label, url, _key: newClientKey() }]);
    setNavDirty(true);
    setNewNavLinkLabel("");
    setNewNavLinkUrl("");
    setIsAddNavModalOpen(false);
  }

  const onSaveNavbar = React.useCallback(async () => {
    setNavError(null);
    setNavIsSaving(true);
    try {
      await setNavbarItems({
        sessionToken,
        items: navItems.map((it) => {
          const { _key, ...rest } = it;
          void _key;
          return rest;
        }),
      });
      setNavDirty(false);
    } catch (err) {
      setNavError(err instanceof Error ? err.message : "Failed to save navbar");
    } finally {
      setNavIsSaving(false);
    }
  }, [navItems, sessionToken, setNavbarItems]);

  React.useEffect(() => {
    // Auto-save navbar changes (debounced).
    if (!navDirty) return;
    if (navbar === undefined) return; // don't save until initial load completes
    if (navIsSaving) return;

    const t = window.setTimeout(() => {
      void onSaveNavbar();
    }, 800);
    return () => window.clearTimeout(t);
  }, [navDirty, navItems, navbar, navIsSaving, onSaveNavbar]);

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-16 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">CMS</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Create and edit pages.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link className="text-sm font-medium underline" href="/cms/users">
              Users
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
        </header>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold">Pages</h2>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                {pages ? `${pages.length} total` : "Loading…"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
            >
              Add Page
            </button>
          </div>
          <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
            Slugs are auto-normalized (e.g. “My Page” → “my-page”).
          </div>

          <div className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">
            {(pages ?? []).map((p) => (
              <div key={p._id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{p.title}</div>
                  <div className="truncate text-xs text-zinc-600 dark:text-zinc-400">
                    /{p.slug} {p.published ? "• published" : "• draft"}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Link
                    className="text-sm font-medium underline"
                    href={`/cms/pages/${p._id}`}
                  >
                    Edit
                  </Link>
                  <button
                    className="text-sm font-medium text-red-700 underline dark:text-red-400"
                    onClick={async () => {
                      if (!confirm(`Delete "${p.title}"?`)) return;
                      await remove({ sessionToken, id: p._id });
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {pages && pages.length === 0 ? (
              <div className="py-6 text-sm text-zinc-600 dark:text-zinc-400">
                No pages yet.
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold">Navbar</h2>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                Ordered list of Page or Link items.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-zinc-600 dark:text-zinc-400">
                {navbar === undefined ? "Loading…" : `${navItems.length} items`}
              </div>
              <button
                type="button"
                onClick={() => setIsAddNavModalOpen(true)}
                className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
              >
                Add Navbar Item
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-4">
            <div className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
              {navItems.map((it) => {
                const isDragging = draggingNavKey === it._key;
                return (
                  <div
                    key={it._key}
                    className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between ${isDragging ? "opacity-60" : ""}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const from = draggingNavKey ?? e.dataTransfer.getData("text/plain");
                      const to = it._key;
                      if (!from || from === to) return;
                      setNavItems((prev) => {
                        const ids = prev.map((x) => x._key);
                        const nextIds = reorderIds(ids, from, to);
                        const byId = new Map(prev.map((x) => [x._key, x] as const));
                        return nextIds.map((id) => byId.get(id)).filter(Boolean) as UiNavbarItem[];
                      });
                      setNavDirty(true);
                      setDraggingNavKey(null);
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <div
                            className="shrink-0 cursor-grab text-zinc-500 active:cursor-grabbing dark:text-zinc-400"
                            draggable
                            aria-label="Drag to reorder"
                            onDragStart={(e) => {
                              setDraggingNavKey(it._key);
                              e.dataTransfer.effectAllowed = "move";
                              try {
                                e.dataTransfer.setData("text/plain", it._key);
                              } catch {
                                // ignore
                              }
                            }}
                            onDragEnd={() => setDraggingNavKey(null)}
                          >
                            <GripVertical className="h-4 w-4" aria-hidden="true" />
                          </div>
                          <div className="text-xs font-semibold">{it.type === "page" ? "Page" : "Link"}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => removeNavItem(it._key)}
                            className="h-8 rounded-full px-3 text-xs font-medium text-red-700 underline dark:text-red-400"
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      {it.type === "page" ? (
                        <div className="mt-2 flex flex-col gap-2">
                          <select
                            value={it.pageId}
                            onChange={(e) =>
                              updateNavItem(it._key, (curr) =>
                                curr.type === "page" ? { ...curr, pageId: e.target.value } : curr,
                              )
                            }
                            className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950"
                          >
                            {(pages ?? []).map((p) => (
                              <option key={p._id} value={p._id}>
                                {p.title} (/{p.slug})
                              </option>
                            ))}
                          </select>
                          <div className="text-xs text-zinc-600 dark:text-zinc-400">
                            {pagesById.get(it.pageId)
                              ? `Links to /${pagesById.get(it.pageId)!.slug}`
                              : "Referenced page not found."}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <input
                            value={it.label}
                            onChange={(e) =>
                              updateNavItem(it._key, (curr) =>
                                curr.type === "link" ? { ...curr, label: e.target.value } : curr,
                              )
                            }
                            className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950"
                            placeholder="Label"
                          />
                          <input
                            value={it.url}
                            onChange={(e) =>
                              updateNavItem(it._key, (curr) =>
                                curr.type === "link" ? { ...curr, url: e.target.value } : curr,
                              )
                            }
                            className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950"
                            placeholder="URL"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {navbar !== undefined && navItems.length === 0 ? (
                <div className="p-4 text-sm text-zinc-600 dark:text-zinc-400">No navbar items yet.</div>
              ) : null}
            </div>

            {navError ? (
              <div className="text-sm text-red-600 dark:text-red-400">{navError}</div>
            ) : null}

            <div className="flex items-center justify-between gap-4">
              <div className="text-xs text-zinc-600 dark:text-zinc-400">
                {navbar === undefined
                  ? ""
                  : navIsSaving
                    ? "Saving…"
                    : navDirty
                      ? "Unsaved changes (auto-saving)"
                      : "Saved"}
              </div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400">Auto-saves</div>
            </div>
          </div>
        </section>
      </div>

      {isCreateModalOpen ? (
        <Modal
          title="Add Page"
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
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Template</span>
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value as TemplateKey)}
                className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <option value="basic">{getTemplateLabel("basic")}</option>
                <option value="home">{getTemplateLabel("home")}</option>
              </select>
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

      {isAddNavModalOpen ? (
        <Modal
          title="Add Navbar Item"
          onClose={() => {
            setIsAddNavModalOpen(false);
          }}
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setNavAddMode("page")}
                className={`h-9 rounded-full px-4 text-sm font-medium ${
                  navAddMode === "page"
                    ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-black"
                    : "border border-zinc-200 bg-white text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                }`}
              >
                Page
              </button>
              <button
                type="button"
                onClick={() => setNavAddMode("link")}
                className={`h-9 rounded-full px-4 text-sm font-medium ${
                  navAddMode === "link"
                    ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-black"
                    : "border border-zinc-200 bg-white text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                }`}
              >
                Link
              </button>
            </div>

            {navAddMode === "page" ? (
              <div className="flex flex-col gap-2">
                <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Select page</div>
                <div className="flex items-center gap-2">
                  <select
                    value={newNavPageId}
                    onChange={(e) => setNewNavPageId(e.target.value)}
                    className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <option value="">Select a page…</option>
                    {(pages ?? []).map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.title} (/{p.slug})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={addNavPageItem}
                    disabled={!newNavPageId}
                    className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
                  >
                    Add
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Link</div>
                <input
                  value={newNavLinkLabel}
                  onChange={(e) => setNewNavLinkLabel(e.target.value)}
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950"
                  placeholder="Label (e.g. GitHub)"
                />
                <div className="flex items-center gap-2">
                  <input
                    value={newNavLinkUrl}
                    onChange={(e) => setNewNavLinkUrl(e.target.value)}
                    className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950"
                    placeholder="URL (e.g. https://github.com/…)"
                  />
                  <button
                    type="button"
                    onClick={addNavLinkItem}
                    disabled={!newNavLinkLabel.trim() || !newNavLinkUrl.trim()}
                    className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

export default function CmsHomePage() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return (
      <div className="min-h-screen bg-zinc-50 px-6 py-16 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
        <div className="mx-auto w-full max-w-3xl">
          <h1 className="text-2xl font-semibold tracking-tight">CMS</h1>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            Set <span className="font-mono">NEXT_PUBLIC_CONVEX_URL</span> in{" "}
            <span className="font-mono">.env.local</span> and run{" "}
            <span className="font-mono">npm run convex:dev</span>.
          </p>
          <div className="mt-6">
            <Link className="text-sm font-medium underline" href="/">
              Back home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <CmsHomeWithConvex />;
}
