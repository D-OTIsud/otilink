import 'server-only';

import { createServiceClient } from '@/lib/supabase/service';

export type StaffRow = {
  email: string | null;
  actif: boolean | null;
  nom?: string | null;
  prenom?: string | null;
  avatar?: string | null;
  role?: string | null;
  service?: string | null;
};

export async function getStaffRowByEmail(email: string): Promise<StaffRow | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('appbadge_utilisateurs')
    .select('email, actif, nom, prenom, avatar, role, service')
    .ilike('email', email)
    .eq('actif', true)
    .maybeSingle();

  if (error) return null;
  return (data ?? null) as StaffRow | null;
}

export function staffDisplayName(staff: StaffRow | null, fallback?: string | null) {
  const prenom = (staff?.prenom ?? '').trim();
  const nom = (staff?.nom ?? '').trim();
  const combined = [prenom, nom].filter(Boolean).join(' ').trim();
  return combined || fallback || null;
}

