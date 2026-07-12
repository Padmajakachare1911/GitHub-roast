import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fetchGitHubProfile, generateRoast, generateChatReply } from './shared/roastLogic.js';

function apiDevPlugin() {
  return {
    name: 'github-roast-api',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '');

      const json = (res, status, body) => {
        res.statusCode = status;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(body));
      };

      server.middlewares.use('/api/roast', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }
        if (req.method !== 'POST') {
          json(res, 405, { error: 'Method not allowed' });
          return;
        }

        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', async () => {
          try {
            const { username } = JSON.parse(body);
            const clean = (username || '').trim().replace(/^@/, '');
            if (!clean) {
              json(res, 400, { error: 'Enter a valid GitHub username.' });
              return;
            }

            const apiKey = env.GROQ_API_KEY || env.OPENROUTER_API_KEY;
            const profile = await fetchGitHubProfile(clean, env.GITHUB_TOKEN);
            if (profile.error) {
              json(res, profile.error.includes('not found') ? 404 : 429, { error: profile.error });
              return;
            }

            const roast = await generateRoast(profile.stats, apiKey);
            if (roast.error) {
              json(res, 502, { error: roast.error });
              return;
            }

            json(res, 200, { roast: roast.text, stats: profile.stats });
          } catch (err) {
            json(res, 500, { error: err.message });
          }
        });
      });

      server.middlewares.use('/api/chat', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }
        if (req.method !== 'POST') {
          json(res, 405, { error: 'Method not allowed' });
          return;
        }

        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', async () => {
          try {
            const { message, stats, roast, history = [] } = JSON.parse(body);
            const apiKey = env.GROQ_API_KEY || env.OPENROUTER_API_KEY;
            const reply = await generateChatReply(stats, roast, history, message, apiKey);
            if (reply.error) {
              json(res, 502, { error: reply.error });
              return;
            }
            json(res, 200, { reply: reply.text });
          } catch (err) {
            json(res, 500, { error: err.message });
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), apiDevPlugin()],
});
