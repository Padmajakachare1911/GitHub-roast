# GitHub Roast

AI roasts your GitHub profile. Share the card, capture emails via Convex, chat with a free-API bot — no Hermes Telegram required.

## Skip Hermes Telegram

If `hermes gateway` is stuck, **you don't need it**. Use Cursor (or terminal) to build, and use the in-app **Roast Bot** (bottom-right chat) powered by Groq/OpenRouter free API instead.

## Tonight's setup (no product code needed on Hermes)

| Step | Status |
|------|--------|
| WSL2 + Hermes | Optional for coding — Cursor works fine |
| LLM API key | **Required** — [Groq](https://console.groq.com) (free) or OpenRouter |
| Convex account | [convex.dev](https://convex.dev) |
| Cloudflare account | [cloudflare.com](https://cloudflare.com) |
| Telegram bot | **Skipped** — use in-app chat bot |

## Quick start (build day)

```bash
cd github-roast
npm install
cp .env.example .env
# Add GROQ_API_KEY to .env (free at console.groq.com)

# Terminal 1 — Convex (email signups + visit analytics)
npx convex dev

# Terminal 2 — Frontend + local API
npm run dev
```

Open http://localhost:5173 — enter a GitHub username, get roasted.

## Environment variables

| Variable | Where | Required |
|----------|-------|----------|
| `GROQ_API_KEY` | `.env` + Cloudflare secret | Yes (or OpenRouter) |
| `VITE_CONVEX_URL` | `.env.local` (auto from convex dev) | For signups/analytics |
| `VITE_DATAFAST_WEBSITE_ID` | `.env` + Cloudflare build env | DataFast tracking (`dfid_…`) |
| `VITE_DATAFAST_DOMAIN` | `.env` + Cloudflare build env | Your live domain (e.g. `github-roast-6b8.pages.dev`) |
| `GITHUB_TOKEN` | `.env` + Cloudflare secret | Optional (rate limits) |

## Deploy to Cloudflare Pages

```bash
npm run build
npx wrangler pages deploy dist --project-name=github-roast
npx wrangler pages secret put GROQ_API_KEY
npx wrangler pages secret put GITHUB_TOKEN   # optional
```

Set `VITE_CONVEX_URL`, `VITE_DATAFAST_WEBSITE_ID`, and `VITE_DATAFAST_DOMAIN` in Cloudflare Pages → Settings → Environment variables (build-time).

## DataFast analytics

1. Create a website at [datafa.st](https://datafa.st) → copy **Website ID** (`dfid_…`) from Settings → General.
2. Set `data-domain` to your live URL (currently `github-roast-6b8.pages.dev`).
3. Add build env vars in Cloudflare Pages (or `.env.production` locally), then redeploy.
4. Optional: set `signup` as your #1 KPI in DataFast website settings.

Tracked goals: `roast` (username), `signup` (email sent flag).

## Architecture

- **Frontend**: React + Vite
- **API**: Cloudflare Pages Functions (`/api/roast`, `/api/chat`)
- **LLM**: Groq `llama-3.3-70b-versatile` (free) or OpenRouter
- **Database**: Convex (`signups`, `visits` tables)
- **Chat bot**: In-app floating widget — replaces Hermes Telegram for follow-up Q&A

## One-paragraph setup report (template)

> Model: Llama 3.3 70B via Groq (free tier). Tool route: Cursor + npm scripts (Hermes Telegram skipped). Channel: in-app Roast Bot + browser. Memory: Convex for signups/visits. Still missing: [your Groq API key / Convex init / Cloudflare deploy].

## Hackathon checklist

- [ ] `GROQ_API_KEY` in `.env`
- [ ] `npx convex dev` running, signups visible in dashboard
- [ ] Test 3+ real GitHub usernames
- [ ] Mobile looks good
- [ ] Deployed `.pages.dev` URL tested on phone data
- [ ] Post by 2:30 with screen recording
