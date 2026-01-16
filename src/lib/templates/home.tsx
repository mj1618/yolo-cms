import Link from "next/link";
import * as React from "react";
import type { TemplateDefinition, TemplateSectionDefinition } from "./types";

export type HomeHeroContent = {
  kicker: string;
  headline: string;
  subheadline: string;
  primaryCtaText: string;
  primaryCtaHref: string;
  secondaryCtaText: string;
  secondaryCtaHref: string;
};

export type HomeHighlightsContent = { items: string[] };
export type HomeFeaturesContent = { title: string; items: string[] };
export type HomeNewsletterContent = {
  title: string;
  blurb: string;
  placeholder: string;
  buttonText: string;
};
export type HomeFooterContent = {
  leftText: string;
  link1Text: string;
  link1Href: string;
  link2Text: string;
  link2Href: string;
};

export type HomeSectionType = "hero" | "highlights" | "features" | "newsletter" | "footer";

export type HomeSectionInstance =
  | { id: string; type: "hero"; data: HomeHeroContent }
  | { id: string; type: "highlights"; data: HomeHighlightsContent }
  | { id: string; type: "features"; data: HomeFeaturesContent }
  | { id: string; type: "newsletter"; data: HomeNewsletterContent }
  | { id: string; type: "footer"; data: HomeFooterContent };

export type HomeTemplateContent = {
  _sections: HomeSectionInstance[];
};

function CmsEditable({
  enabled,
  sectionId,
  fieldKey,
  itemIndex,
  children,
  className,
}: {
  enabled: boolean;
  sectionId: string;
  fieldKey: string;
  itemIndex?: number;
  children: React.ReactNode;
  className?: string;
}) {
  if (!enabled) return <>{children}</>;

  return (
    <span
      data-cms-editable="1"
      data-cms-section-id={sectionId}
      data-cms-field-key={fieldKey}
      data-cms-item-index={itemIndex !== undefined ? String(itemIndex) : undefined}
      className={[
        "inline-block cursor-pointer hover:outline hover:outline-2 hover:outline-blue-500 hover:outline-offset-2",
        className ?? "",
      ].join(" ")}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        window.parent?.postMessage(
          { type: "cmsSelect", payload: { sectionId, fieldKey, itemIndex } },
          window.location.origin,
        );
      }}
    >
      {children}
    </span>
  );
}

const heroSection: TemplateSectionDefinition<HomeHeroContent> = {
  key: "hero",
  label: "Hero",
  fields: [
    { key: "kicker", label: "Kicker", type: "string", placeholder: "New" },
    { key: "headline", label: "Headline", type: "string", placeholder: "Ship a beautiful home page — fully editable." },
    { key: "subheadline", label: "Subheadline", type: "text", placeholder: "A minimal CMS starter powered by Next.js + Convex." },
    { key: "primaryCtaText", label: "Primary CTA text", type: "string", placeholder: "Open CMS" },
    { key: "primaryCtaHref", label: "Primary CTA href", type: "url", placeholder: "/cms" },
    { key: "secondaryCtaText", label: "Secondary CTA text", type: "string", placeholder: "View pages" },
    { key: "secondaryCtaHref", label: "Secondary CTA href", type: "url", placeholder: "/" },
  ],
  defaultContent: {
    kicker: "New",
    headline: "Ship a beautiful home page — fully editable.",
    subheadline: "This template is composed of sections, each with its own schema + editor UI.",
    primaryCtaText: "Open CMS",
    primaryCtaHref: "/cms",
    secondaryCtaText: "View pages",
    secondaryCtaHref: "/",
  },
};

const highlightsSection: TemplateSectionDefinition<HomeHighlightsContent> = {
  key: "highlights",
  label: "Highlights",
  fields: [
    {
      key: "items",
      label: "Highlight pills (one per line)",
      type: "stringList",
      placeholder: "Next.js App Router\nConvex database\nTemplate-driven content",
    },
  ],
  defaultContent: {
    items: ["Next.js App Router", "Convex database", "Template-driven content"],
  },
};

const featuresSection: TemplateSectionDefinition<HomeFeaturesContent> = {
  key: "features",
  label: "Features",
  fields: [
    { key: "title", label: "Section title", type: "string", placeholder: "What you get" },
    {
      key: "items",
      label: "Feature cards (one per line)",
      type: "stringList",
      placeholder: "Simple schema-driven editing\nNice default UI\nFast iteration loop",
    },
  ],
  defaultContent: {
    title: "What you get",
    items: ["Simple schema-driven editing", "Nice default UI", "Fast iteration loop"],
  },
};

const newsletterSection: TemplateSectionDefinition<HomeNewsletterContent> = {
  key: "newsletter",
  label: "Newsletter",
  fields: [
    { key: "title", label: "Title", type: "string", placeholder: "Stay in the loop" },
    { key: "blurb", label: "Blurb", type: "text", placeholder: "A tiny email list for updates. No spam." },
    { key: "placeholder", label: "Email placeholder", type: "string", placeholder: "you@example.com" },
    { key: "buttonText", label: "Button text", type: "string", placeholder: "Notify me" },
  ],
  defaultContent: {
    title: "Stay in the loop",
    blurb: "A tiny email list for updates. No spam, unsubscribe anytime.",
    placeholder: "you@example.com",
    buttonText: "Notify me",
  },
};

const footerSection: TemplateSectionDefinition<HomeFooterContent> = {
  key: "footer",
  label: "Footer",
  fields: [
    { key: "leftText", label: "Left text", type: "string", placeholder: "© 2026 yolo-cms" },
    { key: "link1Text", label: "Link 1 text", type: "string", placeholder: "Index" },
    { key: "link1Href", label: "Link 1 href", type: "url", placeholder: "/" },
    { key: "link2Text", label: "Link 2 text", type: "string", placeholder: "CMS" },
    { key: "link2Href", label: "Link 2 href", type: "url", placeholder: "/cms" },
  ],
  defaultContent: {
    leftText: `© ${new Date().getFullYear()} yolo-cms`,
    link1Text: "Index",
    link1Href: "/",
    link2Text: "CMS",
    link2Href: "/cms",
  },
};

export const homeSections = [
  heroSection,
  highlightsSection,
  featuresSection,
  newsletterSection,
  footerSection,
] as const;

export const homeTemplate: TemplateDefinition<HomeTemplateContent> = {
  key: "home",
  label: "Home",
  sections: homeSections,
  defaultContent: {
    _sections: [
      { id: "hero-1", type: "hero", data: heroSection.defaultContent },
      { id: "highlights-1", type: "highlights", data: highlightsSection.defaultContent },
      { id: "features-1", type: "features", data: featuresSection.defaultContent },
      { id: "newsletter-1", type: "newsletter", data: newsletterSection.defaultContent },
      { id: "footer-1", type: "footer", data: footerSection.defaultContent },
    ],
  },
};

export function HomeTemplate({
  content,
  preview = false,
}: {
  content: HomeTemplateContent;
  preview?: boolean;
}) {
  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900">
      <main className="mx-auto w-full max-w-5xl px-6 py-16">
        <div className="flex flex-col gap-14">
          {(content._sections ?? []).map((s) => {
            if (s.type === "hero")
              return <HomeHeroSection key={s.id} id={s.id} content={s.data} preview={preview} />;
            if (s.type === "highlights")
              return (
                <HomeHighlightsSection key={s.id} id={s.id} content={s.data} preview={preview} />
              );
            if (s.type === "features")
              return (
                <HomeFeaturesSection key={s.id} id={s.id} content={s.data} preview={preview} />
              );
            if (s.type === "newsletter")
              return (
                <HomeNewsletterSection key={s.id} id={s.id} content={s.data} preview={preview} />
              );
            return <HomeFooterSection key={s.id} id={s.id} content={s.data} preview={preview} />;
          })}
        </div>
      </main>
    </div>
  );
}

function HomeHeroSection({
  id,
  content,
  preview,
}: {
  id: string;
  content: HomeHeroContent;
  preview: boolean;
}) {
  return (
    <header className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          <CmsEditable enabled={preview} sectionId={id} fieldKey="kicker">
            {content.kicker}
          </CmsEditable>
        </div>
        <Link className="text-sm font-medium underline" href="/cms">
          CMS
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-8">
          <h1 className="text-pretty text-4xl font-semibold tracking-tight sm:text-5xl">
            <CmsEditable enabled={preview} sectionId={id} fieldKey="headline" className="block">
              {content.headline}
            </CmsEditable>
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600">
            <CmsEditable enabled={preview} sectionId={id} fieldKey="subheadline" className="block">
              {content.subheadline}
            </CmsEditable>
          </p>
        </div>
        <div className="flex flex-col gap-3 lg:col-span-4 lg:items-end">
          <Link
            href={content.primaryCtaHref || "/"}
            className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700"
            onClick={preview ? (e) => e.preventDefault() : undefined}
          >
            <CmsEditable enabled={preview} sectionId={id} fieldKey="primaryCtaText">
              {content.primaryCtaText}
            </CmsEditable>
          </Link>
          <Link
            href={content.secondaryCtaHref || "/"}
            className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
            onClick={preview ? (e) => e.preventDefault() : undefined}
          >
            <CmsEditable enabled={preview} sectionId={id} fieldKey="secondaryCtaText">
              {content.secondaryCtaText}
            </CmsEditable>
          </Link>
        </div>
      </div>
    </header>
  );
}

function HomeHighlightsSection({
  id,
  content,
  preview,
}: {
  id: string;
  content: HomeHighlightsContent;
  preview: boolean;
}) {
  return (
    <section className="flex flex-wrap gap-2">
      {(content.items ?? []).map((h, idx) => (
        <div
          key={`${h}-${idx}`}
          className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-700"
        >
          <CmsEditable enabled={preview} sectionId={id} fieldKey="items" itemIndex={idx}>
            {h}
          </CmsEditable>
        </div>
      ))}
    </section>
  );
}

function HomeFeaturesSection({
  id,
  content,
  preview,
}: {
  id: string;
  content: HomeFeaturesContent;
  preview: boolean;
}) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-tight">
          <CmsEditable enabled={preview} sectionId={id} fieldKey="title">
            {content.title}
          </CmsEditable>
        </h2>
        <div className="text-xs text-zinc-600">Template: home</div>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(content.items ?? []).map((f, idx) => (
          <div
            key={`${f}-${idx}`}
            className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
          >
            <div className="text-sm font-medium">
              <CmsEditable enabled={preview} sectionId={id} fieldKey="items" itemIndex={idx}>
                {f}
              </CmsEditable>
            </div>
            <div className="mt-2 text-xs text-zinc-600">Edit this item in the CMS.</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HomeNewsletterSection({
  id,
  content,
  preview,
}: {
  id: string;
  content: HomeNewsletterContent;
  preview: boolean;
}) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-12 md:items-center">
        <div className="md:col-span-7">
          <h3 className="text-lg font-semibold tracking-tight">
            <CmsEditable enabled={preview} sectionId={id} fieldKey="title">
              {content.title}
            </CmsEditable>
          </h3>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            <CmsEditable enabled={preview} sectionId={id} fieldKey="blurb" className="block">
              {content.blurb}
            </CmsEditable>
          </p>
        </div>
        <form className="flex flex-col gap-3 md:col-span-5" onSubmit={(e) => e.preventDefault()}>
          <input
            className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none ring-zinc-400 focus:ring-2"
            placeholder={content.placeholder}
          />
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700"
          >
            <CmsEditable enabled={preview} sectionId={id} fieldKey="buttonText">
              {content.buttonText}
            </CmsEditable>
          </button>
          <div className="text-xs text-zinc-600">Demo only (no email integration).</div>
        </form>
      </div>
    </section>
  );
}

function HomeFooterSection({
  id,
  content,
  preview,
}: {
  id: string;
  content: HomeFooterContent;
  preview: boolean;
}) {
  return (
    <footer className="flex items-center justify-between gap-4 border-t border-zinc-200 pt-8 text-xs text-zinc-600">
      <div>
        <CmsEditable enabled={preview} sectionId={id} fieldKey="leftText">
          {content.leftText}
        </CmsEditable>
      </div>
      <div className="flex items-center gap-3">
        <Link
          className="underline"
          href={content.link1Href || "/"}
          onClick={preview ? (e) => e.preventDefault() : undefined}
        >
          <CmsEditable enabled={preview} sectionId={id} fieldKey="link1Text">
            {content.link1Text}
          </CmsEditable>
        </Link>
        <Link
          className="underline"
          href={content.link2Href || "/cms"}
          onClick={preview ? (e) => e.preventDefault() : undefined}
        >
          <CmsEditable enabled={preview} sectionId={id} fieldKey="link2Text">
            {content.link2Text}
          </CmsEditable>
        </Link>
      </div>
    </footer>
  );
}

