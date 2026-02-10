export interface LinksProfile {
  user_id: string;
  slug: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface LinksPage {
  id: string;
  owner_user_id: string | null;
  slug: string;
  template_slug: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_homepage: boolean;
  created_at: string;
  updated_at: string;
}

export interface Link {
  id: string;
  page_id: string | null;
  profile_user_id: string | null; // legacy/backfill column
  label: string;
  url: string;
  type: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface LinksTemplate {
  id: string;
  name: string;
  slug: string;
  html: string;
  created_at: string;
  updated_at: string;
}

export interface LinkClick {
  id: string;
  link_id: string;
  clicked_at: string;
  referrer: string | null;
  user_agent: string | null;
  referrer_domain?: string | null;
  is_bot?: boolean;
}
