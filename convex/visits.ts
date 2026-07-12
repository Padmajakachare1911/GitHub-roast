import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const log = mutation({
  args: {
    sessionId: v.string(),
    referrer: v.optional(v.string()),
    path: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('visits')
      .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
      .first();

    if (!existing) {
      await ctx.db.insert('visits', {
        sessionId: args.sessionId,
        referrer: args.referrer,
        path: args.path,
        createdAt: Date.now(),
      });
    }

    return { ok: true };
  },
});

export const count = query({
  args: {},
  handler: async (ctx) => {
    const visits = await ctx.db.query('visits').collect();
    return visits.length;
  },
});
