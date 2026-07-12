import { action } from './_generated/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';

function buildFullReport(stats: Record<string, unknown>, roast: string) {
  const login = stats.login as string;
  const publicRepos = stats.publicRepos as number;
  const followers = stats.followers as number;
  const following = stats.following as number;
  const topLanguages = (stats.topLanguages as string[]) ?? [];
  const repoNames = (stats.repoNames as string[]) ?? [];
  const recentRepos = (stats.recentRepos as string[]) ?? [];
  const staleRepoCount = stats.staleRepoCount as number;
  const reposWithDescription = stats.reposWithDescription as number;
  const totalReposFetched = stats.totalReposFetched as number;
  const forkCount = stats.forkCount as number;
  const createdAt = stats.createdAt as string | undefined;

  const accountAge = createdAt
    ? Math.floor((Date.now() - new Date(createdAt).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : '?';

  return `GITHUB ROAST — FULL REPORT
@${login}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔥 YOUR ROAST
${roast}

📊 PROFILE AUTOPSY
• Public repos: ${publicRepos}
• Followers / Following: ${followers} / ${following}
• Account age: ~${accountAge} years
• Top languages: ${topLanguages.join(', ')}
• Stale repos (6+ mo): ${staleRepoCount}
• Repos with descriptions: ${reposWithDescription}/${totalReposFetched}
• Forks: ${forkCount}

📁 REPO HALL OF SHAME
${repoNames.map((r) => `• ${r}`).join('\n')}

⚡ RECENT ACTIVITY
${recentRepos.length ? recentRepos.map((r) => `• ${r}`).join('\n') : '• Nothing. Absolutely nothing.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Roast a friend → https://github-roast.pages.dev
`;
}

function buildHtmlEmail(username: string, roast: string, report: string) {
  const escaped = report.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;background:#0d1117;color:#e6edf3;padding:24px;">
  <div style="max-width:520px;margin:0 auto;background:#161b22;border:1px solid #30363d;border-radius:12px;padding:24px;">
    <h1 style="color:#f85149;margin:0 0 8px;">🔥 GitHub Roast</h1>
    <p style="color:#8b949e;margin:0 0 20px;">Full report for <strong>@${username}</strong></p>
    <blockquote style="border-left:3px solid #f85149;padding-left:16px;font-size:18px;margin:0 0 24px;">
      "${roast.replace(/"/g, '&quot;')}"
    </blockquote>
    <pre style="background:#0d1117;padding:16px;border-radius:8px;font-size:13px;line-height:1.5;white-space:pre-wrap;">${escaped}</pre>
    <p style="margin-top:24px;color:#8b949e;font-size:13px;">
      <a href="https://github-roast.pages.dev" style="color:#f85149;">Roast a friend →</a>
    </p>
  </div>
</body>
</html>`;
}

export const signupAndSend = action({
  args: {
    email: v.string(),
    username: v.string(),
    roast: v.string(),
    stats: v.any(),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (!email.includes('@') || !email.includes('.')) {
      throw new Error('Enter a valid email address.');
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error(
        'Email service not configured. Set RESEND_API_KEY in Convex: npx convex env set RESEND_API_KEY your_key',
      );
    }

    const report = buildFullReport(args.stats, args.roast);
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'GitHub Roast <onboarding@resend.dev>';

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: `🔥 Your GitHub Roast Report — @${args.username}`,
        html: buildHtmlEmail(args.username, args.roast, report),
        text: report,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Email failed to send: ${errBody.slice(0, 200)}`);
    }

    await ctx.runMutation(internal.signups.insert, {
      email,
      username: args.username,
      roast: args.roast,
    });

    return { ok: true };
  },
});
