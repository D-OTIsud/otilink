import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { isReservedSlug } from '@/lib/utils';

/**
 * Webhook endpoint to purge server-side caches.
 *
 * POST /api/revalidate
 * Headers: x-revalidate-secret: <REVALIDATE_SECRET>
 * Body (json): { page?: string, homepage?: boolean, template_slug?: string }
 *
 * Backward-compatible aliases:
 * - slug -> page
 * - template=true -> template:otisud-default
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-revalidate-secret');
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const tags: string[] = [];

  if (body?.homepage) {
    tags.push('homepage');
  }

  const templateSlug =
    (typeof body?.template_slug === 'string' ? body.template_slug : null) ??
    (body?.template ? 'otisud-default' : null);
  if (templateSlug) {
    tags.push(`template:${String(templateSlug).trim()}`);
  }

  const pageSlug = (typeof body?.page === 'string' ? body.page : null) ?? (typeof body?.slug === 'string' ? body.slug : null);
  if (pageSlug && String(pageSlug).trim()) {
    const slug = String(pageSlug).trim().toLowerCase();
    if (!isReservedSlug(slug)) tags.push(`page:${slug}`);
  }

  if (tags.length === 0) {
    return NextResponse.json({ ok: true, revalidated: [] });
  }

  for (const tag of tags) {
    // Next.js 16 requires a revalidation profile/expire option (2nd argument).
    // For webhook-style invalidation we want immediate expiration.
    revalidateTag(tag, { expire: 0 });
  }

  return NextResponse.json({ ok: true, revalidated: tags });
}

