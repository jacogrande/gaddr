# Infra Doc (MVP) — Next.js + Vercel + Better Auth + Railway

## 1) Goal

Ship a production MVP fast with:

- Auth (no custom password/security plumbing)
- Database for essays/publishing
- Hosting with previews and easy deploys
- Minimal vendors and minimal ops

---

## 2) Proposed stack (recommended)

### App + Hosting

- **Next.js (App Router) + TypeScript**
- Deployed on **Vercel**
- Vercel handles:
  - SSR/ISR for public pages
  - API Route Handlers / Server Actions for CRUD
  - Environment variables + preview deployments

### Auth

- **Better Auth** integrated directly into Next.js
- Uses **Railway Postgres** as persistence store (sessions/users/accounts) if you want DB-backed sessions.

> Rationale: keep auth logic “inside the app” and avoid a third-party hosted auth platform unless you want it.

### Database

- **Railway Postgres** (main DB)
- Used for:
  - Users / sessions (if Better Auth uses DB adapter)
  - Essays, versions, prompts, etc.

### “Anything else”

For MVP, nothing else is strictly required.

- No Redis
- No background workers
- No queue

---

## 3) Can we manage it all on Vercel?

**Mostly no**, because Vercel doesn’t provide managed Postgres “natively” as part of Vercel itself. You still need a database vendor.

**However**, you can manage _almost everything except the DB_ on Vercel:

- UI
- API endpoints
- Auth routes
- Basic LLM feedback endpoints (short-running)

So the practical “all on Vercel” version becomes:

- Vercel for compute + hosting
- A DB vendor for persistence (Railway / Neon / Supabase / PlanetScale etc.)

Given you already mentioned Railway, **Railway Postgres** is perfect.

---

## 4) System architecture (MVP)

### Runtime components

1. **Next.js Web App (Vercel)**
   - `/app` routes for UI
   - route handlers for CRUD + auth callbacks

2. **Postgres (Railway)**
   - persistent data store

### Data flow

- Client → Next.js (Server Actions / Route Handlers) → Postgres (Railway)
- Auth flow → Better Auth routes → Postgres (Railway)

---

## 5) Environments

- **Preview**: Vercel preview deployments per PR
- **Production**: Vercel production deployment from main branch
- **DB strategy (MVP simple):**
  - one Railway Postgres instance + separate schemas (or separate DBs) for dev/prod if you want clean separation

---

## 6) Core services and responsibilities

### Vercel (compute + routing)

- SSR for `/essay/[id]` public pages (fast share links)
- Auth endpoints (Better Auth)
- CRUD endpoints / Server Actions:
  - create draft
  - update draft
  - publish/unpublish
  - list user essays
  - load public essay

### Railway (persistence)

- Postgres DB:
  - `users` / `sessions` / `accounts` (auth)
  - `essays` (draft/published content)
  - minimal metadata tables (optional)

---

## 7) Minimal database schema (MVP)

You can start with just this:

**essays**

- `id` UUID PK
- `user_id` TEXT (auth provider user id or your internal user id)
- `title` TEXT NULL
- `content` TEXT NOT NULL
- `status` TEXT CHECK (‘draft’, ‘published’)
- `created_at` TIMESTAMP
- `updated_at` TIMESTAMP
- `published_at` TIMESTAMP NULL

Later tables (post-MVP):

- `essay_versions`
- `annotations` (assistant + peer comments)
- `evidence_cards`
- `objections`

---

## 8) Auth details (Better Auth)

### MVP auth modes (choose simplest)

- **OAuth only** (Google + GitHub): fastest, no email vendor required
- Add email/password or magic links later if needed

### Session strategy

- DB-backed sessions in Postgres (simpler for server actions + security)
- Protect routes via Next middleware + server-side checks

### Security baseline

- Use HTTPS only (default)
- CSRF protections per Better Auth defaults
- Secure cookies (`HttpOnly`, `SameSite=Lax/Strict` where appropriate)
- Rate limit login endpoints (can be Vercel middleware or simple in-app throttling)

---

## 9) “No-ghostwriting” assistant infra (MVP)

Keep it intentionally lightweight:

- A single endpoint like `POST /api/review`
- It returns **JSON**: issues checklist + questions + (optionally) anchors
- No long-running tasks, no queues
- If a request takes too long, return partial feedback or a single-pass rubric

**Important constraint enforcement**

- Validate the assistant response schema server-side (Zod) and reject any “replacement prose” fields.

---

## 10) Observability (MVP minimal)

- **Sentry** for server + client error capture
- Vercel logs for quick debugging
- Basic request timing logs for `/api/review`

---

## 11) Deployment checklist (what you actually do)

1. Create Next.js app (TS)
2. Deploy to Vercel (connect GitHub repo)
3. Provision Railway Postgres
4. Add env vars to Vercel:
   - `DATABASE_URL`
   - Better Auth secrets + OAuth client IDs/secrets

5. Run DB migrations (Prisma/Drizzle) from local or CI
6. Smoke test:
   - sign in
   - create draft
   - publish
   - view public page

---

## 12) When you’ll need Railway for more than Postgres

Only add additional Railway services if you hit one of these:

- **Long-running LLM research/review** (timeouts) → add a Railway worker
- **High throughput** requiring queues/rate limiting → add Redis
- **Heavy ingestion** (web scraping, batch processing) → move to worker

Until then, **Vercel + Railway Postgres is enough**.

---

## Recommendation (MVP)

Go with:

- **Next.js on Vercel**
- **Better Auth** inside the app
- **Railway Postgres** as the only extra service
