# Gist: summaries that cite their sources

Upload a PDF or paste text, read it through four lenses, and verify any point by clicking the page it came from.

- **Four lenses**: Executive Brief, Action Items, ELI5, Critical Review. Same document, different questions.
- **Checkable citations**: every point carries page (or ¶) chips; clicking one scrolls the PDF viewer to that page.
- **Streaming structured output**: summaries render card-by-card as JSON streams in, validated against a Zod schema before caching, with one automatic strict-schema retry when a free model emits malformed JSON.
- **Instant samples**: three documents with all lenses precomputed, so the demo works even if the model provider is down.
- **No sign-up**: an anonymous per-browser cookie scopes history; share links are opt-in; uploads auto-delete after 7 days.

## How it works

```
Browser                                   Server (Vercel)                      Supabase
───────                                   ───────────────                      ────────
pdf.js extracts text per page ──POST /api/documents──► dedupe by content hash ──► documents
PDF uploaded to signed URL ─────────────────────────────────────────────────────► storage/uploads
useObject ──────────────POST /api/summarize──► cache hit? ──────────────────────► summaries
                                               rate limit (5/h per IP) ─────────► rate_events
                         ◄── streamed JSON ─── OpenRouter free models (fallback list)
```

Design decisions worth noting:

- **Text is extracted in the browser.** Vercel functions cap request bodies at ~4.5 MB, so the PDF never passes through the API: the browser sends compact page-tagged text, and uploads the original directly to Supabase Storage via a signed URL.
- **Citations are grounded by construction.** The prompt tags each page `[#N]` and the schema requires `refs` per point; refs outside the document are dropped server-side.
- **Free models are unreliable, so the app plans for it.** OpenRouter gets an ordered fallback list, reasoning is disabled (free reasoning models otherwise spend the output budget thinking and never emit JSON), results are cached per document and lens, and samples are served from JSON committed to the repo.
- **Streaming and strict schemas don't mix on free endpoints.** Sending a JSON schema via `response_format` makes the upstream buffer the entire response (one chunk after ~9s). So the streamed attempt asks for JSON in the prompt and is validated server-side; only the retry uses the strict schema.
- **No keys in the browser.** All database access uses the service role on the server; RLS is on with no policies.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Vercel AI SDK 7 (`streamText` + `Output.object`, `useObject`) · OpenRouter · Supabase (Postgres + Storage) · react-pdf

## Running locally

```bash
cp .env.example .env.local   # fill in the values
npm install
npm run dev
```

Create the database schema by running `supabase/migrations/*.sql` (Supabase SQL editor, or `npx supabase db push` after `supabase link`).

### Environment

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key used for all DB and storage access |
| `OPENROUTER_API_KEY` | OpenRouter key |
| `OPENROUTER_MODELS` | Optional comma-separated model fallback list |
| `RATE_LIMIT_PER_HOUR` | Optional, defaults to 5 new summaries per IP per hour |
| `CRON_SECRET` | Protects the daily cleanup cron (`vercel.json`) |

### Samples

```bash
npm run samples            # generate missing lenses into src/samples/*.json
npm run samples -- --force # regenerate everything
node scripts/make-contract.mjs  # rebuild the fictional contract PDF
```

## Sample document credits

- Wei et al., *Chain-of-Thought Prompting Elicits Reasoning in Large Language Models*, arXiv:2201.11903, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Excerpt: pages 1–10, unmodified.
- NIST, *Artificial Intelligence Risk Management Framework (AI RMF 1.0)*, NIST AI 100-1, 2023. US Government work, public domain.
- *Master Subscription Agreement*: fictional, written for this demo. Not legal advice.
