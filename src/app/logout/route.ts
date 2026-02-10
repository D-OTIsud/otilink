import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function getProxyAwareOrigin(request: Request) {
  const url = new URL(request.url);
  const xfProto = request.headers.get('x-forwarded-proto');
  const xfHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host');

  const protocol = (xfProto ?? url.protocol.replace(':', '')).split(',')[0]?.trim();
  const host = (xfHost ?? url.host).split(',')[0]?.trim();

  if (protocol && host) return `${protocol}://${host}`;
  return url.origin;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const origin = getProxyAwareOrigin(request);
  return NextResponse.redirect(`${origin}/login`, 302);
}

// No GET handler -- logout must be POST to prevent CSRF via <img src="/logout">
