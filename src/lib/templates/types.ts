export type TemplateFieldType = "string" | "text" | "url" | "stringList";

export type TemplateField = {
  key: string;
  label: string;
  type: TemplateFieldType;
  placeholder?: string;
  helpText?: string;
};

export type TemplateSectionDefinition<TSection extends object> = {
  key: string;
  label: string;
  fields: readonly TemplateField[];
  defaultContent: TSection;
};

export type TemplateDefinition<TContent extends object> = {
  key: string;
  label: string;
  defaultContent: TContent;
  /**
   * For simple templates, you can define flat fields.
   * For composed templates, prefer `sections`.
   */
  fields?: readonly TemplateField[];
  sections?: readonly TemplateSectionDefinition<Record<string, unknown>>[];
};

export function mergeWithDefaults<T extends object>(
  defaults: T,
  incoming: unknown,
): T {
  if (!incoming || typeof incoming !== "object") return { ...defaults } as T;
  return { ...defaults, ...(incoming as Partial<T>) } as T;
}

