"use client";

import * as React from "react";
import { HomeTemplate } from "@/lib/templates/home";
import { coerceHomeContent } from "@/lib/templates";

type PreviewState = {
  template?: string;
  title?: string;
  slug?: string;
  body?: string;
  content?: unknown;
};

export default function CmsPreviewPage() {
  const [state, setState] = React.useState<PreviewState>({});

  React.useEffect(() => {
    type CmsPreviewMessage =
      | { type: "cmsPreviewUpdate"; payload?: PreviewState }
      | { type: string; payload?: unknown };

    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (!e.data || typeof e.data !== "object") return;
      const data = e.data as CmsPreviewMessage;
      if (data.type === "cmsPreviewUpdate") setState(data.payload ?? {});
    }

    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: "cmsPreviewReady" }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const isHome = state.template === "home";

  return (
    <div className="min-h-screen">
      {isHome ? (
        <HomeTemplate content={coerceHomeContent(state.content)} preview />
      ) : (
        <div className="min-h-screen bg-zinc-50 px-6 py-16 font-sans text-zinc-900">
          <div className="mx-auto w-full max-w-3xl">
            <div className="text-xs text-zinc-600">Preview</div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              {state.title || "Untitled"}
            </h1>
            <div className="mt-2 text-sm text-zinc-600">
              /{state.slug || ""}
            </div>
            <pre className="mt-8 whitespace-pre-wrap rounded-2xl border border-zinc-200 bg-white p-4 text-sm leading-6">
              {state.body || " "}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

