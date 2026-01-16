import * as React from "react";
import type { NavLinkItem, NavTemplateComponent } from "./types";
import { NavTemplate } from "./nav";
import { DarkNavTemplate } from "./dark-nav";

export type NavTemplateKey = "nav" | "dark-nav";

export const navTemplates: Record<
  NavTemplateKey,
  { key: NavTemplateKey; label: string; Component: NavTemplateComponent }
> = {
  nav: { key: "nav", label: "Nav (Light)", Component: NavTemplate },
  "dark-nav": { key: "dark-nav", label: "Dark Nav", Component: DarkNavTemplate },
};

export function isNavTemplateKey(x: string): x is NavTemplateKey {
  return x === "nav" || x === "dark-nav";
}

export function getNavTemplateLabel(key: NavTemplateKey) {
  return navTemplates[key].label;
}

export function RenderNavTemplate({
  template,
  title,
  items,
  loadingText,
}: {
  template: string | undefined;
  title: string;
  items: NavLinkItem[];
  loadingText?: string;
}) {
  const key: NavTemplateKey = template && isNavTemplateKey(template) ? template : "nav";
  const Comp = navTemplates[key].Component;
  return <Comp title={title} items={items} loadingText={loadingText} />;
}

