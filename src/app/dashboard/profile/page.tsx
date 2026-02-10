import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { slugFromEmail, isReservedSlug } from '@/lib/utils';
import { getStaffRowByEmail, staffDisplayName } from '@/lib/staff';
import type { LinksProfile } from '@/lib/types';
import { UserProfilePanel } from './UserProfilePanel';

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const email = user.email;
  if (!email) redirect('/login?no_access=1');
  const staffRow = await getStaffRowByEmail(email);
  if (!staffRow) redirect('/login?no_access=1');

  const { data: existing } = await supabase
    .from('links_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  let profile = (existing ?? null) as LinksProfile | null;

  if (!profile) {
    let base = slugFromEmail(email);
    if (isReservedSlug(base)) base = `${base}-profile`;
    for (let attempts = 0; attempts < 20; attempts++) {
      const candidate = attempts === 0 ? base : `${base}-${attempts + 1}`;
      if (isReservedSlug(candidate)) continue;
      const { data: inserted, error } = await supabase
        .from('links_profiles')
        .insert({
          user_id: user.id,
          slug: candidate,
          display_name: staffDisplayName(
            staffRow,
            user.user_metadata?.full_name ?? user.user_metadata?.name ?? null
          ),
          avatar_url: staffRow.avatar ?? user.user_metadata?.avatar_url ?? null,
          bio: null,
        })
        .select('*')
        .single();
      if (!error && inserted) {
        profile = inserted as LinksProfile;
        break;
      }
    }
  }

  if (!profile) {
    return (
      <div className="rounded-2xl border border-otilink-sage/35 bg-white p-6 text-otilink-volcan">
        Impossible de créer ou charger votre profil.
      </div>
    );
  }

  return <UserProfilePanel profile={profile} />;
}

