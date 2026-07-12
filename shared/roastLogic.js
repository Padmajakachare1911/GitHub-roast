import { buildRoastPrompt, polishRoast, roastMentionsDetail } from './roastPrompt.js';
import { buildFullReport } from './reportBuilder.js';

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

export { buildFullReport } from './reportBuilder.js';

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
      temperature: 1.25,
      max_tokens: 60,
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
  const system =
    'You write viral one-liner GitHub roasts under 15 words. Savage, specific, funny, meme-worthy. Never hateful or discriminatory.';
  const prompt = buildRoastPrompt(stats);

  let result = await callGroq(
    [
      { role: 'system', content: system },
      { role: 'user', content: prompt },
    ],
    apiKey,
  );
  if (result.error) return result;

  let text = polishRoast(result.text);
  if (!roastMentionsDetail(text, stats)) {
    const retry = await callGroq(
      [
        { role: 'system', content: system },
        {
          role: 'user',
          content: `${prompt}\n\nYour last roast was too generic. MUST name "${stats.repoNames[0]}" or cite ${stats.staleRepoCount} stale repos or ${stats.followers} followers.`,
        },
      ],
      apiKey,
    );
    if (!retry.error) text = polishRoast(retry.text);
  }
  return { text };
}

export async function generateChatReply(stats, roastText, history, userMessage, apiKey) {
  const messages = [
    { role: 'system', content: buildChatSystemPrompt(stats, roastText) },
    ...history.slice(-6),
    { role: 'user', content: userMessage },
  ];
  return callGroq(messages, apiKey);
}

