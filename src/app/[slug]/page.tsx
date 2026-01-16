"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { anyApi } from "convex/server";
import { SiteNavbar } from "@/components/SiteNavbar";
import { RichHtml } from "@/components/RichTextEditor";
import type { PageDoc } from "@/lib/cmsTypes";
import { readCmsSessionToken } from "@/lib/cmsSession";
import { isTemplateKey, RenderTemplate, type TemplateKey } from "@/lib/templates";

const api = anyApi;

type PageDocWithTemplate = PageDoc & { template?: string; content?: unknown };

function Shell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <SiteNavbar title="yolo-cms" />
      {children}
    </div>
  );
}

function SlugPageWithConvex({ slug }: { slug: string }) {
  const page = useQuery(api.pages.getBySlug, { slug }) as PageDoc | null | undefined;
  const searchParams = useSearchParams();
  const isPreview = searchParams.get("preview") === "1" && Boolean(readCmsSessionToken());

  if (page === undefined) {
    return (
      <Shell>
        <div className="mx-auto w-full max-w-3xl px-6 py-10 font-sans">
          <div className="text-sm text-zinc-600">Loading…</div>
        </div>
      </Shell>
    );
  }

  if (!page) {
    return (
      <Shell>
        <div className="mx-auto w-full max-w-3xl px-6 py-10 font-sans">
          <h1 className="text-2xl font-semibold tracking-tight">Not found</h1>
          <p className="mt-3 text-sm text-zinc-600">
            No page exists at <span className="font-mono">/{slug}</span>.
          </p>
          <div className="mt-6">
            <Link className="text-sm font-medium underline" href="/cms">
              Go to CMS
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  if (!page.published && !isPreview) {
    return (
      <Shell>
        <div className="mx-auto w-full max-w-3xl px-6 py-10 font-sans">
          <h1 className="text-2xl font-semibold tracking-tight">{page.title}</h1>
          <p className="mt-3 text-sm text-zinc-600">
            This page is currently a draft.
          </p>
          <div className="mt-6">
            <Link className="text-sm font-medium underline" href={`/cms/pages/${page._id}`}>
              Edit in CMS
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  const pageWithTemplate = page as PageDocWithTemplate;
  const rawTemplate = typeof pageWithTemplate.template === "string" ? pageWithTemplate.template : "";
  const template: TemplateKey | undefined =
    rawTemplate === "basic" ? "basic" : isTemplateKey(rawTemplate) ? rawTemplate : undefined;
  const fallback = (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 font-sans">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{page.title}</h1>
          <div className="mt-2 text-sm text-zinc-600">/{page.slug}</div>
        </div>
        <Link className="text-sm font-medium underline" href="/cms">
          CMS
        </Link>
      </header>

      <RichHtml html={page.body} className="prose prose-zinc mt-10 max-w-none" />
    </div>
  );

  return (
    <Shell>
      {isPreview && !page.published ? (
        <div className="mx-auto w-full max-w-5xl px-6 pt-4 font-sans">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Previewing draft content (visible only to CMS users).
          </div>
        </div>
      ) : null}
      <RenderTemplate template={template} content={pageWithTemplate.content} fallback={fallback} />
    </Shell>
  );
}

export default function SlugPage() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";

  if (!convexUrl) {
    return (
      <div className="min-h-screen bg-zinc-50 px-6 py-16 font-sans text-zinc-900">
        <div className="mx-auto w-full max-w-3xl">
          <h1 className="text-2xl font-semibold tracking-tight">Page</h1>
          <p className="mt-3 text-sm text-zinc-600">
            Convex isn’t configured yet. Set{" "}
            <span className="font-mono">NEXT_PUBLIC_CONVEX_URL</span>.
          </p>
          <div className="mt-6">
            <Link className="text-sm font-medium underline" href="/">
              Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <SlugPageWithConvex slug={slug} />;
}
