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

## Staff-only access (allowlist)

OTILink is restricted to **staff only**.

- **Source of truth**: `public.appbadge_utilisateurs`
- **Required columns**: `email` (text), `actif` (boolean)
- **Optional columns used for prefill**: `prenom`, `nom`, `avatar`

The migration adds a helper function `public.is_otilink_staff()` (SECURITY DEFINER) and uses it in RLS policies on the `links_*` tables. If a user is not staff, they will be blocked by:

- the app (no `/dashboard` access)
- the database (RLS denies CRUD on `links_profiles` / `links_links`)

If your staff table name/columns differ, update the function in `supabase/migration.sql` accordingly.

## Pages model + organization homepage (/)

OTILink uses a **pages** model:

- Public pages: `/{pageSlug}` are rows in `public.links_pages`
- Each page has its own links in `public.links_links` (via `page_id`)
- The organization homepage is the single row in `public.links_pages` where `is_homepage = true`, rendered at `/`

## Homepage editors (who can edit /)

Homepage editing is controlled via an allowlist table: `public.links_homepage_editors`.

To grant homepage editor access:

```sql
insert into public.links_homepage_editors (user_id)
select id from auth.users
where lower(email) = lower('<editor-email>')
on conflict (user_id) do nothing;
```

## Admin access (template editor)

Template read/update is restricted to an allowlist table `public.links_admins`.

Grant admin to a user (run in Supabase SQL Editor):

```sql
insert into public.links_admins (user_id) values ('<user-uuid>');
```

Admins can edit template HTML. Staff users can **only select** templates for their pages.

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
- `page:{pageSlug}`
- `template:{templateSlug}`
- `homepage` (for `/`)

To purge cache on DB changes, configure Supabase **Database Webhooks** to call:

`POST https://<your-domain>/api/supabase-webhook/revalidate`

Headers:
- `x-revalidate-secret: <REVALIDATE_SECRET>`

Recommended webhooks:
- `public.links_links`: `INSERT`, `UPDATE`, `DELETE` (purges the owning page)
- `public.links_pages`: `INSERT`, `UPDATE`, `DELETE` (purges old/new page slug; purges `homepage` if homepage changes)
- `public.links_templates`: `UPDATE` (purges the template tag)

You can monitor webhook calls in the `net` schema (pg_net logs).

