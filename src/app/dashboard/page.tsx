import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { slugFromEmail, isReservedSlug } from '@/lib/utils';
import type { LinksPage, Link, LinksTemplate } from '@/lib/types';
import { getStaffRowByEmail, staffDisplayName } from '@/lib/staff';
import { ProfilePanel } from './components/ProfilePanel';
import { LinksManager } from './components/LinksManager';
import { TemplateEditor } from './components/TemplateEditor';
import { DashboardShell } from './components/DashboardShell';
import { PagesPicker } from './components/PagesPicker';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Staff-only access (allowlist via appbadge_utilisateurs)
  const email = user.email;
  if (!email) redirect('/login?no_access=1');
  const staffRow = await getStaffRowByEmail(email);
  if (!staffRow) redirect('/login?no_access=1');

  // Admin status from links_admins (not from profile, to prevent self-promotion)
  const { data: adminRow } = await supabase
    .from('links_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .single();
  const isAdmin = !!adminRow;

  // Homepage editor status
  const { data: homepageEditorRow } = await supabase
    .from('links_homepage_editors')
    .select('user_id')
    .eq('user_id', user.id)
    .single();
  const isHomepageEditor = !!homepageEditorRow;

  // Templates list (staff can select; admins can edit HTML)
  const { data: templatesRows } = await supabase
    .from('links_templates')
    .select('slug, name')
    .order('name', { ascending: true });
  const templates = (templatesRows ?? []) as Pick<LinksTemplate, 'slug' | 'name'>[];

  // Load pages owned by the user
  const { data: ownedPagesRows } = await supabase
    .from('links_pages')
    .select('*')
    .eq('owner_user_id', user.id)
    .order('created_at', { ascending: true });
  const ownedPages = (ownedPagesRows ?? []) as LinksPage[];

  // If user can edit the homepage, include it in the list
  let homepagePage: LinksPage | null = null;
  if (isHomepageEditor) {
    const { data: hp } = await supabase
      .from('links_pages')
      .select('*')
      .eq('is_homepage', true)
      .single();
    homepagePage = (hp ?? null) as LinksPage | null;
  }

  let pages = ownedPages;
  if (homepagePage && !pages.some((p) => p.id === homepagePage.id)) {
    pages = [homepagePage, ...pages];
  }

  // Auto-create first page on first login
  if (pages.length === 0) {
    let baseSlug = slugFromEmail(user.email ?? 'user');
    if (isReservedSlug(baseSlug)) baseSlug = `${baseSlug}-page`;
    let attempts = 0;
    const maxAttempts = 20;
    while (attempts < maxAttempts) {
      const candidateSlug = attempts === 0 ? baseSlug : `${baseSlug}-${attempts + 1}`;
      if (isReservedSlug(candidateSlug)) {
        attempts++;
        continue;
      }
      const { data: inserted, error } = await supabase
        .from('links_pages')
        .insert({
          owner_user_id: user.id,
          slug: candidateSlug,
          template_slug: templates[0]?.slug ?? 'otisud-default',
          display_name: staffDisplayName(
            staffRow,
            user.user_metadata?.full_name ?? user.user_metadata?.name ?? null
          ),
          avatar_url: staffRow.avatar ?? user.user_metadata?.avatar_url ?? null,
        })
        .select()
        .single();
      if (!error && inserted) {
        pages = [inserted as LinksPage];
        break;
      }
      if (error?.code === '23505' || error?.code === '23514') {
        attempts++;
        continue;
      }
      break;
    }
  }

  if (pages.length === 0) {
    return (
      <div className="p-8 text-otilink-volcan">
        Impossible de créer ou charger vos pages.
      </div>
    );
  }

  const selectedId = typeof sp.page === 'string' ? sp.page : undefined;
  const selectedPage = (selectedId ? pages.find((p) => p.id === selectedId) : null) ?? pages[0]!;

  const { data: links } = await supabase
    .from('links_links')
    .select('*')
    .eq('page_id', selectedPage.id)
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

  let defaultTemplate: LinksTemplate | null = null;
  if (isAdmin) {
    const { data: templateRow } = await supabase
      .from('links_templates')
      .select('*')
      .eq('slug', 'otisud-default')
      .single();
    defaultTemplate = (templateRow ?? null) as LinksTemplate | null;
  }

  const currentPublicPath = selectedPage.is_homepage ? '/' : `/${selectedPage.slug}`;

  return (
    <DashboardShell currentPublicPath={currentPublicPath}>
      <div className="space-y-8">
        <PagesPicker
          pages={pages.map((p) => ({ id: p.id, slug: p.slug, is_homepage: p.is_homepage }))}
          currentPageId={selectedPage.id}
        />
        <ProfilePanel page={selectedPage} templates={templates} />
        <LinksManager pageId={selectedPage.id} initialLinks={userLinks} clickCounts={clickCounts} />
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
