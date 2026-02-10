import { NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { isSafeUrl, isBotUserAgent, referrerToDomain } from '@/lib/utils';

/**
 * Click tracking redirect: GET /go/{link_id}
 * Records the click in links_clicks then 302-redirects to the destination URL.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return new Response('Not Found', { status: 404 });
  }

  const supabase = createServiceClient();

  // Fetch the link
  const { data: link, error } = await supabase
    .from('links_links')
    .select('id, url, is_active')
    .eq('id', id)
    .single();

  if (error || !link || !link.is_active) {
    return new Response('Lien non trouvé', { status: 404 });
  }

  // Validate the URL is safe before redirecting
  if (!isSafeUrl(link.url)) {
    return new Response('URL non valide', { status: 400 });
  }

  // Record the click (privacy-friendly + bot filtering)
  const referrer = request.headers.get('referer');
  const userAgent = request.headers.get('user-agent');
  const referrerDomain = referrerToDomain(referrer);
  const isBot = isBotUserAgent(userAgent);

  try {
    // Keep payload minimal; store domain + bot flag (not full referrer URL).
    await supabase.from('links_clicks').insert({
      link_id: link.id,
      referrer_domain: referrerDomain,
      referrer: null,
      user_agent: null,
      is_bot: isBot,
    });
  } catch {
    // Best effort: never block redirects on tracking failures.
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: link.url,
      'Cache-Control': 'no-store',
    },
  });
}
