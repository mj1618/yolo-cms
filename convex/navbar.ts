import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";
import { requireSession } from "./authUtils";

function nowMs() {
  return Date.now();
}

const navbarItem = v.union(
  v.object({
    type: v.literal("page"),
    pageId: v.id("pages"),
  }),
  v.object({
    type: v.literal("link"),
    label: v.string(),
    url: v.string(),
  }),
);

export const get = queryGeneric({
  args: { key: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const key = args.key ?? "main";
    return await ctx.db
      .query("navbars")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
  },
});

export const setItems = mutationGeneric({
  args: { sessionToken: v.string(), key: v.optional(v.string()), items: v.array(navbarItem) },
  handler: async (ctx, args) => {
    await requireSession(ctx.db, args.sessionToken);
    const key = args.key ?? "main";
    const ts = nowMs();

    const existing = await ctx.db
      .query("navbars")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();

    if (!existing) {
      return await ctx.db.insert("navbars", {
        key,
        template: "nav",
        items: args.items,
        createdAt: ts,
        updatedAt: ts,
      });
    }

    await ctx.db.patch(existing._id, { items: args.items, updatedAt: ts });
    return existing._id;
  },
});

export const setTemplate = mutationGeneric({
  args: { sessionToken: v.string(), key: v.optional(v.string()), template: v.string() },
  handler: async (ctx, args) => {
    await requireSession(ctx.db, args.sessionToken);
    const key = args.key ?? "main";
    const ts = nowMs();

    const existing = await ctx.db
      .query("navbars")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();

    if (!existing) {
      return await ctx.db.insert("navbars", {
        key,
        template: args.template,
        items: [],
        createdAt: ts,
        updatedAt: ts,
      });
    }

    await ctx.db.patch(existing._id, { template: args.template, updatedAt: ts });
    return existing._id;
  },
});
