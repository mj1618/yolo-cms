"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { anyApi } from "convex/server";
import { GripVertical, Trash2 } from "lucide-react";
import type { PageDoc } from "@/lib/cmsTypes";
import { coerceHomeContent, getTemplateLabel, type TemplateKey, templates } from "@/lib/templates";
import type { TemplateField, TemplateSectionDefinition } from "@/lib/templates/types";
import { clearCmsSessionToken, readCmsSessionToken } from "@/lib/cmsSession";

const api = anyApi;

type PageDocWithTemplate = PageDoc & { template?: string; content?: unknown };

export default function CmsEditPage() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const params = useParams<{ id: string }>();
  const id = params?.id;

  if (!convexUrl) {
    return (
      <div className="min-h-screen bg-zinc-50 px-6 py-16 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
        <div className="mx-auto w-full max-w-3xl">
          <h1 className="text-2xl font-semibold tracking-tight">Edit page</h1>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            Set <span className="font-mono">NEXT_PUBLIC_CONVEX_URL</span> in{" "}
            <span className="font-mono">.env.local</span> and run{" "}
            <span className="font-mono">npm run convex:dev</span>.
          </p>
          <div className="mt-6">
            <Link className="text-sm font-medium underline" href="/cms">
              Back to CMS
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!id) {
    return (
      <div className="min-h-screen bg-zinc-50 px-6 py-16 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
        <div className="mx-auto w-full max-w-3xl">
          <h1 className="text-2xl font-semibold tracking-tight">Edit page</h1>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">Missing id.</p>
          <div className="mt-6">
            <Link className="text-sm font-medium underline" href="/cms">
              Back to CMS
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <CmsEditWithConvex id={id} />;
}

function CmsEditWithConvex({ id }: { id: string }) {
  const sessionToken = readCmsSessionToken() ?? "";

  const page = useQuery(api.pages.get, { sessionToken, id }) as PageDocWithTemplate | null | undefined;
  const update = useMutation(api.pages.update);
  const remove = useMutation(api.pages.remove);
  const logout = useMutation(api.auth.logout);

  const iframeRef = React.useRef<HTMLIFrameElement | null>(null);

  const [title, setTitle] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [published, setPublished] = React.useState(false);
  const [body, setBody] = React.useState("");
  const [template, setTemplate] = React.useState<TemplateKey>("basic");
  const [content, setContent] = React.useState<Record<string, unknown>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>({});
  const [openFields, setOpenFields] = React.useState<Record<string, boolean>>({});
  const [draggingSectionId, setDraggingSectionId] = React.useState<string | null>(null);
  const [isPreviewReady, setIsPreviewReady] = React.useState(false);

  React.useEffect(() => {
    if (!page) return;
    setTitle(page.title);
    setSlug(page.slug);
    setPublished(page.published);
    setBody(page.body);
    const t = ((page.template as TemplateKey | undefined) ?? "basic") as TemplateKey;
    setTemplate(t);
    if (t === "home") {
      setContent(coerceHomeContent(page.content));
    } else {
      setContent((page.content as Record<string, unknown> | undefined) ?? {});
    }

    // Everything should be collapsed by default.
    setOpenSections({});
    setOpenFields({});
  }, [page]);

  const sendPreviewUpdate = React.useCallback(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage(
      {
        type: "cmsPreviewUpdate",
        payload: {
          template,
          title,
          slug,
          body,
          published,
          content,
        },
      },
      window.location.origin,
    );
  }, [template, title, slug, body, published, content]);

  React.useEffect(() => {
    type CmsMessage =
      | { type: "cmsPreviewReady" }
      | { type: "cmsSelect"; payload?: { sectionId?: string; fieldKey?: string; itemIndex?: number } }
      | { type: string; payload?: unknown };

    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (!e.data || typeof e.data !== "object") return;
      const data = e.data as CmsMessage;

      if (data.type === "cmsPreviewReady") {
        setIsPreviewReady(true);
        return;
      }

      if (data.type === "cmsSelect") {
        const payload = data.payload;
        const sectionId = typeof payload?.sectionId === "string" ? payload.sectionId : "";
        const fieldKey = typeof payload?.fieldKey === "string" ? payload.fieldKey : "";
        if (!sectionId || !fieldKey) return;
        if (template !== "home") return;

        // Close everything else, open the matching path.
        setOpenSections({ [sectionId]: true });
        setOpenFields({ [`${sectionId}.${fieldKey}`]: true });

        requestAnimationFrame(() => {
          const el = document.getElementById(`cms-section-${sectionId}`);
          el?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [template]);

  React.useEffect(() => {
    if (!isPreviewReady) return;
    sendPreviewUpdate();
  }, [isPreviewReady, sendPreviewUpdate]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const nextContent = template === "home" ? content : {};
      await update({ sessionToken, id, title, slug, published, body, template, content: nextContent });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }

  type HomeSection = TemplateSectionDefinition<Record<string, unknown>>;
  type HomeSectionInstance = {
    id: string;
    type: string;
    data: Record<string, unknown>;
  };

  const homeSectionDefs = React.useMemo(() => {
    const raw = templates.home.sections ?? [];
    return raw as readonly HomeSection[];
  }, []);
  const defsByType = React.useMemo(() => {
    const m = new Map<string, HomeSection>();
    for (const s of homeSectionDefs) m.set(s.key, s);
    return m;
  }, [homeSectionDefs]);

  const sectionInstances = React.useMemo(() => {
    const raw = content && typeof content === "object" ? (content as Record<string, unknown>)._sections : undefined;
    return Array.isArray(raw) ? (raw as HomeSectionInstance[]) : [];
  }, [content]);

  function setSectionInstances(next: HomeSectionInstance[]) {
    setContent((prev) => ({ ...(prev ?? {}), _sections: next }));
  }

  function newInstanceId(type: string) {
    const base = `${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    return base;
  }

  function addSection(type: string) {
    const def = defsByType.get(type);
    if (!def) return;
    const inst: HomeSectionInstance = {
      id: newInstanceId(type),
      type,
      data: def.defaultContent,
    };
    setSectionInstances([...(sectionInstances ?? []), inst]);
  }

  function removeSection(id: string) {
    setSectionInstances((sectionInstances ?? []).filter((s) => s.id !== id));
    setOpenSections((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setOpenFields((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        if (k.startsWith(`${id}.`)) delete next[k];
      }
      return next;
    });
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

  function toggleSection(key: string) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleField(sectionKey: string, fieldKey: string) {
    const k = `${sectionKey}.${fieldKey}`;
    setOpenFields((prev) => ({ ...prev, [k]: !prev[k] }));
  }

  // IMPORTANT: keep early returns AFTER hooks to avoid "change in order of hooks".
  if (page === undefined) {
    return (
      <div className="min-h-screen bg-zinc-50 px-6 py-16 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
        <div className="mx-auto w-full max-w-3xl">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</div>
        </div>
      </div>
    );
  }

  if (page === null) {
    return (
      <div className="min-h-screen bg-zinc-50 px-6 py-16 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
        <div className="mx-auto w-full max-w-3xl">
          <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
          <div className="mt-6">
            <Link className="text-sm font-medium underline" href="/cms">
              Back to CMS
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="flex h-full w-full flex-col lg:flex-row">
        <div className="min-h-0 w-full overflow-y-auto p-6 lg:w-1/2">
            <header className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-4">
                <h1 className="text-2xl font-semibold tracking-tight">Edit page</h1>
                <div className="flex items-center gap-3">
                  <Link className="text-sm font-medium underline" href="/cms">
                    CMS
                  </Link>
                  <Link className="text-sm font-medium underline" href="/cms/users">
                    Users
                  </Link>
                  <Link className="text-sm font-medium underline" href={`/${page.slug}`}>
                    View
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
              <div className="text-xs text-zinc-600 dark:text-zinc-400">
                ID: <span className="font-mono">{page._id}</span>
              </div>
            </header>

            <form
              onSubmit={onSave}
              className="mt-10 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
            >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Title
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Slug
              </span>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950"
              />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Template
              </span>
              <select
                value={template}
                onChange={(e) => {
                  const next = e.target.value as TemplateKey;
                  setTemplate(next);
                  if (next === "home") {
                    setContent(coerceHomeContent(content));
                  } else {
                    setContent({});
                  }
                }}
                className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <option value="basic">{getTemplateLabel("basic")}</option>
                <option value="home">{getTemplateLabel("home")}</option>
              </select>
            </label>
          </div>

          <div className="mt-4 flex items-center justify-between gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
              />
              Published
            </label>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
              >
                {isSaving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                className="text-sm font-medium text-red-700 underline dark:text-red-400"
                onClick={async () => {
                  if (!confirm(`Delete "${page.title}"?`)) return;
                  await remove({ sessionToken, id });
                  window.location.href = "/cms";
                }}
              >
                Delete
              </button>
            </div>
          </div>

          {error ? (
            <div className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</div>
          ) : null}

          {template === "home" ? (
            <div className="mt-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold">Home template content</div>
                  <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                    These fields come from <span className="font-mono">src/lib/templates/home.tsx</span>.
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {homeSectionDefs.map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => addSection(d.key)}
                    className="inline-flex h-8 items-center justify-center rounded-full border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
                  >
                    Add {d.label}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex flex-col gap-6">
                {sectionInstances.map((inst) => {
                  const def = defsByType.get(inst.type);
                  if (!def) return null;
                  const sectionValue = inst.data;
                  const sectionIsOpen = Boolean(openSections[inst.id]);
                  const sectionPanelId = `section-${inst.id}`;
                  const isDragging = draggingSectionId === inst.id;
                  return (
                    <div
                      key={inst.id}
                      id={`cms-section-${inst.id}`}
                      className={`rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-black ${isDragging ? "opacity-60" : ""}`}
                      draggable
                      onDragStart={(e) => {
                        setDraggingSectionId(inst.id);
                        e.dataTransfer.effectAllowed = "move";
                        try {
                          e.dataTransfer.setData("text/plain", inst.id);
                        } catch {
                          // ignore
                        }
                      }}
                      onDragEnd={() => setDraggingSectionId(null)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const from =
                          draggingSectionId ?? (e.dataTransfer.getData("text/plain") || "");
                        const to = inst.id;
                        if (!from || from === to) return;
                        const currentIds = (sectionInstances ?? []).map((s) => s.id);
                        const nextIds = reorderIds(currentIds, from, to);
                        const byId = new Map((sectionInstances ?? []).map((s) => [s.id, s]));
                        setSectionInstances(nextIds.map((id) => byId.get(id)).filter(Boolean) as HomeSectionInstance[]);
                        setDraggingSectionId(null);
                      }}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        aria-expanded={sectionIsOpen}
                        aria-controls={sectionPanelId}
                        className="flex w-full items-start justify-between gap-4 text-left"
                        onClick={() => toggleSection(inst.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleSection(inst.id);
                          }
                        }}
                      >
                        <div className="flex min-w-0 items-start gap-2">
                          <div className="mt-0.5 shrink-0 text-zinc-500 dark:text-zinc-400">
                            <GripVertical className="h-4 w-4" aria-hidden="true" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold">{def.label}</div>
                            <div className="mt-1 truncate text-xs text-zinc-600 dark:text-zinc-400">
                              {inst.type} • {inst.id}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="shrink-0 rounded-md p-1 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
                          aria-label="Remove section"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSection(inst.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>

                      {sectionIsOpen ? (
                        <div id={sectionPanelId} className="mt-4 flex flex-col gap-3">
                          {def.fields.map((f: TemplateField) => {
                            const v = sectionValue ? sectionValue[f.key] : undefined;
                            const fieldIsOpen = Boolean(openFields[`${inst.id}.${f.key}`]);
                            const fieldPanelId = `field-${inst.id}-${f.key}`;

                            const setSectionField = (value: unknown) => {
                              const next = (sectionInstances ?? []).map((s) =>
                                s.id === inst.id ? { ...s, data: { ...(s.data ?? {}), [f.key]: value } } : s,
                              );
                              setSectionInstances(next);
                            };

                            const summary =
                              f.type === "stringList"
                                ? Array.isArray(v)
                                  ? `${v.length} items`
                                  : "0 items"
                                : typeof v === "string"
                                  ? v.trim()
                                    ? v.trim().slice(0, 60)
                                    : "—"
                                  : "—";

                            return (
                              <div
                                key={f.key}
                                className="rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
                              >
                                <button
                                  type="button"
                                  className="flex w-full items-center justify-between gap-4 text-left"
                                  aria-expanded={fieldIsOpen}
                                  aria-controls={fieldPanelId}
                                  onClick={() => toggleField(inst.id, f.key)}
                                >
                                  <div className="min-w-0">
                                    <div className="text-xs font-semibold">{f.label}</div>
                                    <div className="mt-1 truncate text-xs text-zinc-600 dark:text-zinc-400">
                                      {summary}
                                    </div>
                                  </div>
                                  <div className="shrink-0 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                    {fieldIsOpen ? "Hide" : "Show"}
                                  </div>
                                </button>

                                {fieldIsOpen ? (
                                  <div id={fieldPanelId} className="mt-3">
                                    {f.type === "text" ? (
                                      <textarea
                                        value={typeof v === "string" ? v : ""}
                                        onChange={(e) => setSectionField(e.target.value)}
                                        placeholder={f.placeholder}
                                        className="min-h-[120px] w-full rounded-2xl border border-zinc-200 bg-white p-3 text-sm leading-6 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950"
                                      />
                                    ) : f.type === "stringList" ? (
                                      <div className="flex flex-col gap-2">
                                        <textarea
                                          value={
                                            Array.isArray(v)
                                              ? v.filter((x) => typeof x === "string").join("\n")
                                              : ""
                                          }
                                          onChange={(e) =>
                                            setSectionField(
                                              e.target.value
                                                .split("\n")
                                                .map((s) => s.trim())
                                                .filter(Boolean),
                                            )
                                          }
                                          placeholder={f.placeholder}
                                          className="min-h-[120px] w-full rounded-2xl border border-zinc-200 bg-white p-3 text-sm leading-6 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950"
                                        />
                                        <div className="text-xs text-zinc-600 dark:text-zinc-400">
                                          One item per line.
                                        </div>
                                      </div>
                                    ) : (
                                      <input
                                        value={typeof v === "string" ? v : ""}
                                        onChange={(e) => setSectionField(e.target.value)}
                                        placeholder={f.placeholder}
                                        className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950"
                                      />
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <label className="mt-6 flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Body (plain text / markdown)
              </span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="min-h-[320px] rounded-2xl border border-zinc-200 bg-white p-3 text-sm leading-6 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950"
                placeholder="Write something…"
              />
            </label>
          )}
            </form>
        </div>

        <aside className="min-h-0 w-full border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 lg:w-1/2 lg:border-l lg:border-t-0">
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                Live preview
              </div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400">Updates as you type</div>
            </div>
            <div className="min-h-0 flex-1">
              <iframe
                ref={iframeRef}
                src="/cms/preview"
                className="h-full w-full bg-white dark:bg-black"
                onLoad={() => {
                  // In case the iframe loads before we receive the ready message.
                  sendPreviewUpdate();
                }}
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}