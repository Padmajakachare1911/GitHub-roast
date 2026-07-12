const PERSONAS = [
  'Write like a viral tech Twitter shitposter.',
  'Write like a Gordon Ramsay dev review.',
  'Write like a stand-up comic roasting a CS student.',
  'Write like a brutally honest senior engineer in a 1:1.',
];

function pickPersona(login) {
  const hash = [...login].reduce((a, c) => a + c.charCodeAt(0), 0);
  return PERSONAS[hash % PERSONAS.length];
}

export function buildRoastPrompt(stats) {
  const topRepo = stats.repoNames[0] ?? 'hello-world';
  const mainLang = stats.topLanguages[0]?.split(' ')[0] ?? 'JavaScript';
  const bio = stats.bio?.trim() || 'EMPTY';
  const ratio =
    stats.following > 0 ? (stats.followers / stats.following).toFixed(1) : String(stats.followers);
  const accountAge = stats.createdAt
    ? Math.floor((Date.now() - new Date(stats.createdAt)) / (365.25 * 24 * 60 * 60 * 1000))
    : '?';
  const forkPct =
    stats.totalReposFetched > 0
      ? Math.round((stats.forkCount / stats.totalReposFetched) * 100)
      : 0;

  return `${pickPersona(stats.login)} Write ONE viral roast line.

RULES:
- MAX 15 words. One punchy sentence.
- Savage, meme-worthy, screenshot-worthy. Like a viral tweet.
- MUST reference a REAL detail below (repo name, language, stale count, followers, bio, or fork %).
- Witty > cruel. No hashtags. No emojis. No quotes.

BAD: "You need to commit more code."
GOOD: "Spoon-Knife outlived your last commit — even Octocat moved on."
GOOD: "47 followers watching you fork tutorials like it's a side hustle."
GOOD: "Empty bio, ${stats.staleRepoCount} dead repos — your GitHub is a ghost town."

@${stats.login}
• Top repo: "${topRepo}" · main lang: ${mainLang}
• ${stats.publicRepos} repos · ${stats.staleRepoCount} stale · ${forkPct}% forks
• ${stats.followers} followers / ${stats.following} following (ratio ${ratio})
• Account ~${accountAge}y · bio: "${bio}"

Roast:`;
}

export function polishRoast(text) {
  let t = text.trim().replace(/^["']|["']$/g, '');
  t = t.replace(/^(Roast:|Here's your roast:?)\s*/i, '');
  t = t.replace(/^@\w+\s*/i, '');
  const sentences = t.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length > 1) t = sentences[0];
  const words = t.split(/\s+/);
  if (words.length > 18) {
    const cut = words.slice(0, 18).join(' ');
    t = /[.!?]$/.test(cut) ? cut : cut.replace(/[,;:]?\s*\S+$/, '') + '.';
  }
  if (t && !/[.!?]$/.test(t)) t += '.';
  return t;
}

export function roastMentionsDetail(text, stats) {
  const lower = text.toLowerCase();
  const checks = [
    stats.login?.toLowerCase(),
    ...(stats.repoNames ?? []).map((r) => r.toLowerCase()),
    ...(stats.topLanguages ?? []).map((l) => l.split(' ')[0].toLowerCase()),
    String(stats.followers),
    String(stats.staleRepoCount),
    stats.bio?.toLowerCase().slice(0, 20),
  ].filter(Boolean);
  return checks.some((c) => c.length > 2 && lower.includes(c));
}
