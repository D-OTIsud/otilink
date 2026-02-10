# Operations (OTILink)

This doc is for running OTILink in production (Coolify/Docker + existing Supabase).

## Secrets & environment variables

All secrets must be provided as environment variables (Coolify → Environment). **Do not hardcode secrets in code** and **do not commit `.env` files**.

Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Server-only:
- `SUPABASE_SERVICE_ROLE_KEY` (never expose to browser)
- `REVALIDATE_SECRET` (protects cache purge webhook)

See [`.env.example`](../.env.example).

## Database migration

Run the SQL in [`supabase/migration.sql`](../supabase/migration.sql) in Supabase SQL Editor.

## Admin access (template editor)

Template read/update is restricted to an allowlist table `public.links_admins`.

Grant admin to a user (run in Supabase SQL Editor):

```sql
insert into public.links_admins (user_id) values ('<user-uuid>');
```

## Click tracking: rollup + retention (pg_cron)

The app writes raw click events to `public.links_clicks`.

Monthly aggregates live in `public.links_clicks_monthly` and are populated by:
- `public.rollup_clicks_monthly(retention_days int, months_back int)`

Recommended scheduling (daily):

```sql
create extension if not exists pg_cron;

select
  cron.schedule(
    'otilink_rollup_clicks_monthly',
    '10 2 * * *',
    $$ select public.rollup_clicks_monthly(365, 14); $$
  );
```

This keeps raw click rows for 1 year and maintains monthly aggregates (last ~14 months).

## Public page caching + cache invalidation

Public pages (`/{slug}`) are cached server-side for up to 1 day and tagged:
- `slug:{slug}`
- `template:otisud-default`

To purge cache on DB changes, configure Supabase **Database Webhooks** to call:

`POST https://<your-domain>/api/supabase-webhook/revalidate`

Headers:
- `x-revalidate-secret: <REVALIDATE_SECRET>`

Recommended webhooks:
- `public.links_links`: `INSERT`, `UPDATE`, `DELETE` (purges the owning slug)
- `public.links_profiles`: `UPDATE` (purges old/new slug when slug changes)
- `public.links_templates`: `UPDATE` (purges template tag)

You can monitor webhook calls in the `net` schema (pg_net logs).

