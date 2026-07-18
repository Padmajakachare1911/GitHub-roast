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

export async function callGroq(messages, apiKey, tools, tool_choice) {
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

  const body = {
    model,
    messages,
    temperature: 1.25,
    max_tokens: 60,
  };

  if (tools) body.tools = tools;
  if (tool_choice) body.tool_choice = tool_choice;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const bodyStr = await res.text();
    return { error: `LLM request failed (${res.status}): ${bodyStr.slice(0, 200)}` };
  }

  const data = await res.json();
  const message = data.choices?.[0]?.message;
  if (!message) return { error: 'LLM returned an empty response. Try again.' };
  
  return { 
    text: message.content?.trim(), 
    toolCalls: message.tool_calls,
    message 
  };
}

export async function generateRoast(username, apiKey, githubToken) {
  if (!apiKey) {
    const profile = await fetchGitHubProfile(username, githubToken);
    const stats = profile.stats || {
      login: username,
      name: username,
      bio: 'Software developer',
      followers: 42,
      following: 12,
      publicRepos: 15,
      avatarUrl: 'https://github.com/identicons/octocat.png',
      createdAt: new Date().toISOString(),
      topLanguages: ['JavaScript (10)'],
      repoNames: ['hello-world'],
      recentRepos: ['hello-world'],
      staleRepoCount: 3,
      totalReposFetched: 5,
      reposWithDescription: 3,
      forkCount: 1,
    };
    return {
      text: `@${stats.login}: Your repos have been stale since before Internet Explorer retired.`,
      stats,
    };
  }

  const system =
    'You write viral one-liner GitHub roasts under 15 words. Savage, specific, funny, meme-worthy. Never hateful or discriminatory. You must use the fetch_github_profile tool to get the user data before roasting them. If the tool returns an error or says user not found, roast them for making up a fake username or having no profile.';
  
  const tools = [
    {
      type: "function",
      function: {
        name: "fetch_github_profile",
        description: "Fetches a GitHub user's profile statistics and repository data to be used for the roast.",
        parameters: {
          type: "object",
          properties: {
            username: {
              type: "string",
              description: "The GitHub username to fetch data for."
            }
          },
          required: ["username"]
        }
      }
    }
  ];

  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: `Please roast the GitHub profile for: ${username}` }
  ];

  let result = await callGroq(messages, apiKey, tools, "auto");
  if (result.error) return result;

  let finalStats = null;
  let text = result.text || "";

  if (result.toolCalls && result.toolCalls.length > 0) {
    const toolCall = result.toolCalls[0];
    if (toolCall.function.name === 'fetch_github_profile') {
      const args = JSON.parse(toolCall.function.arguments);
      const profile = await fetchGitHubProfile(args.username || username, githubToken);
      
      messages.push(result.message);

      let prompt = "";
      if (profile.error) {
        prompt = `The user tried to fetch a GitHub profile for username "${args.username || username}", but it failed with error: "${profile.error}". Roast them for providing a fake or invalid GitHub username.`;
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: JSON.stringify({ error: profile.error, username: args.username || username })
        });
      } else {
        finalStats = profile.stats;
        prompt = buildRoastPrompt(profile.stats);
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: prompt
        });
      }

      // We explicitly guide the model to roast based on the tool result
      messages.push({ role: 'user', content: prompt });

      const finalResult = await callGroq(messages, apiKey);
      if (finalResult.error) return finalResult;
      text = finalResult.text;
    }
  }

  if (!text) {
     return { text: "You tricked me. No roast for you.", stats: null };
  }

  text = polishRoast(text);
  if (finalStats && !roastMentionsDetail(text, finalStats)) {
    const retry = await callGroq(
      [
        { role: 'system', content: system },
        {
          role: 'user',
          content: `${buildRoastPrompt(finalStats)}\n\nYour last roast was too generic. MUST name "${finalStats.repoNames[0]}" or cite ${finalStats.staleRepoCount} stale repos or ${finalStats.followers} followers.`,
        },
      ],
      apiKey,
    );
    if (!retry.error) text = polishRoast(retry.text);
  }
  return { text, stats: finalStats };
}

export async function generateChatReply(stats, roastText, history, userMessage, apiKey) {
  const messages = [
    { role: 'system', content: buildChatSystemPrompt(stats, roastText) },
    ...history.slice(-6),
    { role: 'user', content: userMessage },
  ];
  return callGroq(messages, apiKey);
}

