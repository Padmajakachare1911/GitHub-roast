import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  signups: defineTable({
    email: v.string(),
    username: v.string(),
    roast: v.optional(v.string()),
    emailSent: v.optional(v.boolean()),
    createdAt: v.number(),
  }).index('by_email', ['email']),

  visits: defineTable({
    sessionId: v.string(),
    referrer: v.optional(v.string()),
    path: v.string(),
    createdAt: v.number(),
  })
    .index('by_session', ['sessionId'])
    .index('by_created', ['createdAt']),

  roasts: defineTable({
    username: v.string(),
    createdAt: v.number(),
  }).index('by_created', ['createdAt']),
});
