const GITHUB_HEADERS = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'GitHub-Roast-Hackathon',
};

export async function fetchGitHubProfile(username, githubToken) {
  const headers = { ...GITHUB_HEADERS };
  if (githubToken) headers.Authorization = `Bearer ${githubToken}`;

  const userRes = await fetch(`https://api.github.com/users/${username}`, { headers });
  if (userRes.status === 404) {
    return { error: 'GitHub user not found. Double-check the username.' };
  }
  if (userRes.status === 403) {
    const remaining = userRes.headers.get('x-ratelimit-remaining');
    if (remaining === '0') {
      return {
        error:
          'GitHub rate limit hit (60/hr without a token). Add GITHUB_TOKEN or try again later.',
      };
    }
    return { error: 'GitHub API blocked the request. Try again in a minute.' };
  }
  if (!userRes.ok) {
    return { error: `GitHub API error (${userRes.status}). Try again shortly.` };
  }

  const user = await userRes.json();
  const reposRes = await fetch(
    `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`,
    { headers },
  );
  const repos = reposRes.ok ? await reposRes.json() : [];

  return { user, repos, stats: buildStats(user, repos) };
}

function buildStats(user, repos) {
  const languageCounts = {};
  let reposWithReadme = 0;
  let staleRepos = 0;
  const now = Date.now();
  const sixMonthsMs = 180 * 24 * 60 * 60 * 1000;

  for (const repo of repos) {
    if (repo.language) {
      languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
    }
    if (repo.has_wiki === false && repo.description) reposWithReadme += 1;
    const pushed = repo.pushed_at ? new Date(repo.pushed_at).getTime() : 0;
    if (pushed && now - pushed > sixMonthsMs) staleRepos += 1;
  }

  const topLanguages = Object.entries(languageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([lang, count]) => `${lang} (${count})`);

  const repoNames = repos.slice(0, 12).map((r) => r.name);
  const recentRepos = repos
    .filter((r) => r.pushed_at)
    .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
    .slice(0, 5)
    .map((r) => `${r.name} (last push: ${r.pushed_at?.slice(0, 10) ?? 'unknown'})`);

  return {
    login: user.login,
    name: user.name,
    bio: user.bio,
    followers: user.followers,
    following: user.following,
    publicRepos: user.public_repos,
    avatarUrl: user.avatar_url,
    createdAt: user.created_at,
    topLanguages: topLanguages.length ? topLanguages : ['mystery stack (no language data)'],
    repoNames: repoNames.length ? repoNames : ['no public repos'],
    recentRepos,
    staleRepoCount: staleRepos,
    totalReposFetched: repos.length,
    reposWithDescription: repos.filter((r) => r.description).length,
    forkCount: repos.filter((r) => r.fork).length,
  };
}

export function buildRoastPrompt(stats) {
  return `Write a VIRAL GitHub roast — 1-2 sentences MAX (under 30 words total). Think Twitter/X one-liner energy: punchy, meme-worthy, brutally specific, screenshot-worthy. Reference ONE real detail (repo name, stale commits, empty bio, follower ratio, language choice). Funny not cruel. No hashtags. No emojis. No filler.

@${stats.login} | ${stats.publicRepos} repos | ${stats.followers} followers | bio: "${stats.bio ?? 'EMPTY'}"
Languages: ${stats.topLanguages.slice(0, 3).join(', ')}
Repos: ${stats.repoNames.slice(0, 6).join(', ')}
${stats.staleRepoCount} repos untouched 6+ months | ${stats.forkCount} forks

Example tone: "Your last commit was so long ago archaeologists are studying it." or "8 repos, 0 READMEs — bold strategy for a developer who hates documentation."

Roast:`;
}

export function buildChatSystemPrompt(stats, roastText) {
  return `You are the GitHub Roast assistant — witty, concise, helpful. The user was just roasted.

Username: ${stats.login}
Roast delivered: ${roastText}
Stats: ${stats.publicRepos} repos, ${stats.followers} followers, languages: ${stats.topLanguages.join(', ')}

Answer follow-up questions about their profile or the roast. Keep replies under 3 sentences. Stay playful, not mean.`;
}

export async function callGroq(messages, apiKey) {
  if (!apiKey) {
    return {
      error:
        'No LLM API key configured. Add GROQ_API_KEY (free at console.groq.com) or OPENROUTER_API_KEY.',
    };
  }

  const useOpenRouter = apiKey.startsWith('sk-or-');
  const url = useOpenRouter
    ? 'https://openrouter.ai/api/v1/chat/completions'
    : 'https://api.groq.com/openai/v1/chat/completions';

  const model = useOpenRouter
    ? 'meta-llama/llama-3.3-70b-instruct'
    : 'llama-3.3-70b-versatile';

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
  if (useOpenRouter) {
    headers['HTTP-Referer'] = 'https://github-roast.pages.dev';
    headers['X-Title'] = 'GitHub Roast';
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages,
      temperature: 1.0,
      max_tokens: 120,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return { error: `LLM request failed (${res.status}): ${body.slice(0, 200)}` };
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) return { error: 'LLM returned an empty response. Try again.' };
  return { text };
}

export async function generateRoast(stats, apiKey) {
  const result = await callGroq(
    [
      { role: 'system', content: 'You write viral one-liner GitHub roasts. Max 2 sentences. Savage but playful. Never hateful.' },
      { role: 'user', content: buildRoastPrompt(stats) },
    ],
    apiKey,
  );
  return result;
}

export async function generateChatReply(stats, roastText, history, userMessage, apiKey) {
  const messages = [
    { role: 'system', content: buildChatSystemPrompt(stats, roastText) },
    ...history.slice(-6),
    { role: 'user', content: userMessage },
  ];
  return callGroq(messages, apiKey);
}

export function buildFullReport(stats, roast) {
  const accountAge = stats.createdAt
    ? Math.floor((Date.now() - new Date(stats.createdAt)) / (365.25 * 24 * 60 * 60 * 1000))
    : '?';

  return `GITHUB ROAST — FULL REPORT
@${stats.login}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔥 YOUR ROAST
${roast}

📊 PROFILE AUTOPSY
• Public repos: ${stats.publicRepos}
• Followers / Following: ${stats.followers} / ${stats.following}
• Account age: ~${accountAge} years
• Top languages: ${stats.topLanguages.join(', ')}
• Stale repos (6+ mo): ${stats.staleRepoCount}
• Repos with descriptions: ${stats.reposWithDescription}/${stats.totalReposFetched}
• Forks: ${stats.forkCount}

📁 REPO HALL OF SHAME
${stats.repoNames.map((r) => `• ${r}`).join('\n')}

⚡ RECENT ACTIVITY
${stats.recentRepos.length ? stats.recentRepos.map((r) => `• ${r}`).join('\n') : '• Nothing. Absolutely nothing.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Roast a friend → https://github-roast.pages.dev
`;
}
