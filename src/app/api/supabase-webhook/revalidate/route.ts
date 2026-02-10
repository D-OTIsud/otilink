import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { createServiceClient } from '@/lib/supabase/service';
import { isReservedSlug } from '@/lib/utils';

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

async function userIdToSlug(userId: string): Promise<string | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('links_profiles')
    .select('slug')
    .eq('user_id', userId)
    .single();
  if (error || !data?.slug) return null;
  return String(data.slug).toLowerCase();
}

function revalidateSlug(slug: string) {
  const normalized = slug.trim().toLowerCase();
  if (!normalized || isReservedSlug(normalized)) return;
  revalidateTag(`slug:${normalized}`, { expire: 0 });
}

/**
 * Supabase Database Webhook receiver to purge caches.
 *
 * Configure Supabase Integrations -> Database Webhooks to POST here on:
 * - public.links_links (INSERT, UPDATE, DELETE)
 * - public.links_profiles (UPDATE)  (slug changes)
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

  // Template changes: purge global template tag
  if (table === 'links_templates') {
    revalidateTag('template:otisud-default', { expire: 0 });
    revalidated.push('template:otisud-default');
    return NextResponse.json({ ok: true, revalidated });
  }

  // Profile slug changes: purge old+new slug
  if (table === 'links_profiles') {
    const newSlug = record?.slug ? String(record.slug) : null;
    const oldSlug = oldRecord?.slug ? String(oldRecord.slug) : null;

    if (oldSlug) {
      revalidateSlug(oldSlug);
      revalidated.push(`slug:${oldSlug.toLowerCase()}`);
    }
    if (newSlug && newSlug !== oldSlug) {
      revalidateSlug(newSlug);
      revalidated.push(`slug:${newSlug.toLowerCase()}`);
    }

    return NextResponse.json({ ok: true, revalidated });
  }

  // Link changes: purge the owning profile's slug
  if (table === 'links_links') {
    const profileUserId =
      (record?.profile_user_id as string | undefined) ??
      (oldRecord?.profile_user_id as string | undefined);

    if (!profileUserId) {
      return NextResponse.json({ ok: true, revalidated: [] });
    }

    const slug = await userIdToSlug(profileUserId);
    if (slug) {
      revalidateSlug(slug);
      revalidated.push(`slug:${slug}`);
    }

    return NextResponse.json({ ok: true, revalidated });
  }

  // Unknown table
  return NextResponse.json({ ok: true, revalidated: [] });
}

