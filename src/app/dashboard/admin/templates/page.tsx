import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { LinksTemplate } from '@/lib/types';
import { TemplateEditor } from '../../components/TemplateEditor';

export default async function AdminTemplatesPage({
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

  const { data: adminRow } = await supabase
    .from('links_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .single();
  if (!adminRow) redirect('/dashboard/pages');

  const { data: templatesRows } = await supabase
    .from('links_templates')
    .select('*')
    .order('name', { ascending: true });
  const templates = (templatesRows ?? []) as LinksTemplate[];
  const selectedSlug = typeof sp.slug === 'string' ? sp.slug : undefined;
  const selected = (selectedSlug ? templates.find((t) => t.slug === selectedSlug) : null) ?? templates[0] ?? null;

  if (!selected) {
    return (
      <div className="rounded-2xl border border-otilink-sage/35 bg-white p-6 text-otilink-volcan">
        Aucun template trouvé.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-otilink-sage/35 bg-white p-5">
        <h1 className="text-xl font-extrabold text-otilink-charcoal">Templates (admin)</h1>
        <p className="mt-1 text-sm text-otilink-graphite">
          Les staff peuvent sélectionner un template. Seuls les admins peuvent modifier le HTML.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {templates.map((t) => (
            <a
              key={t.id}
              href={`/dashboard/admin/templates?slug=${encodeURIComponent(t.slug)}`}
              className={
                t.slug === selected.slug
                  ? 'rounded-full bg-otilink-teal px-3 py-1.5 text-xs font-extrabold text-white'
                  : 'rounded-full border border-otilink-sage/45 bg-white px-3 py-1.5 text-xs font-extrabold text-otilink-graphite hover:bg-otilink-offwhite'
              }
            >
              {t.name}
            </a>
          ))}
        </div>
      </div>

      <TemplateEditor template={selected} />
    </div>
  );
}

