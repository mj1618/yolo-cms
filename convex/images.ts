import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";
import { nowMs, requireSession } from "./authUtils";

export const generateUploadUrl = mutationGeneric({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    await requireSession(ctx.db, args.sessionToken);
    return await ctx.storage.generateUploadUrl();
  },
});

export const finalizeUpload = mutationGeneric({
  args: {
    sessionToken: v.string(),
    storageId: v.id("_storage"),
    originalFilename: v.optional(v.string()),
    contentType: v.optional(v.string()),
    size: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireSession(ctx.db, args.sessionToken);

    // Light validation (don’t be overly strict; this is a starter CMS).
    if (args.contentType && !args.contentType.startsWith("image/")) {
      throw new Error("Only image uploads are supported");
    }

    const imageId = await ctx.db.insert("images", {
      storageId: args.storageId,
      originalFilename: args.originalFilename,
      contentType: args.contentType,
      size: args.size,
      uploadedBy: user._id,
      createdAt: nowMs(),
    });

    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) throw new Error("Upload not found");

    return { imageId, url, storageId: args.storageId };
  },
});

export const list = queryGeneric({
  args: {
    sessionToken: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireSession(ctx.db, args.sessionToken);
    const limit = Math.min(Math.max(args.limit ?? 60, 1), 200);

    const docs =
      user.role === "admin"
        ? await ctx.db.query("images").withIndex("by_createdAt").order("desc").take(limit)
        : await ctx.db
            .query("images")
            .withIndex("by_uploadedBy_createdAt", (q) => q.eq("uploadedBy", user._id))
            .order("desc")
            .take(limit);

    const out: Array<{
      imageId: string;
      storageId: string;
      url: string | null;
      originalFilename?: string;
      contentType?: string;
      size?: number;
      uploadedBy: string;
      createdAt: number;
    }> = [];

    for (const img of docs) {
      const url = await ctx.storage.getUrl(img.storageId);
      out.push({
        imageId: img._id,
        storageId: img.storageId,
        url,
        originalFilename: img.originalFilename,
        contentType: img.contentType,
        size: img.size,
        uploadedBy: img.uploadedBy,
        createdAt: img.createdAt,
      });
    }
    return out;
  },
});

export const remove = mutationGeneric({
  args: { sessionToken: v.string(), imageId: v.id("images") },
  handler: async (ctx, args) => {
    const { user } = await requireSession(ctx.db, args.sessionToken);
    const img = await ctx.db.get(args.imageId);
    if (!img) return;

    // Only admins can delete anyone’s uploads; others can delete their own.
    if (user.role !== "admin" && img.uploadedBy !== user._id) {
      throw new Error("Forbidden");
    }

    await ctx.db.delete(args.imageId);
    await ctx.storage.delete(img.storageId);
  },
});

// Public helper: turn a storageId into a URL for rendering.
export const getUrl = queryGeneric({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

