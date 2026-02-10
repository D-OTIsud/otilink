import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { EditorsManager } from './EditorsManager';

type EditorRow = { user_id: string; email: string | null };

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: adminRow } = await supabase
    .from('links_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .single();
  if (!adminRow) redirect('/dashboard/pages');

  return { user };
}

export default async function AdminEditorsPage() {
  await requireAdmin();
  const service = createServiceClient();

  const { data: editorsRows } = await service.from('links_homepage_editors').select('user_id');
  const ids = (editorsRows ?? []).map((r: any) => String(r.user_id));

  let editors: EditorRow[] = [];
  if (ids.length > 0) {
    const { data: users } = await service
      .from('auth.users')
      .select('id, email')
      .in('id', ids);
    const byId = new Map((users ?? []).map((u: any) => [String(u.id), String(u.email ?? '')]));
    editors = ids.map((id) => ({ user_id: id, email: byId.get(id) ?? null }));
  }

  async function addEditor(formData: FormData) {
    'use server';
    await requireAdmin();
    const email = String(formData.get('email') ?? '').trim().toLowerCase();
    if (!email) return;
    const service = createServiceClient();
    const { data: userRow } = await service
      .from('auth.users')
      .select('id')
      .ilike('email', email)
      .single();
    if (!userRow?.id) return;
    await service.from('links_homepage_editors').upsert({ user_id: userRow.id });
  }

  async function removeEditor(formData: FormData) {
    'use server';
    await requireAdmin();
    const userId = String(formData.get('user_id') ?? '').trim();
    if (!userId) return;
    const service = createServiceClient();
    await service.from('links_homepage_editors').delete().eq('user_id', userId);
  }

  return <EditorsManager initialEditors={editors} addAction={addEditor} removeAction={removeEditor} />;
}

