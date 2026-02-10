export interface LinksProfile {
  user_id: string;
  slug: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Link {
  id: string;
  profile_user_id: string;
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
}
