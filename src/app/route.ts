import { unstable_cache } from 'next/cache';
import { createServiceClient } from '@/lib/supabase/service';
import { renderTemplate, renderLinksHtml } from '@/lib/template';
import type { ProfileForTemplate, LinkForTemplate } from '@/lib/template';

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
  'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
};

type HomepageData = {
  page: { id: string; slug: string; template_slug: string; display_name: string | null; bio: string | null; avatar_url: string | null };
  links: LinkForTemplate[];
};

function getCachedHomepagePage() {
  return unstable_cache(
    async (): Promise<HomepageData> => {
      const supabase = createServiceClient();

      const { data: page, error: pageError } = await supabase
        .from('links_pages')
        .select('id, slug, template_slug, display_name, bio, avatar_url')
        .eq('is_homepage', true)
        .single();

      if (pageError || !page) throw new Error('homepage_not_found');

      const { data: links } = await supabase
        .from('links_links')
        .select('id, label, url, type, icon')
        .eq('page_id', page.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      return { page, links: (links ?? []) as LinkForTemplate[] };
    },
    ['public-homepage'],
    { revalidate: 86400, tags: ['homepage'] }
  )();
}

function getCachedTemplate(templateSlug: string) {
  return unstable_cache(
    async (): Promise<string> => {
      const supabase = createServiceClient();
      const { data: templateRow, error: templateError } = await supabase
        .from('links_templates')
        .select('html')
        .eq('slug', templateSlug)
        .single();
      if (templateError || !templateRow?.html) throw new Error('template_not_found');
      return templateRow.html;
    },
    ['public-template', templateSlug],
    { revalidate: 86400, tags: [`template:${templateSlug}`] }
  )();
}

export async function GET() {
  let data: HomepageData;
  let templateHtml: string;
  try {
    data = await getCachedHomepagePage();
    templateHtml = await getCachedTemplate(data.page.template_slug);
  } catch (e: any) {
    if (String(e?.message).includes('homepage_not_found')) {
      return new Response(
        '<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>OTISUD Links</title><body style="font-family:system-ui;padding:32px">Homepage not configured.</body></html>',
        { status: 404, headers: SECURITY_HEADERS }
      );
    }
    return new Response('Erreur serveur', { status: 500, headers: SECURITY_HEADERS });
  }

  const profileForTemplate: ProfileForTemplate = data.page;
  const linksHtml = renderLinksHtml(data.links);
  const html = renderTemplate(templateHtml, profileForTemplate, linksHtml);

  return new Response(html, { status: 200, headers: SECURITY_HEADERS });
}

