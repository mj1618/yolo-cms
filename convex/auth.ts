import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";
import {
  constantTimeEqual,
  hashPassword,
  hasAnyUsers,
  newRandomToken,
  newSalt,
  normalizeEmail,
  nowMs,
  requireSession,
} from "./authUtils";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export const hasAny = queryGeneric({
  args: {},
  handler: async (ctx) => {
    return await hasAnyUsers(ctx.db);
  },
});

export const me = queryGeneric({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const token = args.sessionToken?.trim() ?? "";
    if (!token) return null;
    try {
      const { user } = await requireSession(ctx.db, token);
      return { id: user._id, email: user.email, role: user.role };
    } catch {
      return null;
    }
  },
});

export const bootstrapFirstUser = mutationGeneric({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const already = await hasAnyUsers(ctx.db);
    if (already) {
      throw new Error("Users already exist. First-user setup is disabled.");
    }

    const email = normalizeEmail(args.email);
    const password = args.password;
    if (!email.includes("@")) throw new Error("Enter a valid email");
    if (password.length < 10) throw new Error("Password must be at least 10 characters");

    const ts = nowMs();
    const salt = newSalt();
    const passwordHash = await hashPassword(password, salt);

    const userId = await ctx.db.insert("users", {
      email,
      passwordHash,
      passwordSalt: salt,
      role: "admin",
      createdAt: ts,
      updatedAt: ts,
    });

    const token = newRandomToken();
    await ctx.db.insert("sessions", {
      token,
      userId,
      createdAt: ts,
      expiresAt: ts + SESSION_TTL_MS,
    });

    return { sessionToken: token, userId };
  },
});

export const login = mutationGeneric({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    const password = args.password;
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (!user) throw new Error("Invalid email or password");

    const expected = user.passwordHash as string;
    const computed = await hashPassword(password, user.passwordSalt as string);
    if (!constantTimeEqual(expected, computed)) {
      throw new Error("Invalid email or password");
    }

    const ts = nowMs();
    const token = newRandomToken();
    await ctx.db.insert("sessions", {
      token,
      userId: user._id,
      createdAt: ts,
      expiresAt: ts + SESSION_TTL_MS,
    });

    return { sessionToken: token, userId: user._id };
  },
});

export const logout = mutationGeneric({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const token = args.sessionToken.trim();
    if (!token) return;
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!session) return;
    await ctx.db.delete(session._id);
  },
});

export const createUser = mutationGeneric({
  args: {
    sessionToken: v.string(),
    email: v.string(),
    password: v.string(),
    role: v.optional(v.union(v.literal("admin"), v.literal("editor"))),
  },
  handler: async (ctx, args) => {
    const { user: actor } = await requireSession(ctx.db, args.sessionToken);
    if (actor.role !== "admin") throw new Error("Forbidden");

    const email = normalizeEmail(args.email);
    const password = args.password;
    if (!email.includes("@")) throw new Error("Enter a valid email");
    if (password.length < 10) throw new Error("Password must be at least 10 characters");

    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (existing) throw new Error("User already exists");

    const ts = nowMs();
    const salt = newSalt();
    const passwordHash = await hashPassword(password, salt);

    return await ctx.db.insert("users", {
      email,
      passwordHash,
      passwordSalt: salt,
      role: args.role ?? "editor",
      createdAt: ts,
      updatedAt: ts,
    });
  },
});

export const listUsers = queryGeneric({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const { user: actor } = await requireSession(ctx.db, args.sessionToken);
    if (actor.role !== "admin") throw new Error("Forbidden");
    const users = await ctx.db.query("users").collect();
    return users.map((u) => ({
      id: u._id,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));
  },
});

export const removeUser = mutationGeneric({
  args: { sessionToken: v.string(), userId: v.id("users") },
  handler: async (ctx, args) => {
    const { user: actor } = await requireSession(ctx.db, args.sessionToken);
    if (actor.role !== "admin") throw new Error("Forbidden");
    if (actor._id === args.userId) throw new Error("You can't remove your own user while signed in.");

    const target = await ctx.db.get(args.userId);
    if (!target) return;

    // Clean up sessions for this user.
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
    for (const s of sessions) {
      await ctx.db.delete(s._id);
    }

    await ctx.db.delete(args.userId);
  },
});
