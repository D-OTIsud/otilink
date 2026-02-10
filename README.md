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
1) Run the SQL migration: [`supabase/migration.sql`](supabase/migration.sql)\n\n2) Grant template admin access (run in Supabase SQL Editor):\n\n```sql\ninsert into public.links_admins (user_id) values ('<user-uuid>');\n```\n\n3) Enable Google OAuth in Supabase Auth and set redirect URL:\n- `https://<your-domain>/auth/callback`\n\n## Cache invalidation (recommended)\nPublic pages are cached and tagged:\n- `slug:{slug}`\n- `template:otisud-default`\n\nConfigure Supabase **Database Webhooks** to call:\n- `POST https://<your-domain>/api/supabase-webhook/revalidate`\n- Header: `x-revalidate-secret: <REVALIDATE_SECRET>`\n\nRecommended tables/events:\n- `public.links_links`: INSERT/UPDATE/DELETE\n- `public.links_profiles`: UPDATE\n- `public.links_templates`: UPDATE\n\n## Click tracking ops\n- Raw clicks: `public.links_clicks`\n- Monthly aggregates: `public.links_clicks_monthly`\n- Rollup function: `public.rollup_clicks_monthly(365, 14)`\n\nIf `pg_cron` is available, schedule the rollup daily (see [`docs/OPERATIONS.md`](docs/OPERATIONS.md)).\n\n## Local development\n```bash\nnpm install\nnpm run dev\n```\n\n## Deployment (Coolify/Docker)\nThis repo includes a production [`Dockerfile`](Dockerfile). Set env vars in Coolify.\n\n## Operations guide\nSee [`docs/OPERATIONS.md`](docs/OPERATIONS.md).\n*** End Patch"}]}                     )}
