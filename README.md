# OTILink (Link-in-bio)

Self-hosted “Linktree-style” app for OTISUD.

## Features
- Google login via Supabase Auth
- Per-user profile at `/{slug}`
- Links dashboard with drag-and-drop ordering
- Global HTML template stored in DB (admin-only)
- Click tracking via `/go/{link_id}` + bot filtering
- Monthly click aggregation + 1-year raw click retention
- Public page caching (1 day) + Supabase Database Webhook invalidation

## Tech stack
- Next.js (App Router) + TypeScript + Tailwind
- Supabase (`@supabase/supabase-js`, `@supabase/ssr`)

## Environment variables
Create your envs from [`.env.example`](.env.example). **Never commit real secrets**.

Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Server-only:
- `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS; keep secret)
- `REVALIDATE_SECRET` (protects cache purge endpoint)

## Supabase setup
1) Run the SQL migration: [`supabase/migration.sql`](supabase/migration.sql)

2) Staff-only access (allowlist)

OTILink is restricted to staff listed in `public.appbadge_utilisateurs` (`email`, `actif`).

3) Grant template admin access (run in Supabase SQL Editor):

```sql
insert into public.links_admins (user_id) values ('<user-uuid>');
```

4) Enable Google OAuth in Supabase Auth and set redirect URL:
- `https://<your-domain>/auth/callback`

## Cache invalidation (recommended)

Public pages are cached and tagged:
- `slug:{slug}`
- `template:otisud-default`

Configure Supabase **Database Webhooks** to call:
- `POST https://<your-domain>/api/supabase-webhook/revalidate`
- Header: `x-revalidate-secret: <REVALIDATE_SECRET>`

Recommended tables/events:
- `public.links_links`: INSERT/UPDATE/DELETE
- `public.links_profiles`: UPDATE
- `public.links_templates`: UPDATE

## Click tracking ops

- Raw clicks: `public.links_clicks`
- Monthly aggregates: `public.links_clicks_monthly`
- Rollup function: `public.rollup_clicks_monthly(365, 14)`

If `pg_cron` is available, schedule the rollup daily (see [`docs/OPERATIONS.md`](docs/OPERATIONS.md)).

## Local development

```bash
npm install
npm run dev
```

## Deployment (Coolify/Docker)

This repo includes a production [`Dockerfile`](Dockerfile). Set env vars in Coolify.

## Operations guide

See [`docs/OPERATIONS.md`](docs/OPERATIONS.md).
