import { fetchGitHubProfile, generateRoast } from '../../shared/roastLogic.js';

export async function onRequestPost(context) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const body = await context.request.json();
    const username = (body.username || '').trim().replace(/^@/, '');
    if (!username || !/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(username)) {
      return new Response(JSON.stringify({ error: 'Enter a valid GitHub username.' }), {
        status: 400,
        headers: cors,
      });
    }

    const apiKey = context.env.GROQ_API_KEY || context.env.OPENROUTER_API_KEY;
    const githubToken = context.env.GITHUB_TOKEN;

    const roastResult = await generateRoast(username, apiKey, githubToken);
    
    if (roastResult.error) {
      return new Response(JSON.stringify({ error: roastResult.error }), { status: 502, headers: cors });
    }

    return new Response(
      JSON.stringify({ roast: roastResult.text, stats: roastResult.stats }),
      { status: 200, headers: cors },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Unexpected server error.' }), {
      status: 500,
      headers: cors,
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
