"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { anyApi } from "convex/server";

const api = anyApi;

type MediaItem = {
  imageId: string;
  storageId: string;
  url: string | null;
  originalFilename?: string;
  contentType?: string;
  size?: number;
  uploadedBy: string;
  createdAt: number;
};

export function MediaLibraryModal({
  sessionToken,
  open,
  onClose,
  onSelectUrl,
  title = "Media library",
  limit = 120,
}: {
  sessionToken: string;
  open: boolean;
  onClose: () => void;
  onSelectUrl: (url: string) => void;
  title?: string;
  limit?: number;
}) {
  const items = useQuery(
    api.images.list,
    open ? ({ sessionToken, limit } as any) : ("skip" as any),
  ) as MediaItem[] | undefined;

  const generateUploadUrl = useMutation(api.images.generateUploadUrl);
  const finalizeUpload = useMutation(api.images.finalizeUpload);
  const removeImage = useMutation(api.images.remove);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setError(null);
      setIsUploading(false);
    }
  }, [open]);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  async function uploadFile(file: File) {
    setError(null);
    setIsUploading(true);
    try {
      const uploadUrl = (await generateUploadUrl({ sessionToken })) as unknown as string;
      if (!uploadUrl || typeof uploadUrl !== "string") throw new Error("Failed to get upload URL");

      const resp = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!resp.ok) throw new Error(`Upload failed (${resp.status})`);
      const json = (await resp.json()) as unknown as { storageId?: string };
      const storageId = typeof json?.storageId === "string" ? json.storageId : "";
      if (!storageId) throw new Error("Upload did not return a storageId");

      await finalizeUpload({
        sessionToken,
        storageId: storageId as any,
        originalFilename: file.name,
        contentType: file.type,
        size: file.size,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{title}</div>
            <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              Upload, select, or delete images.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0] ?? null;
                e.target.value = "";
                if (!file) return;
                await uploadFile(file);
              }}
            />
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
            >
              {isUploading ? "Uploading…" : "Upload"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
            >
              Close
            </button>
          </div>
        </div>

        {error ? (
          <div className="border-b border-zinc-200 px-5 py-3 text-sm text-red-600 dark:border-zinc-800 dark:text-red-400">
            {error}
          </div>
        ) : null}

        <div className="max-h-[70vh] overflow-y-auto p-5">
          {items === undefined ? (
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-8 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-black dark:text-zinc-400">
              No uploads yet. Click “Upload” to add your first image.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((it) => (
                <div
                  key={it.imageId}
                  className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black"
                >
                  <button
                    type="button"
                    className="block w-full text-left"
                    onClick={() => {
                      if (!it.url) return;
                      onSelectUrl(it.url);
                      onClose();
                    }}
                    disabled={!it.url}
                    title={it.url ? "Select" : "URL not available yet"}
                  >
                    <div className="aspect-[4/3] w-full bg-zinc-100 dark:bg-zinc-900">
                      {it.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={it.url}
                          alt={it.originalFilename ?? ""}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
                          Unavailable
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <div className="truncate text-xs font-medium text-zinc-900 dark:text-zinc-50">
                        {it.originalFilename ?? "Untitled"}
                      </div>
                      <div className="mt-1 truncate text-[11px] text-zinc-600 dark:text-zinc-400">
                        {new Date(it.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center justify-between gap-2 border-t border-zinc-200 p-2 dark:border-zinc-800">
                    <button
                      type="button"
                      className="inline-flex h-8 items-center justify-center rounded-full bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
                      disabled={!it.url}
                      onClick={() => {
                        if (!it.url) return;
                        onSelectUrl(it.url);
                        onClose();
                      }}
                    >
                      Select
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-8 items-center justify-center rounded-full px-3 text-xs font-medium text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-zinc-900"
                      onClick={async () => {
                        if (!confirm(`Delete "${it.originalFilename ?? "this image"}"?`)) return;
                        try {
                          await removeImage({ sessionToken, imageId: it.imageId as any });
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "Delete failed");
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

