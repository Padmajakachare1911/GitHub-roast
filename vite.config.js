import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fetchGitHubProfile, generateRoast, generateChatReply } from './shared/roastLogic.js';
import { buildFullReport } from './shared/reportBuilder.js';

async function handleSendReport(body, env) {
  const email = (body.email || '').trim().toLowerCase();
  const { username, roast, stats } = body;
  if (!email?.includes('@')) return { status: 400, body: { error: 'Valid email required.' } };
  if (!username || !roast || !stats) return { status: 400, body: { error: 'Missing roast data.' } };

  const report = buildFullReport(stats, roast);
  const resendKey = env.RESEND_API_KEY || process.env.RESEND_API_KEY;
  const brevoKey = env.BREVO_API_KEY || process.env.BREVO_API_KEY;

  if (!resendKey && !brevoKey) {
    return {
      status: 200,
      body: {
        ok: true,
        report,
        emailSent: false,
        emailSkipped: true,
        emailError: 'Email service not configured. Report unlocked on page.',
      },
    };
  }

  try {
    const subject = `Your GitHub Roast Report — @${username}`;
    const html = `<pre style="font-family:system-ui;background:#0d1117;color:#e6edf3;padding:20px;">${report.replace(/</g, '&lt;')}</pre>`;

    if (resendKey) {
      const from = env.RESEND_FROM_EMAIL || 'GitHub Roast <onboarding@resend.dev>';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [email], subject, html, text: report }),
      });
      if (!res.ok) throw new Error(`Email failed: ${(await res.text()).slice(0, 150)}`);
    }

    return { status: 200, body: { ok: true, report, emailSent: true } };
  } catch (err) {
    return {
      status: 200,
      body: { ok: true, report, emailSent: false, emailError: err.message },
    };
  }
}

function apiDevPlugin() {
  return {
    name: 'github-roast-api',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '');
      const getApiKey = () =>
        env.GROQ_API_KEY ||
        process.env.GROQ_API_KEY ||
        env.OPENROUTER_API_KEY ||
        process.env.OPENROUTER_API_KEY;
      const getGithubToken = () => env.GITHUB_TOKEN || process.env.GITHUB_TOKEN;

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
            const roastResult = await generateRoast(clean, apiKey, env.GITHUB_TOKEN);
            
            if (roastResult.error) {
              json(res, 502, { error: roastResult.error });
              return;
            }

            json(res, 200, { roast: roastResult.text, stats: roastResult.stats });
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
            const apiKey = getApiKey();
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

      server.middlewares.use('/api/send-report', async (req, res) => {
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
            const parsed = JSON.parse(body);
            const result = await handleSendReport(parsed, { ...env, ...process.env });
            json(res, result.status, result.body);
          } catch (err) {
            json(res, 502, { error: err.message, emailSent: false });
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), apiDevPlugin()],
});
