import { mutation, internalMutation, query } from './_generated/server';
import { v } from 'convex/values';

export const insert = internalMutation({
  args: {
    email: v.string(),
    username: v.string(),
    roast: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const existing = await ctx.db
      .query('signups')
      .withIndex('by_email', (q) => q.eq('email', email))
      .first();

    if (!existing) {
      await ctx.db.insert('signups', {
        email,
        username: args.username,
        roast: args.roast,
        emailSent: true,
        createdAt: Date.now(),
      });
    } else {
      await ctx.db.patch(existing._id, {
        username: args.username,
        roast: args.roast,
        emailSent: true,
      });
    }
  },
});

export const count = query({
  args: {},
  handler: async (ctx) => {
    const signups = await ctx.db.query('signups').collect();
    return signups.length;
  },
});
