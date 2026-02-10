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

-- Pages (multiple linktrees per user) + organization homepage
CREATE TABLE IF NOT EXISTS public.links_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NULL allowed for homepage; ownership is enforced via RLS for normal pages.
  owner_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  slug text NOT NULL UNIQUE
    CONSTRAINT page_slug_not_reserved CHECK (lower(slug) NOT IN (
      'login', 'logout', 'dashboard', 'auth', 'api', 'admin',
      'go', 'mentions-legales', 'confidentialite', 'conditions', 'contact',
      '_next', 'favicon.ico'
    ))
    CONSTRAINT page_slug_length CHECK (char_length(slug) BETWEEN 2 AND 48),
  template_slug text NOT NULL DEFAULT 'otisud-default' REFERENCES public.links_templates (slug) ON UPDATE CASCADE,
  display_name text CONSTRAINT page_display_name_length CHECK (char_length(display_name) <= 100),
  bio text CONSTRAINT page_bio_length CHECK (char_length(bio) <= 500),
  avatar_url text CONSTRAINT page_avatar_url_length CHECK (char_length(avatar_url) <= 2048),
  is_homepage boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ensure there can be only one homepage page
CREATE UNIQUE INDEX IF NOT EXISTS uniq_links_pages_homepage
  ON public.links_pages (is_homepage)
  WHERE is_homepage;

-- Homepage editors allowlist (staff-only checked via is_otilink_staff() in RLS)
CREATE TABLE IF NOT EXISTS public.links_homepage_editors (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
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
  -- Owner of the page (auth user). Kept for RLS + reporting.
  profile_user_id uuid NOT NULL,
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

-- Remove legacy FK to links_profiles (pages model no longer depends on it).
ALTER TABLE public.links_clicks_monthly
  DROP CONSTRAINT IF EXISTS links_clicks_monthly_profile_user_id_fkey;

-- ---------------------------------------------------------------------------
-- Migration path to pages: add page_id and relax legacy FK
-- ---------------------------------------------------------------------------
ALTER TABLE public.links_links
  ADD COLUMN IF NOT EXISTS page_id uuid;

-- Keep legacy profile_user_id for existing installs, but allow new data model to not depend on links_profiles.
ALTER TABLE public.links_links
  DROP CONSTRAINT IF EXISTS links_links_profile_user_id_fkey;

ALTER TABLE public.links_links
  ALTER COLUMN profile_user_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'links_links_page_id_fkey'
  ) THEN
    ALTER TABLE public.links_links
      ADD CONSTRAINT links_links_page_id_fkey
      FOREIGN KEY (page_id) REFERENCES public.links_pages (id) ON DELETE CASCADE;
  END IF;
END $$;

-- Backfill: create one page per existing profile and attach existing links to it
INSERT INTO public.links_pages (owner_user_id, slug, template_slug, display_name, bio, avatar_url, is_homepage)
SELECT
  p.user_id,
  p.slug,
  'otisud-default',
  p.display_name,
  p.bio,
  p.avatar_url,
  false
FROM public.links_profiles p
ON CONFLICT (slug) DO NOTHING;

UPDATE public.links_links l
SET page_id = pg.id
FROM public.links_pages pg
WHERE l.page_id IS NULL
  AND l.profile_user_id IS NOT NULL
  AND pg.owner_user_id = l.profile_user_id;

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
ALTER TABLE public.links_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links_homepage_editors ENABLE ROW LEVEL SECURITY;

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

-- links_homepage_editors: users can see whether they are editors
DROP POLICY IF EXISTS homepage_editors_select_own ON public.links_homepage_editors;
CREATE POLICY homepage_editors_select_own ON public.links_homepage_editors
  FOR SELECT USING (auth.uid() = user_id AND public.is_otilink_staff());

-- links_pages: owners manage their pages; homepage editors can manage homepage page
DROP POLICY IF EXISTS pages_select_own_or_homepage_editor ON public.links_pages;
CREATE POLICY pages_select_own_or_homepage_editor ON public.links_pages
  FOR SELECT USING (
    public.is_otilink_staff()
    AND (
      owner_user_id = auth.uid()
      OR (
        is_homepage = true
        AND EXISTS (SELECT 1 FROM public.links_homepage_editors e WHERE e.user_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS pages_insert_own ON public.links_pages;
CREATE POLICY pages_insert_own ON public.links_pages
  FOR INSERT WITH CHECK (
    public.is_otilink_staff()
    AND owner_user_id = auth.uid()
    AND is_homepage = false
  );

DROP POLICY IF EXISTS pages_update_own_or_homepage_editor ON public.links_pages;
CREATE POLICY pages_update_own_or_homepage_editor ON public.links_pages
  FOR UPDATE
  USING (
    public.is_otilink_staff()
    AND (
      owner_user_id = auth.uid()
      OR (
        is_homepage = true
        AND EXISTS (SELECT 1 FROM public.links_homepage_editors e WHERE e.user_id = auth.uid())
      )
    )
  )
  WITH CHECK (
    public.is_otilink_staff()
    AND (
      owner_user_id = auth.uid()
      OR (
        is_homepage = true
        AND EXISTS (SELECT 1 FROM public.links_homepage_editors e WHERE e.user_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS pages_delete_own ON public.links_pages;
CREATE POLICY pages_delete_own ON public.links_pages
  FOR DELETE USING (
    public.is_otilink_staff()
    AND owner_user_id = auth.uid()
    AND is_homepage = false
  );

-- links_links: users manage only their own links
DROP POLICY IF EXISTS links_select_own ON public.links_links;
CREATE POLICY links_select_own ON public.links_links
  FOR SELECT USING (
    public.is_otilink_staff()
    AND EXISTS (
      SELECT 1
      FROM public.links_pages p
      WHERE p.id = links_links.page_id
        AND (
          p.owner_user_id = auth.uid()
          OR (
            p.is_homepage = true
            AND EXISTS (SELECT 1 FROM public.links_homepage_editors e WHERE e.user_id = auth.uid())
          )
        )
    )
  );

DROP POLICY IF EXISTS links_insert_own ON public.links_links;
CREATE POLICY links_insert_own ON public.links_links
  FOR INSERT WITH CHECK (
    public.is_otilink_staff()
    AND links_links.page_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.links_pages p
      WHERE p.id = links_links.page_id
        AND (
          p.owner_user_id = auth.uid()
          OR (
            p.is_homepage = true
            AND EXISTS (SELECT 1 FROM public.links_homepage_editors e WHERE e.user_id = auth.uid())
          )
        )
    )
  );

DROP POLICY IF EXISTS links_update_own ON public.links_links;
CREATE POLICY links_update_own ON public.links_links
  FOR UPDATE
  USING (
    public.is_otilink_staff()
    AND EXISTS (
      SELECT 1
      FROM public.links_pages p
      WHERE p.id = links_links.page_id
        AND (
          p.owner_user_id = auth.uid()
          OR (
            p.is_homepage = true
            AND EXISTS (SELECT 1 FROM public.links_homepage_editors e WHERE e.user_id = auth.uid())
          )
        )
    )
  )
  WITH CHECK (
    public.is_otilink_staff()
    AND EXISTS (
      SELECT 1
      FROM public.links_pages p
      WHERE p.id = links_links.page_id
        AND (
          p.owner_user_id = auth.uid()
          OR (
            p.is_homepage = true
            AND EXISTS (SELECT 1 FROM public.links_homepage_editors e WHERE e.user_id = auth.uid())
          )
        )
    )
  );

DROP POLICY IF EXISTS links_delete_own ON public.links_links;
CREATE POLICY links_delete_own ON public.links_links
  FOR DELETE USING (
    public.is_otilink_staff()
    AND EXISTS (
      SELECT 1
      FROM public.links_pages p
      WHERE p.id = links_links.page_id
        AND (
          p.owner_user_id = auth.uid()
          OR (
            p.is_homepage = true
            AND EXISTS (SELECT 1 FROM public.links_homepage_editors e WHERE e.user_id = auth.uid())
          )
        )
    )
  );

-- links_templates: ONLY users in links_admins can read (template is global/admin-managed)
DROP POLICY IF EXISTS templates_select_admin_only ON public.links_templates;
-- Staff can select templates (to choose a template for their pages).
CREATE POLICY templates_select_admin_only ON public.links_templates
  FOR SELECT TO authenticated
  USING (public.is_otilink_staff());

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
        AND EXISTS (
          SELECT 1
          FROM public.links_pages p
          WHERE p.id = links_links.page_id
            AND (
              p.owner_user_id = auth.uid()
              OR (
                p.is_homepage = true
                AND EXISTS (SELECT 1 FROM public.links_homepage_editors e WHERE e.user_id = auth.uid())
              )
            )
        )
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
  JOIN links_pages p ON p.id = l.page_id
  WHERE c.link_id = ANY(link_ids)
    AND (
      p.owner_user_id = auth.uid()
      OR (
        p.is_homepage = true
        AND EXISTS (SELECT 1 FROM public.links_homepage_editors e WHERE e.user_id = auth.uid())
      )
    )
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
    p.owner_user_id,
    c.link_id,
    date_trunc('month', c.clicked_at)::date AS month,
    sum(CASE WHEN c.is_bot THEN 0 ELSE 1 END)::bigint AS clicks_human,
    sum(CASE WHEN c.is_bot THEN 1 ELSE 0 END)::bigint AS clicks_bot,
    l.icon,
    l.type,
    now()
  FROM public.links_clicks c
  JOIN public.links_links l ON l.id = c.link_id
  JOIN public.links_pages p ON p.id = l.page_id
  WHERE c.clicked_at >= start_month
    AND p.owner_user_id IS NOT NULL
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

-- Seed: branded templates (best-effort OTISUD style inspired by screenshot)
INSERT INTO public.links_templates (name, slug, html, updated_at)
VALUES (
  'OTISUD Organic Linktree',
  'otisud-organic-linktree',
  '<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>{{display_name}} – OTISUD Links</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" />
  <style>
    :root{
      --bg1:#0b5a68;
      --bg2:#083b44;
      --card:#ffffff;
      --muted:#e6f3f5;
      --teal:#12b3a6;
      --teal2:#2ad0c6;
      --text:#0b1f24;
      --textOnDark:#ffffff;
    }
    *{box-sizing:border-box}
    body{
      margin:0;
      font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;
      min-height:100vh;
      color:var(--textOnDark);
      background:
        radial-gradient(1200px 600px at 20% 10%, rgba(255,214,102,.35), transparent 55%),
        radial-gradient(900px 500px at 85% 20%, rgba(42,208,198,.35), transparent 55%),
        radial-gradient(900px 700px at 60% 95%, rgba(255,255,255,.12), transparent 55%),
        linear-gradient(135deg,var(--bg1),var(--bg2));
    }
    .wrap{max-width:560px;margin:0 auto;padding:32px 18px 48px}
    .card{
      background:rgba(255,255,255,.12);
      border:1px solid rgba(255,255,255,.18);
      border-radius:24px;
      backdrop-filter: blur(10px);
      padding:22px;
      box-shadow:0 16px 60px rgba(0,0,0,.25);
    }
    .profile{display:flex;gap:14px;align-items:center;margin-bottom:16px}
    .avatar{
      width:64px;height:64px;border-radius:999px;object-fit:cover;
      border:2px solid rgba(255,255,255,.45);
      box-shadow:0 8px 24px rgba(0,0,0,.18);
      background:rgba(255,255,255,.08);
    }
    h1{margin:0;font-size:22px;line-height:1.15;font-weight:800;letter-spacing:-.02em}
    .bio{margin:6px 0 0;opacity:.9;line-height:1.55;font-size:14px}
    .links{display:flex;flex-direction:column;gap:10px;margin-top:14px}
    .links a{
      display:flex;align-items:center;gap:10px;justify-content:center;
      text-decoration:none;color:var(--text);
      background:linear-gradient(180deg,#ffffff, #f6fbfb);
      border:1px solid rgba(255,255,255,.7);
      padding:14px 14px;border-radius:16px;
      font-weight:700;
      transition:transform .08s ease, box-shadow .08s ease;
      box-shadow:0 10px 25px rgba(0,0,0,.18);
    }
    .links a:hover{transform:translateY(-1px);box-shadow:0 14px 34px rgba(0,0,0,.22)}
    .link-icon svg{display:block}
    .footer{margin-top:16px;text-align:center;font-size:12px;opacity:.75}
    .footer a{color:var(--textOnDark);text-decoration:underline}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="profile">
        {{avatar_block}}
        <div>
          <h1>{{display_name}}</h1>
          <p class="bio">{{bio}}</p>
        </div>
      </div>
      <div class="links">{{links}}</div>
      <div class="footer">
        <a href="/mentions-legales">Mentions légales</a> · <a href="/confidentialite">Confidentialité</a> · <a href="/contact">Contact</a>
      </div>
    </div>
  </div>
</body>
</html>',
  now()
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.links_templates (name, slug, html, updated_at)
VALUES (
  'OTISUD Organic Homepage',
  'otisud-organic-homepage',
  '<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>{{display_name}} – OTISUD</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" />
  <style>
    :root{
      --bg:#0b5a68;
      --bg2:#05323a;
      --yellow:#f6c343;
      --mint:#2ad0c6;
      --white:#ffffff;
    }
    *{box-sizing:border-box}
    body{
      margin:0;
      font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;
      min-height:100vh;
      color:var(--white);
      background:
        radial-gradient(1200px 600px at 20% 10%, rgba(246,195,67,.35), transparent 55%),
        radial-gradient(900px 500px at 85% 25%, rgba(42,208,198,.35), transparent 55%),
        linear-gradient(135deg,var(--bg),var(--bg2));
    }
    .wrap{max-width:980px;margin:0 auto;padding:44px 20px 64px}
    .hero{
      border-radius:28px;
      border:1px solid rgba(255,255,255,.18);
      background:rgba(255,255,255,.10);
      backdrop-filter: blur(10px);
      padding:28px 22px;
      box-shadow:0 16px 60px rgba(0,0,0,.25);
    }
    .top{display:flex;gap:18px;align-items:center;justify-content:space-between;flex-wrap:wrap}
    .brand{display:flex;align-items:center;gap:12px}
    .brandMark{width:42px;height:42px;border-radius:14px;background:linear-gradient(135deg,var(--yellow),var(--mint));box-shadow:0 10px 28px rgba(0,0,0,.25)}
    .brandTitle{font-weight:800;letter-spacing:-.02em}
    h1{margin:18px 0 8px;font-size:40px;line-height:1.05;font-weight:800;letter-spacing:-.03em}
    p{margin:0;opacity:.9;line-height:1.65;max-width:70ch}
    .cta{margin-top:18px;display:flex;flex-wrap:wrap;gap:10px}
    .cta a{
      display:inline-flex;align-items:center;justify-content:center;
      text-decoration:none;
      padding:12px 16px;border-radius:999px;
      color:#062a30;font-weight:800;
      background:linear-gradient(180deg,#ffffff,#f6fbfb);
      border:1px solid rgba(255,255,255,.6);
      box-shadow:0 10px 26px rgba(0,0,0,.18);
    }
    .grid{margin-top:18px;display:grid;grid-template-columns:repeat(12,1fr);gap:12px}
    .tile{
      grid-column:span 12;
      padding:16px 16px;border-radius:22px;
      background:rgba(255,255,255,.08);
      border:1px solid rgba(255,255,255,.16);
    }
    @media(min-width:860px){
      .tile{grid-column:span 4}
    }
    .tile h3{margin:0 0 6px;font-size:14px;letter-spacing:.06em;text-transform:uppercase;opacity:.9}
    .tile strong{display:block;font-size:22px;font-weight:800;letter-spacing:-.02em}
    .footer{margin-top:18px;text-align:center;font-size:12px;opacity:.75}
    .footer a{color:var(--white);text-decoration:underline}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hero">
      <div class="top">
        <div class="brand">
          <div class="brandMark" aria-hidden="true"></div>
          <div class="brandTitle">OTISUD</div>
        </div>
        <div class="cta">
          {{links}}
        </div>
      </div>
      <h1>{{display_name}}</h1>
      <p>{{bio}}</p>
      <div class="grid" aria-hidden="true">
        <div class="tile"><h3>Découvrir</h3><strong>Explorer le Sud</strong></div>
        <div class="tile"><h3>Profiter</h3><strong>Incontournables</strong></div>
        <div class="tile"><h3>Planifier</h3><strong>Préparer sa visite</strong></div>
      </div>
      <div class="footer">
        <a href="/mentions-legales">Mentions légales</a> · <a href="/confidentialite">Confidentialité</a> · <a href="/contact">Contact</a> · <a href="/login">Espace staff</a>
      </div>
    </div>
  </div>
</body>
</html>',
  now()
)
ON CONFLICT (slug) DO NOTHING;

-- Seed: organization homepage page (rendered at /)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.links_pages WHERE is_homepage = true) THEN
    INSERT INTO public.links_pages (owner_user_id, slug, template_slug, display_name, bio, avatar_url, is_homepage, updated_at)
    VALUES (
      NULL,
      'otisud-homepage',
      'otisud-organic-homepage',
      'En route vers le sud',
      'La page officielle OTISUD. Retrouvez nos liens utiles et les accès staff.',
      NULL,
      true,
      now()
    );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- IMPORTANT: After running this migration, grant admin to a user:
-- INSERT INTO public.links_admins (user_id) VALUES ('<your-user-uuid>');
-- ---------------------------------------------------------------------------
