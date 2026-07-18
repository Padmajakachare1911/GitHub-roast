import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const record = mutation({
  args: {
    username: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('roasts', {
      username: args.username,
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

export const getTodayCount = query({
  args: {
    startOfToday: v.number(),
  },
  handler: async (ctx, args) => {
    const todayRoasts = await ctx.db
      .query('roasts')
      .withIndex('by_created', (q) => q.gte('createdAt', args.startOfToday))
      .collect();
    return todayRoasts.length;
  },
});
