# Draft Board

A fantasy draft board for tiering and reranking players, with Claude as a second opinion.
The homepage lets you pick a sport. NFL, NBA, MLB and NHL each have their own page (`/nfl`, `/nba`, …) and their own saved board.

- **Drag and drop** players within a tier or between tiers (mouse, touch or keyboard)
- **↑ / ↓** nudge a player one spot. At the edge of a tier, the player moves into the next tier
- **✂** starts a new tier at that player. **Merge ↑** folds a tier into the one above it
- **Click a name** to mark that player drafted during your draft. **Hide drafted** filters them out
- Position filters, search, overall rank and position rank (RB3, WR7…)
- **Import** a CSV, TSV or spreadsheet paste (`Name, Pos, Team, Tier`), or a JSON export. **Export** saves the board as JSON
- **Ask Claude** sends your board and league settings to Claude, which returns suggested moves with reasons and notes on each tier. You can apply the moves one at a time or all at once

Your board is saved in your browser's localStorage, so there are no accounts and no database.

## Run locally

```bash
npm install
cp .env.example .env.local   # then add your ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
```

## Deploy (GitHub + Vercel)

1. Create an empty repo on GitHub, then:
   ```bash
   git remote add origin https://github.com/<you>/draft-board.git
   git push -u origin main
   ```
2. At [vercel.com/new](https://vercel.com/new), import the repo. Vercel detects Next.js, so you don't need to change any settings.
3. In **Settings → Environment Variables**, add `ANTHROPIC_API_KEY`, then redeploy.

After that, every push to `main` deploys automatically, and pull requests get preview URLs.

## How the Claude part works

`app/api/analyze/route.ts` is a server-side route, so your API key never reaches the browser. It calls
`claude-opus-5-5` with structured outputs: a Zod schema ensures the response is valid JSON in the shape
the UI expects (`summary`, `moves[]`, `tierNotes[]`). If a safety classifier declines a request, the API
automatically retries it on a fallback model.

> ⚠️ Anyone who has your deployed URL can trigger API calls on your key. Before you share it widely, add
> auth (for example Vercel's password protection or a simple shared secret) or a rate limit.

## Layout

```
app/page.tsx                 homepage (sport picker)
app/[sport]/page.tsx         one board page per sport
lib/sports.ts                per-sport settings (name, defaults, sample players)
app/api/analyze/route.ts     Claude endpoint
components/Board.tsx         tiers, drag and drop, toolbar
components/AiPanel.tsx       "Ask Claude" panel
components/ImportDialog.tsx  CSV / JSON import
lib/board.ts                 pure board operations (move, split, merge, import parsing)
lib/sample.ts                placeholder rankings shown on first load
```
