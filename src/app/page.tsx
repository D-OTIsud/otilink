import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getStaffRowByEmail } from '@/lib/staff';

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const email = user.email;
    if (email) {
      const staffRow = await getStaffRowByEmail(email);
      if (staffRow) redirect('/dashboard');
    }
    redirect('/login?no_access=1');
  }
  redirect('/login');
}
