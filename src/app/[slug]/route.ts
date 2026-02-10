import { NextRequest } from 'next/server';
import { unstable_cache } from 'next/cache';
import { createServiceClient } from '@/lib/supabase/service';
import { renderTemplate, renderLinksHtml } from '@/lib/template';
import type { ProfileForTemplate, LinkForTemplate } from '@/lib/template';
import { isReservedSlug } from '@/lib/utils';

/**
 * Security headers for the public HTML page.
 */
const SECURITY_HEADERS: Record<string, string> = {
  'Content-Type': 'text/html; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy':
    "default-src 'none'; " +
    "base-uri 'none'; " +
    "form-action 'none'; " +
    "style-src 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src https://fonts.gstatic.com; " +
    "img-src https: data:; " +
    "connect-src 'none'; " +
    "script-src 'none'; " +
    "frame-ancestors 'none';",
  // CDN/proxy cache (1 day) + SWR. Database fetches are additionally cached server-side via unstable_cache.
  'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
};

type PublicPageData = {
  profile: { user_id: string; display_name: string | null; bio: string | null; avatar_url: string | null };
  links: LinkForTemplate[];
  templateHtml: string;
};

function getCachedPublicData(slug: string) {
  return unstable_cache(
    async (): Promise<PublicPageData> => {
      const supabase = createServiceClient();

      const { data: profile, error: profileError } = await supabase
        .from('links_profiles')
        .select('user_id, display_name, bio, avatar_url')
        .eq('slug', slug)
        .single();
      if (profileError || !profile) throw new Error('profile_not_found');

      const { data: links } = await supabase
        .from('links_links')
        .select('id, label, url, type, icon')
        .eq('profile_user_id', profile.user_id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      const { data: templateRow, error: templateError } = await supabase
        .from('links_templates')
        .select('html')
        .eq('slug', 'otisud-default')
        .single();
      if (templateError || !templateRow?.html) throw new Error('template_not_found');

      return { profile, links: (links ?? []) as LinkForTemplate[], templateHtml: templateRow.html };
    },
    ['public-page', slug],
    { revalidate: 86400, tags: [`slug:${slug}`, 'template:otisud-default'] }
  )();
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!slug || isReservedSlug(slug)) {
    return new Response('Not Found', { status: 404 });
  }
  const normalizedSlug = slug.toLowerCase();

  let data: PublicPageData;
  try {
    data = await getCachedPublicData(normalizedSlug);
  } catch (e: any) {
    if (String(e?.message).includes('profile_not_found')) {
      return new Response('Page non trouvée', { status: 404 });
    }
    return new Response('Erreur serveur', { status: 500 });
  }

  const profileForTemplate: ProfileForTemplate = data.profile;
  const linksHtml = renderLinksHtml(data.links);
  const html = renderTemplate(data.templateHtml, profileForTemplate, linksHtml);

  return new Response(html, {
    status: 200,
    headers: SECURITY_HEADERS,
  });
}
