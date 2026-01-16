export const CMS_PREVIEW_RELOAD_KEY = "cmsPreviewReloadAt";

function canUseDom() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function writeReloadValue(value: number) {
  if (!canUseDom()) return;
  try {
    window.localStorage.setItem(CMS_PREVIEW_RELOAD_KEY, String(value));
  } catch {
    // ignore
  }
}

/**
 * Bump the global "preview reload" token.
 *
 * - Updates localStorage so other tabs (and other routes) can observe via `storage` event
 * - Dispatches a same-tab event so listeners update immediately
 */
export function bumpCmsPreviewReload() {
  const next = Date.now();
  writeReloadValue(next);
  if (!canUseDom()) return next;
  try {
    window.dispatchEvent(new CustomEvent(CMS_PREVIEW_RELOAD_KEY, { detail: next }));
  } catch {
    // ignore
  }
  return next;
}

export function subscribeCmsPreviewReload(onReload: (value: number) => void) {
  if (!canUseDom()) return () => {};

  function onStorage(e: StorageEvent) {
    if (e.key !== CMS_PREVIEW_RELOAD_KEY) return;
    const next = Number(e.newValue);
    if (!Number.isFinite(next)) return;
    onReload(next);
  }

  function onCustom(e: Event) {
    const ce = e as CustomEvent<unknown>;
    const next = Number(ce.detail);
    if (!Number.isFinite(next)) return;
    onReload(next);
  }

  window.addEventListener("storage", onStorage);
  window.addEventListener(CMS_PREVIEW_RELOAD_KEY, onCustom as EventListener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CMS_PREVIEW_RELOAD_KEY, onCustom as EventListener);
  };
}

