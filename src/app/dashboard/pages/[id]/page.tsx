import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { LinksPage, Link, LinksTemplate } from '@/lib/types';
import { ProfilePanel } from '../../components/ProfilePanel';
import { LinksManager } from '../../components/LinksManager';

export default async function PageEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: pageRow } = await supabase.from('links_pages').select('*').eq('id', id).single();
  const page = (pageRow ?? null) as LinksPage | null;
  if (!page || page.is_homepage) redirect('/dashboard/pages');

  const { data: templatesRows } = await supabase
    .from('links_templates')
    .select('slug, name')
    .order('name', { ascending: true });
  const templates = (templatesRows ?? []) as Pick<LinksTemplate, 'slug' | 'name'>[];

  const { data: linksRows } = await supabase
    .from('links_links')
    .select('*')
    .eq('page_id', page.id)
    .order('sort_order', { ascending: true });
  const links = (linksRows ?? []) as Link[];

  const clickCounts: Record<string, number> = {};
  if (links.length > 0) {
    const linkIds = links.map((l) => l.id);
    const { data: rows } = await supabase.rpc('get_click_counts', { link_ids: linkIds });
    if (Array.isArray(rows)) {
      for (const row of rows) clickCounts[row.link_id] = Number(row.clicks ?? 0);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-otilink-sage/35 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-extrabold text-otilink-charcoal">
              Édition de page
            </h1>
            <p className="mt-1 text-sm text-otilink-graphite">
              Public : <span className="font-extrabold">/{page.slug}</span>
            </p>
          </div>
          <a
            href={`/${page.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl bg-otilink-teal px-4 py-2 text-sm font-extrabold text-white hover:bg-otilink-teal-700"
          >
            Voir public
          </a>
        </div>
      </div>

      <ProfilePanel page={page} templates={templates} />
      <LinksManager pageId={page.id} initialLinks={links} clickCounts={clickCounts} />
    </div>
  );
}

