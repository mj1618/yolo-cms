export const CMS_SESSION_COOKIE = "cms_session";

export function readCookie(name: string) {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split(";").map((p) => p.trim());
  for (const p of parts) {
    if (!p) continue;
    const idx = p.indexOf("=");
    if (idx === -1) continue;
    const k = p.slice(0, idx).trim();
    if (k !== name) continue;
    const v = p.slice(idx + 1);
    try {
      return decodeURIComponent(v);
    } catch {
      return v;
    }
  }
  return null;
}

export function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  const maxAge = 60 * 60 * 24 * 7; // 7 days
  const encoded = encodeURIComponent(value);
  // Not httpOnly on purpose: the CMS client needs to read it to call protected Convex functions.
  document.cookie = `${name}=${encoded}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

export function clearCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function readCmsSessionToken() {
  return readCookie(CMS_SESSION_COOKIE);
}

export function setCmsSessionToken(token: string) {
  writeCookie(CMS_SESSION_COOKIE, token);
}

export function clearCmsSessionToken() {
  clearCookie(CMS_SESSION_COOKIE);
}

