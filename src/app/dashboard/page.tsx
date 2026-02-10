import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { slugFromEmail, isReservedSlug } from '@/lib/utils';
import type { LinksProfile, Link, LinksTemplate } from '@/lib/types';
import { ProfilePanel } from './components/ProfilePanel';
import { LinksManager } from './components/LinksManager';
import { TemplateEditor } from './components/TemplateEditor';
import { DashboardShell } from './components/DashboardShell';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let profile: LinksProfile | null = null;
  const { data: profileData } = await supabase
    .from('links_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();
  profile = profileData ?? null;

  if (!profile) {
    let baseSlug = slugFromEmail(user.email ?? 'user');
    // Avoid reserved slugs
    if (isReservedSlug(baseSlug)) {
      baseSlug = `${baseSlug}-profile`;
    }
    let attempts = 0;
    const maxAttempts = 20;
    while (attempts < maxAttempts) {
      const candidateSlug = attempts === 0 ? baseSlug : `${baseSlug}-${attempts + 1}`;
      if (isReservedSlug(candidateSlug)) {
        attempts++;
        continue;
      }
      const { data: inserted, error } = await supabase
        .from('links_profiles')
        .insert({
          user_id: user.id,
          slug: candidateSlug,
          display_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
          avatar_url: user.user_metadata?.avatar_url ?? null,
        })
        .select()
        .single();
      if (!error && inserted) {
        profile = inserted as LinksProfile;
        break;
      }
      if (error?.code === '23505' || error?.code === '23514') {
        attempts++;
        continue;
      }
      break;
    }
    if (!profile) {
      const fallbackSlug = `user-${user.id.slice(0, 8)}`;
      const { data: inserted } = await supabase
        .from('links_profiles')
        .insert({
          user_id: user.id,
          slug: fallbackSlug,
          display_name: user.user_metadata?.full_name ?? null,
          avatar_url: user.user_metadata?.avatar_url ?? null,
        })
        .select()
        .single();
      profile = (inserted ?? null) as LinksProfile | null;
    }
  }

  if (!profile) {
    return (
      <div className="p-8 text-red-600">
        Impossible de créer ou charger votre profil. Réessayez plus tard.
      </div>
    );
  }

  const { data: links } = await supabase
    .from('links_links')
    .select('*')
    .eq('profile_user_id', user.id)
    .order('sort_order', { ascending: true });
  const userLinks = (links ?? []) as Link[];

  // Fetch click counts via aggregate RPC (scalable)
  const clickCounts: Record<string, number> = {};
  if (userLinks.length > 0) {
    const linkIds = userLinks.map((l) => l.id);
    const { data: rows } = await supabase.rpc('get_click_counts', { link_ids: linkIds });
    if (Array.isArray(rows)) {
      for (const row of rows) {
        clickCounts[row.link_id] = Number(row.clicks ?? 0);
      }
    }
  }

  // Monthly aggregation (human/bot) for the last 12 months
  const { data: monthlyRows } = await supabase.rpc('get_monthly_clicks', { months: 12 });
  const monthFmt = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });

  // Admin status from links_admins (not from profile, to prevent self-promotion)
  const { data: adminRow } = await supabase
    .from('links_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .single();
  const isAdmin = !!adminRow;

  let defaultTemplate: LinksTemplate | null = null;
  if (isAdmin) {
    const { data: templateRow } = await supabase
      .from('links_templates')
      .select('*')
      .eq('slug', 'otisud-default')
      .single();
    defaultTemplate = (templateRow ?? null) as LinksTemplate | null;
  }

  return (
    <DashboardShell profileSlug={profile.slug}>
      <div className="space-y-8">
        <ProfilePanel profile={profile} />
        <LinksManager profileUserId={user.id} initialLinks={userLinks} clickCounts={clickCounts} />
        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900">Statistiques mensuelles</h2>
          {!Array.isArray(monthlyRows) || monthlyRows.length === 0 ? (
            <p className="text-sm text-zinc-500">Aucune donnée pour le moment.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-zinc-500">
                  <tr>
                    <th className="py-2 pr-4">Mois</th>
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Icône</th>
                    <th className="py-2 pr-4">Clics (hors bots)</th>
                    <th className="py-2 pr-4">Clics bots</th>
                  </tr>
                </thead>
                <tbody className="text-zinc-800">
                  {monthlyRows.map((r: any, idx: number) => (
                    <tr key={idx} className="border-t border-zinc-100">
                      <td className="py-2 pr-4">
                        {r.month ? monthFmt.format(new Date(r.month)) : '—'}
                      </td>
                      <td className="py-2 pr-4">{r.type ?? '—'}</td>
                      <td className="py-2 pr-4">{r.icon ?? '—'}</td>
                      <td className="py-2 pr-4">{Number(r.clicks_human ?? 0)}</td>
                      <td className="py-2 pr-4">{Number(r.clicks_bot ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        {isAdmin && defaultTemplate && (
          <TemplateEditor template={defaultTemplate} />
        )}
      </div>
    </DashboardShell>
  );
}
