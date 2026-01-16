import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * NOTE: This starts minimal and will be expanded in later todos (auth, pages, nav, etc.).
 * Keeping a valid schema file early helps Convex codegen/dev work smoothly.
 */
export default defineSchema({
  pages: defineTable({
    slug: v.string(),
    title: v.string(),
    body: v.string(),
    template: v.optional(v.string()),
    content: v.optional(v.any()),
    published: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_published_updatedAt", ["published", "updatedAt"])
    .index("by_updatedAt", ["updatedAt"]),

  images: defineTable({
    storageId: v.id("_storage"),
    originalFilename: v.optional(v.string()),
    contentType: v.optional(v.string()),
    size: v.optional(v.number()),
    uploadedBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_storageId", ["storageId"])
    .index("by_createdAt", ["createdAt"])
    .index("by_uploadedBy_createdAt", ["uploadedBy", "createdAt"]),

  navbars: defineTable({
    key: v.string(), // e.g. "main"
    items: v.array(
      v.union(
        v.object({
          type: v.literal("page"),
          pageId: v.id("pages"),
        }),
        v.object({
          type: v.literal("link"),
          label: v.string(),
          url: v.string(),
        }),
      ),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  users: defineTable({
    email: v.string(),
    passwordHash: v.string(),
    passwordSalt: v.string(),
    role: v.union(v.literal("admin"), v.literal("editor")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_email", ["email"]),

  sessions: defineTable({
    token: v.string(),
    userId: v.id("users"),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_userId", ["userId"]),
});

