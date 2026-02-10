import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { createServiceClient } from '@/lib/supabase/service';

type WebhookPayload = {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: any | null;
  old_record: any | null;
};

function assertAuthorized(request: NextRequest): NextResponse | null {
  const secret = request.headers.get('x-revalidate-secret');
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  return null;
}

async function pageIdToSlugAndHomepage(pageId: string): Promise<{ slug: string; is_homepage: boolean } | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('links_pages')
    .select('slug, is_homepage')
    .eq('id', pageId)
    .single();
  if (error || !data?.slug) return null;
  return { slug: String(data.slug).toLowerCase(), is_homepage: Boolean(data.is_homepage) };
}

function revalidatePage(slug: string) {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return;
  revalidateTag(`page:${normalized}`, { expire: 0 });
}

function revalidateHomepage() {
  revalidateTag('homepage', { expire: 0 });
}

/**
 * Supabase Database Webhook receiver to purge caches.
 *
 * Configure Supabase Integrations -> Database Webhooks to POST here on:
 * - public.links_links (INSERT, UPDATE, DELETE)
 * - public.links_pages (INSERT, UPDATE, DELETE)
 * - public.links_templates (UPDATE) (template changes)
 *
 * Must include header: x-revalidate-secret: <REVALIDATE_SECRET>
 */
export async function POST(request: NextRequest) {
  const unauthorized = assertAuthorized(request);
  if (unauthorized) return unauthorized;

  let payload: WebhookPayload;
  try {
    payload = (await request.json()) as WebhookPayload;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const table = payload?.table;
  const record = payload?.record ?? null;
  const oldRecord = payload?.old_record ?? null;

  const revalidated: string[] = [];

  // Template changes: purge template tag
  if (table === 'links_templates') {
    const newSlug = record?.slug ? String(record.slug) : null;
    const oldSlug = oldRecord?.slug ? String(oldRecord.slug) : null;
    if (oldSlug) {
      revalidateTag(`template:${oldSlug}`, { expire: 0 });
      revalidated.push(`template:${oldSlug}`);
    }
    if (newSlug && newSlug !== oldSlug) {
      revalidateTag(`template:${newSlug}`, { expire: 0 });
      revalidated.push(`template:${newSlug}`);
    }
    return NextResponse.json({ ok: true, revalidated });
  }

  // Page changes: purge old+new page tag (+ homepage tag when applicable)
  if (table === 'links_pages') {
    const newSlug = record?.slug ? String(record.slug) : null;
    const oldSlug = oldRecord?.slug ? String(oldRecord.slug) : null;
    const newIsHomepage = Boolean(record?.is_homepage);
    const oldIsHomepage = Boolean(oldRecord?.is_homepage);

    if (oldSlug) {
      revalidatePage(oldSlug);
      revalidated.push(`page:${oldSlug.toLowerCase()}`);
    }
    if (newSlug && newSlug !== oldSlug) {
      revalidatePage(newSlug);
      revalidated.push(`page:${newSlug.toLowerCase()}`);
    }

    if (newIsHomepage || oldIsHomepage) {
      revalidateHomepage();
      revalidated.push('homepage');
    }

    return NextResponse.json({ ok: true, revalidated });
  }

  // Link changes: purge the owning page
  if (table === 'links_links') {
    const pageId = (record?.page_id as string | undefined) ?? (oldRecord?.page_id as string | undefined);

    if (!pageId) {
      return NextResponse.json({ ok: true, revalidated: [] });
    }

    const page = await pageIdToSlugAndHomepage(pageId);
    if (page?.slug) {
      revalidatePage(page.slug);
      revalidated.push(`page:${page.slug}`);
      if (page.is_homepage) {
        revalidateHomepage();
        revalidated.push('homepage');
      }
    }

    return NextResponse.json({ ok: true, revalidated });
  }

  // Unknown table
  return NextResponse.json({ ok: true, revalidated: [] });
}

