import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const add = mutation({
  args: {
    email: v.string(),
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (!email.includes('@')) throw new Error('Invalid email');

    const existing = await ctx.db
      .query('signups')
      .withIndex('by_email', (q) => q.eq('email', email))
      .first();

    if (!existing) {
      await ctx.db.insert('signups', {
        email,
        username: args.username,
        createdAt: Date.now(),
      });
    }

    return { ok: true };
  },
});

export const count = query({
  args: {},
  handler: async (ctx) => {
    const signups = await ctx.db.query('signups').collect();
    return signups.length;
  },
});
