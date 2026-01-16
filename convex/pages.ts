import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";
import { requireSession } from "./authUtils";

function nowMs() {
  return Date.now();
}

function normalizeSlug(slug: string) {
  const trimmed = slug.trim().toLowerCase();
  const replaced = trimmed
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
  return replaced || "untitled";
}

export const list = queryGeneric({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    await requireSession(ctx.db, args.sessionToken);
    return await ctx.db.query("pages").withIndex("by_updatedAt").order("desc").collect();
  },
});

export const hasAny = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const one = await ctx.db.query("pages").take(1);
    return one.length > 0;
  },
});

export const listPublished = queryGeneric({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("pages")
      .withIndex("by_published_updatedAt", (q) => q.eq("published", true))
      .order("desc")
      .collect();
  },
});

export const get = queryGeneric({
  args: { sessionToken: v.string(), id: v.id("pages") },
  handler: async (ctx, args) => {
    await requireSession(ctx.db, args.sessionToken);
    return await ctx.db.get(args.id);
  },
});

export const getBySlug = queryGeneric({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const slug = normalizeSlug(args.slug);
    return await ctx.db
      .query("pages")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
  },
});

export const create = mutationGeneric({
  args: {
    sessionToken: v.string(),
    slug: v.optional(v.string()),
    title: v.string(),
    body: v.optional(v.string()),
    template: v.optional(v.string()),
    content: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await requireSession(ctx.db, args.sessionToken);
    const ts = nowMs();
    const title = args.title.trim() || "Untitled";
    const slug = normalizeSlug(args.slug ?? title);
    const existing = await ctx.db
      .query("pages")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (existing) {
      throw new Error(`Page with slug "${slug}" already exists`);
    }
    return await ctx.db.insert("pages", {
      slug,
      title,
      body: args.body ?? "",
      template: args.template ?? "basic",
      content: args.content ?? {},
      published: false,
      createdAt: ts,
      updatedAt: ts,
    });
  },
});

export const update = mutationGeneric({
  args: {
    sessionToken: v.string(),
    id: v.id("pages"),
    slug: v.optional(v.string()),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
    template: v.optional(v.string()),
    content: v.optional(v.any()),
    published: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireSession(ctx.db, args.sessionToken);
    const page = await ctx.db.get(args.id);
    if (!page) throw new Error("Page not found");

    const patch: Partial<typeof page> & { updatedAt: number } = {
      updatedAt: nowMs(),
    };

    if (args.title !== undefined) patch.title = args.title.trim() || "Untitled";
    if (args.body !== undefined) patch.body = args.body;
    if (args.template !== undefined) patch.template = args.template;
    if (args.content !== undefined) patch.content = args.content;
    if (args.published !== undefined) patch.published = args.published;

    if (args.slug !== undefined) {
      const nextSlug = normalizeSlug(args.slug);
      const existing = await ctx.db
        .query("pages")
        .withIndex("by_slug", (q) => q.eq("slug", nextSlug))
        .unique();
      if (existing && existing._id !== args.id) {
        throw new Error(`Page with slug "${nextSlug}" already exists`);
      }
      patch.slug = nextSlug;
    }

    await ctx.db.patch(args.id, patch);
  },
});

export const remove = mutationGeneric({
  args: { sessionToken: v.string(), id: v.id("pages") },
  handler: async (ctx, args) => {
    await requireSession(ctx.db, args.sessionToken);
    await ctx.db.delete(args.id);
  },
});

