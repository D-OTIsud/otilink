import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { isReservedSlug } from '@/lib/utils';

/**
 * Webhook endpoint to purge server-side caches.
 *
 * POST /api/revalidate
 * Headers: x-revalidate-secret: <REVALIDATE_SECRET>
 * Body (json): { slug?: string, template?: boolean }
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

  if (body?.template) {
    tags.push('template:otisud-default');
  }

  if (typeof body?.slug === 'string' && body.slug.trim()) {
    const slug = body.slug.trim().toLowerCase();
    if (!isReservedSlug(slug)) {
      tags.push(`slug:${slug}`);
    }
  }

  if (tags.length === 0) {
    return NextResponse.json({ ok: true, revalidated: [] });
  }

  for (const tag of tags) {
    revalidateTag(tag);
  }

  return NextResponse.json({ ok: true, revalidated: tags });
}

