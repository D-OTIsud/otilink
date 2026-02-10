import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSafeRedirectPath } from '@/lib/utils';

function getProxyAwareOrigin(request: Request) {
  const url = new URL(request.url);
  const xfProto = request.headers.get('x-forwarded-proto');
  const xfHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host');

  const protocol = (xfProto ?? url.protocol.replace(':', '')).split(',')[0]?.trim();
  const host = (xfHost ?? url.host).split(',')[0]?.trim();

  if (protocol && host) return `${protocol}://${host}`;
  return url.origin;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = getProxyAwareOrigin(request);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  // Prevent open redirect: only allow safe relative paths
  const safePath = isSafeRedirectPath(next) ? next : '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${safePath}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
