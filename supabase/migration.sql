-- OTILink: links_profiles, links_links, links_templates, links_clicks + RLS
-- Run this in Supabase SQL Editor against your existing project.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.links_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE
    CONSTRAINT slug_not_reserved CHECK (lower(slug) NOT IN (
      'login', 'logout', 'dashboard', 'auth', 'api', 'admin',
      'go', 'mentions-legales', 'confidentialite', 'conditions', 'contact',
      '_next', 'favicon.ico'
    ))
    CONSTRAINT slug_length CHECK (char_length(slug) BETWEEN 2 AND 48),
  display_name text CONSTRAINT display_name_length CHECK (char_length(display_name) <= 100),
  bio text CONSTRAINT bio_length CHECK (char_length(bio) <= 500),
  avatar_url text CONSTRAINT avatar_url_length CHECK (char_length(avatar_url) <= 2048),
  created_at timestamptz DEFAULT now()
);

-- Admin allowlist: only users in this table can edit templates (no self-promotion)
CREATE TABLE IF NOT EXISTS public.links_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.links_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_user_id uuid NOT NULL REFERENCES public.links_profiles (user_id) ON DELETE CASCADE,
  label text NOT NULL CONSTRAINT label_length CHECK (char_length(label) BETWEEN 1 AND 100),
  url text NOT NULL
    CONSTRAINT url_length CHECK (char_length(url) BETWEEN 1 AND 2048)
    CONSTRAINT url_http_or_https CHECK (
      url ~ '^https?://' AND url NOT LIKE 'javascript:%'
    ),
  type text,
  icon text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.links_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  html text NOT NULL CONSTRAINT html_length CHECK (char_length(html) <= 65536),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Click tracking
CREATE TABLE IF NOT EXISTS public.links_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid NOT NULL REFERENCES public.links_links (id) ON DELETE CASCADE,
  clicked_at timestamptz DEFAULT now(),
  -- Store privacy-friendly referrer hostname only (not full URL)
  referrer_domain text,
  -- Optional raw values (can be left NULL by the app)
  referrer text,
  user_agent text,
  -- Bot flag to keep counts meaningful
  is_bot boolean NOT NULL DEFAULT false
);

-- Index for fast click count queries
CREATE INDEX IF NOT EXISTS idx_links_clicks_link_id ON public.links_clicks (link_id);

-- Monthly aggregation (per link, per month) for long-term reporting
CREATE TABLE IF NOT EXISTS public.links_clicks_monthly (
  profile_user_id uuid NOT NULL REFERENCES public.links_profiles (user_id) ON DELETE CASCADE,
  link_id uuid NOT NULL REFERENCES public.links_links (id) ON DELETE CASCADE,
  month date NOT NULL, -- first day of month (YYYY-MM-01)
  clicks_human bigint NOT NULL DEFAULT 0,
  clicks_bot bigint NOT NULL DEFAULT 0,
  -- Snapshot fields for reporting (optional)
  icon text,
  type text,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (profile_user_id, link_id, month)
);

CREATE INDEX IF NOT EXISTS idx_links_clicks_monthly_profile_month
  ON public.links_clicks_monthly (profile_user_id, month);

-- ---------------------------------------------------------------------------
-- Staff allowlist helper (restrict OTILink to staff only)
-- ---------------------------------------------------------------------------
-- OTILink is intended for staff-only usage. We reuse your existing staff table:
--   public.appbadge_utilisateurs(email text, actif boolean, nom text, prenom text, avatar text, ...)
--
-- This SECURITY DEFINER function lets RLS policies check staff membership
-- without granting table access to authenticated users.
CREATE OR REPLACE FUNCTION public.is_otilink_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.appbadge_utilisateurs u
    WHERE lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      AND u.actif = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_otilink_staff() TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.links_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links_clicks_monthly ENABLE ROW LEVEL SECURITY;

-- links_profiles: users manage only their own row
DROP POLICY IF EXISTS profiles_select_own ON public.links_profiles;
CREATE POLICY profiles_select_own ON public.links_profiles
  FOR SELECT USING (auth.uid() = user_id AND public.is_otilink_staff());

DROP POLICY IF EXISTS profiles_insert_own ON public.links_profiles;
CREATE POLICY profiles_insert_own ON public.links_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.is_otilink_staff());

DROP POLICY IF EXISTS profiles_update_own ON public.links_profiles;
CREATE POLICY profiles_update_own ON public.links_profiles
  FOR UPDATE
  USING (auth.uid() = user_id AND public.is_otilink_staff())
  WITH CHECK (auth.uid() = user_id AND public.is_otilink_staff());

-- links_admins: users can only see their own row (to know if they are admin). No INSERT/UPDATE/DELETE for authenticated.
DROP POLICY IF EXISTS admins_select_own ON public.links_admins;
CREATE POLICY admins_select_own ON public.links_admins
  FOR SELECT USING (auth.uid() = user_id AND public.is_otilink_staff());

-- links_links: users manage only their own links
DROP POLICY IF EXISTS links_select_own ON public.links_links;
CREATE POLICY links_select_own ON public.links_links
  FOR SELECT USING (auth.uid() = profile_user_id AND public.is_otilink_staff());

DROP POLICY IF EXISTS links_insert_own ON public.links_links;
CREATE POLICY links_insert_own ON public.links_links
  FOR INSERT WITH CHECK (auth.uid() = profile_user_id AND public.is_otilink_staff());

DROP POLICY IF EXISTS links_update_own ON public.links_links;
CREATE POLICY links_update_own ON public.links_links
  FOR UPDATE
  USING (auth.uid() = profile_user_id AND public.is_otilink_staff())
  WITH CHECK (auth.uid() = profile_user_id AND public.is_otilink_staff());

DROP POLICY IF EXISTS links_delete_own ON public.links_links;
CREATE POLICY links_delete_own ON public.links_links
  FOR DELETE USING (auth.uid() = profile_user_id AND public.is_otilink_staff());

-- links_templates: ONLY users in links_admins can read (template is global/admin-managed)
DROP POLICY IF EXISTS templates_select_admin_only ON public.links_templates;
CREATE POLICY templates_select_admin_only ON public.links_templates
  FOR SELECT TO authenticated
  USING (
    public.is_otilink_staff()
    AND EXISTS (SELECT 1 FROM public.links_admins WHERE user_id = auth.uid())
  );

-- links_templates: ONLY users in links_admins can update (prevents XSS / self-promotion)
DROP POLICY IF EXISTS templates_update_admin_only ON public.links_templates;
CREATE POLICY templates_update_admin_only ON public.links_templates
  FOR UPDATE TO authenticated
  USING (
    public.is_otilink_staff()
    AND EXISTS (SELECT 1 FROM public.links_admins WHERE user_id = auth.uid())
  )
  WITH CHECK (
    public.is_otilink_staff()
    AND EXISTS (SELECT 1 FROM public.links_admins WHERE user_id = auth.uid())
  );

-- links_clicks: users can read click stats for their own links
DROP POLICY IF EXISTS clicks_select_own ON public.links_clicks;
CREATE POLICY clicks_select_own ON public.links_clicks
  FOR SELECT USING (
    public.is_otilink_staff()
    AND
    EXISTS (
      SELECT 1 FROM public.links_links
      WHERE links_links.id = links_clicks.link_id
        AND links_links.profile_user_id = auth.uid()
    )
  );

-- links_clicks_monthly: users can read their own monthly stats
DROP POLICY IF EXISTS clicks_monthly_select_own ON public.links_clicks_monthly;
CREATE POLICY clicks_monthly_select_own ON public.links_clicks_monthly
  FOR SELECT USING (auth.uid() = profile_user_id AND public.is_otilink_staff());

-- links_clicks: no insert via RLS (clicks are recorded server-side with service role)

-- RPC: aggregate click counts for links owned by the current user (avoids loading all click rows)
CREATE OR REPLACE FUNCTION public.get_click_counts(link_ids uuid[])
RETURNS TABLE(link_id uuid, clicks bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.link_id, count(*)::bigint
  FROM links_clicks c
  JOIN links_links l ON l.id = c.link_id
  WHERE c.link_id = ANY(link_ids)
    AND l.profile_user_id = auth.uid()
    AND public.is_otilink_staff()
    AND c.is_bot = false
  GROUP BY c.link_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_click_counts(uuid[]) TO authenticated;

-- RPC: roll up raw clicks into monthly table, and purge old raw rows.
-- Intended to be called by service_role (cron) or project owner.
CREATE OR REPLACE FUNCTION public.rollup_clicks_monthly(
  retention_days int DEFAULT 365,
  months_back int DEFAULT 14
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  start_month date;
BEGIN
  start_month := (date_trunc('month', now())::date - ((months_back - 1) * interval '1 month'))::date;

  INSERT INTO public.links_clicks_monthly (
    profile_user_id,
    link_id,
    month,
    clicks_human,
    clicks_bot,
    icon,
    type,
    updated_at
  )
  SELECT
    l.profile_user_id,
    c.link_id,
    date_trunc('month', c.clicked_at)::date AS month,
    sum(CASE WHEN c.is_bot THEN 0 ELSE 1 END)::bigint AS clicks_human,
    sum(CASE WHEN c.is_bot THEN 1 ELSE 0 END)::bigint AS clicks_bot,
    l.icon,
    l.type,
    now()
  FROM public.links_clicks c
  JOIN public.links_links l ON l.id = c.link_id
  WHERE c.clicked_at >= start_month
  GROUP BY 1,2,3,6,7
  ON CONFLICT (profile_user_id, link_id, month)
  DO UPDATE SET
    clicks_human = EXCLUDED.clicks_human,
    clicks_bot = EXCLUDED.clicks_bot,
    icon = EXCLUDED.icon,
    type = EXCLUDED.type,
    updated_at = now();

  -- Purge old raw click events
  DELETE FROM public.links_clicks
  WHERE clicked_at < now() - (retention_days || ' days')::interval;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rollup_clicks_monthly(int, int) TO service_role;

-- Scheduling (recommended): run rollup daily via pg_cron
-- If pg_cron is available in your Supabase instance:
--   create extension if not exists pg_cron;
--   select cron.schedule(
--     'otilink_rollup_clicks_monthly',
--     '10 2 * * *',
--     $$ select public.rollup_clicks_monthly(365, 14); $$
--   );

-- RPC: monthly clicks by icon/type for current user (human clicks)
CREATE OR REPLACE FUNCTION public.get_monthly_clicks(months int DEFAULT 12)
RETURNS TABLE(month date, icon text, type text, clicks_human bigint, clicks_bot bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.month,
    m.icon,
    m.type,
    sum(m.clicks_human)::bigint AS clicks_human,
    sum(m.clicks_bot)::bigint AS clicks_bot
  FROM public.links_clicks_monthly m
  WHERE m.profile_user_id = auth.uid()
    AND public.is_otilink_staff()
    AND m.month >= (date_trunc('month', now())::date - ((months - 1) * interval '1 month'))::date
  GROUP BY 1,2,3
  ORDER BY m.month DESC, m.icon NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.get_monthly_clicks(int) TO authenticated;

-- ---------------------------------------------------------------------------
-- Seed: default template (OTISUD teal branding)
-- ---------------------------------------------------------------------------

INSERT INTO public.links_templates (name, slug, html, updated_at)
VALUES (
  'OTISUD Default',
  'otisud-default',
  '<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>{{display_name}} – OTISUD Links</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" />
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: ''Inter'', sans-serif; background: #0d4f5c; color: #fff; min-height: 100vh; }
    .page { max-width: 480px; margin: 0 auto; padding: 2rem 1.5rem; }
    .profile { text-align: center; margin-bottom: 2rem; }
    .profile h1 { font-size: 1.5rem; font-weight: 700; margin: 0 0 0.5rem; }
    .profile p { font-size: 0.95rem; opacity: 0.9; margin: 0; line-height: 1.5; }
    .profile .avatar { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin-bottom: 1rem; }
    .links-area { display: flex; flex-direction: column; gap: 0.75rem; }
    .links-area a { display: block; padding: 1rem 1.25rem; background: rgba(255,255,255,0.12); color: #fff; text-decoration: none; border-radius: 12px; font-weight: 600; text-align: center; transition: background 0.2s; }
    .links-area a:hover { background: rgba(255,255,255,0.2); }
    .footer { margin-top: 2rem; text-align: center; font-size: 0.75rem; opacity: 0.6; }
    .footer a { color: #fff; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="page">
    <div class="profile">
      {{avatar_block}}
      <h1>{{display_name}}</h1>
      <p>{{bio}}</p>
    </div>
    <div class="links-area">
      {{links}}
    </div>
    <div class="footer">
      <a href="/mentions-legales">Mentions légales</a> · <a href="/confidentialite">Confidentialité</a> · <a href="/contact">Contact</a>
    </div>
  </div>
</body>
</html>',
  now()
)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- IMPORTANT: After running this migration, grant admin to a user:
-- INSERT INTO public.links_admins (user_id) VALUES ('<your-user-uuid>');
-- ---------------------------------------------------------------------------
