import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getStaffRowByEmail } from '@/lib/staff';
import { DashboardShell } from './components/DashboardShell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Staff-only allowlist
  const email = user.email;
  if (!email) redirect('/login?no_access=1');
  const staffRow = await getStaffRowByEmail(email);
  if (!staffRow) redirect('/login?no_access=1');

  const { data: adminRow } = await supabase
    .from('links_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .single();
  const isAdmin = !!adminRow;

  const { data: editorRow } = await supabase
    .from('links_homepage_editors')
    .select('user_id')
    .eq('user_id', user.id)
    .single();
  const isHomepageEditor = !!editorRow || isAdmin;

  return (
    <DashboardShell userEmail={email} isAdmin={isAdmin} isHomepageEditor={isHomepageEditor}>
      {children}
    </DashboardShell>
  );
}

