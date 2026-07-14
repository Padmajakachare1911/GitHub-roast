# GitHub Roast

AI roasts your GitHub profile. Share the card, capture emails via Convex, chat with a free-API bot — no Hermes Telegram required.

Try GitHub Roast: https://github-roast-6b8.pages.dev/

## Quick start

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


## Architecture

- **Frontend**: React + Vite
- **API**: Cloudflare Pages Functions (`/api/roast`, `/api/chat`)
- **LLM**: Groq `llama-3.3-70b-versatile` (free) or OpenRouter
- **Database**: Convex (`signups`, `visits` tables)
- **Chat bot**: In-app floating widget — replaces Hermes Telegram for follow-up Q&A

