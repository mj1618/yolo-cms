/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ReactNode } from "react";
import {
  HomeTemplate,
  homeSections,
  homeTemplate,
  type HomeSectionInstance,
  type HomeSectionType,
  type HomeTemplateContent,
} from "./home";
import { mergeWithDefaults } from "./types";

export { homeSections };

export const templates = {
  home: homeTemplate,
} as const;

export type TemplateKey = keyof typeof templates | "basic";

export function isTemplateKey(key: string): key is keyof typeof templates {
  return key in templates;
}

export function getTemplateLabel(key: TemplateKey) {
  if (key === "basic") return "Basic (Body)";
  return templates[key].label;
}

type LegacyHomeFlatContent = {
  heroKicker?: unknown;
  heroHeadline?: unknown;
  heroSubheadline?: unknown;
  primaryCtaText?: unknown;
  primaryCtaHref?: unknown;
  secondaryCtaText?: unknown;
  secondaryCtaHref?: unknown;
  highlights?: unknown;
  featuresTitle?: unknown;
  features?: unknown;
  newsletterTitle?: unknown;
  newsletterBlurb?: unknown;
  newsletterPlaceholder?: unknown;
  newsletterButtonText?: unknown;
};

function isLegacyHomeFlatContent(x: unknown): x is LegacyHomeFlatContent {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    "heroHeadline" in o ||
    "heroSubheadline" in o ||
    "highlights" in o ||
    "featuresTitle" in o ||
    "newsletterTitle" in o
  );
}

export function coerceHomeContent(content: unknown): HomeTemplateContent {
  const defaults = homeTemplate.defaultContent;
  const allowedTypes = new Set<string>(homeSections.map((s) => s.key));
  const defsByType = new Map<string, (typeof homeSections)[number]>();
  for (const def of homeSections) defsByType.set(def.key, def);

  function newId(type: string, idx: number) {
    return `${type}-${idx + 1}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function coerceStringList(x: unknown, fallback: string[]) {
    if (!Array.isArray(x)) return fallback;
    return x.filter((v): v is string => typeof v === "string").map((s) => s.trim()).filter(Boolean);
  }

  function coerceInstance(
    inst: any,
    idx: number,
  ): HomeSectionInstance | null {
    const type = typeof inst?.type === "string" ? inst.type : "";
    if (!allowedTypes.has(type)) return null;
    const def = defsByType.get(type);
    if (!def) return null;
    const id = typeof inst?.id === "string" && inst.id.trim() ? inst.id : newId(type, idx);
    const incoming = inst?.data;

    if (type === "hero") {
      return { id, type, data: mergeWithDefaults(def.defaultContent as any, incoming) } as HomeSectionInstance;
    }
    if (type === "newsletter") {
      return { id, type, data: mergeWithDefaults(def.defaultContent as any, incoming) } as HomeSectionInstance;
    }
    if (type === "footer") {
      return { id, type, data: mergeWithDefaults(def.defaultContent as any, incoming) } as HomeSectionInstance;
    }
    if (type === "highlights") {
      const merged = mergeWithDefaults(def.defaultContent as any, incoming) as any;
      return {
        id,
        type,
        data: { items: coerceStringList(merged.items, (def.defaultContent as any).items) },
      } as HomeSectionInstance;
    }
    // features
    const merged = mergeWithDefaults(def.defaultContent as any, incoming) as any;
    return {
      id,
      type,
      data: {
        title: typeof merged.title === "string" ? merged.title : (def.defaultContent as any).title,
        items: coerceStringList(merged.items, (def.defaultContent as any).items),
      },
    } as HomeSectionInstance;
  }

  // Back-compat: previously home content was flat (heroKicker, highlights[], etc.)
  if (isLegacyHomeFlatContent(content)) {
    const c = content as LegacyHomeFlatContent;
    const highlights = Array.isArray(c.highlights) ? c.highlights : [];
    const features = Array.isArray(c.features) ? c.features : [];
    const legacyToInstances: any[] = [
      {
        id: "hero-1",
        type: "hero",
        data: {
          kicker: typeof c.heroKicker === "string" ? c.heroKicker : (defsByType.get("hero") as any).defaultContent.kicker,
          headline: typeof c.heroHeadline === "string" ? c.heroHeadline : (defsByType.get("hero") as any).defaultContent.headline,
          subheadline: typeof c.heroSubheadline === "string" ? c.heroSubheadline : (defsByType.get("hero") as any).defaultContent.subheadline,
          primaryCtaText: typeof c.primaryCtaText === "string" ? c.primaryCtaText : (defsByType.get("hero") as any).defaultContent.primaryCtaText,
          primaryCtaHref: typeof c.primaryCtaHref === "string" ? c.primaryCtaHref : (defsByType.get("hero") as any).defaultContent.primaryCtaHref,
          secondaryCtaText: typeof c.secondaryCtaText === "string" ? c.secondaryCtaText : (defsByType.get("hero") as any).defaultContent.secondaryCtaText,
          secondaryCtaHref: typeof c.secondaryCtaHref === "string" ? c.secondaryCtaHref : (defsByType.get("hero") as any).defaultContent.secondaryCtaHref,
        },
      },
      {
        id: "highlights-1",
        type: "highlights",
        data: { items: highlights.filter((x): x is string => typeof x === "string") },
      },
      {
        id: "features-1",
        type: "features",
        data: {
          title: typeof c.featuresTitle === "string" ? c.featuresTitle : (defsByType.get("features") as any).defaultContent.title,
          items: features.filter((x): x is string => typeof x === "string"),
        },
      },
      {
        id: "newsletter-1",
        type: "newsletter",
        data: {
          title: typeof c.newsletterTitle === "string" ? c.newsletterTitle : (defsByType.get("newsletter") as any).defaultContent.title,
          blurb: typeof c.newsletterBlurb === "string" ? c.newsletterBlurb : (defsByType.get("newsletter") as any).defaultContent.blurb,
          placeholder: typeof c.newsletterPlaceholder === "string" ? c.newsletterPlaceholder : (defsByType.get("newsletter") as any).defaultContent.placeholder,
          buttonText: typeof c.newsletterButtonText === "string" ? c.newsletterButtonText : (defsByType.get("newsletter") as any).defaultContent.buttonText,
        },
      },
      {
        id: "footer-1",
        type: "footer",
        data: (defsByType.get("footer") as any).defaultContent,
      },
    ];
    const coerced = legacyToInstances
      .map((x, i) => coerceInstance(x, i))
      .filter(Boolean) as HomeSectionInstance[];
    return { _sections: coerced.length ? coerced : defaults._sections };
  }

  const obj = content && typeof content === "object" ? (content as Record<string, unknown>) : {};

  // New shape: {_sections: [{id,type,data}]}
  if (Array.isArray((obj as any)._sections)) {
    const incoming = (obj as any)._sections as any[];
    const coerced = incoming
      .map((x, i) => coerceInstance(x, i))
      .filter(Boolean) as HomeSectionInstance[];
    return { _sections: coerced.length ? coerced : defaults._sections };
  }

  // Previous "sectioned by keys" shape: {hero:{}, highlights:{}, ...}
  if (
    obj.hero ||
    obj.highlights ||
    obj.features ||
    obj.newsletter ||
    obj.footer
  ) {
    const next: any[] = [
      { id: "hero-1", type: "hero", data: obj.hero },
      { id: "highlights-1", type: "highlights", data: obj.highlights },
      { id: "features-1", type: "features", data: obj.features },
      { id: "newsletter-1", type: "newsletter", data: obj.newsletter },
      { id: "footer-1", type: "footer", data: obj.footer },
    ];
    const coerced = next
      .map((x, i) => coerceInstance(x, i))
      .filter(Boolean) as HomeSectionInstance[];
    return { _sections: coerced.length ? coerced : defaults._sections };
  }

  return defaults;
}

export function RenderTemplate({
  template,
  content,
  fallback,
}: {
  template: TemplateKey | undefined;
  content: unknown;
  fallback: ReactNode;
}) {
  if (template === "home") {
    return <HomeTemplate content={coerceHomeContent(content)} />;
  }
  return <>{fallback}</>;
}

