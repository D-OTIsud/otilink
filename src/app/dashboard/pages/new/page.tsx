import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { slugFromEmail, slugFromString, isReservedSlug } from '@/lib/utils';
import type { LinksPage, LinksTemplate } from '@/lib/types';

export default async function NewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: templatesRows } = await supabase
    .from('links_templates')
    .select('slug, name')
    .order('name', { ascending: true });
  const templates = (templatesRows ?? []) as Pick<LinksTemplate, 'slug' | 'name'>[];
  const defaultTemplate = templates[0]?.slug ?? 'otisud-default';

  let base = slugFromEmail(user.email ?? 'user');
  base = slugFromString(base);
  if (isReservedSlug(base)) base = `${base}-page`;

  let created: LinksPage | null = null;
  for (let attempts = 0; attempts < 20; attempts++) {
    const candidate = attempts === 0 ? base : `${base}-${attempts + 1}`;
    if (isReservedSlug(candidate)) continue;
    const { data, error } = await supabase
      .from('links_pages')
      .insert({
        owner_user_id: user.id,
        slug: candidate,
        template_slug: defaultTemplate,
        display_name: null,
        bio: null,
        avatar_url: null,
      })
      .select('*')
      .single();
    if (!error && data) {
      created = data as LinksPage;
      break;
    }
  }

  if (!created) {
    return (
      <div className="rounded-2xl border border-otilink-sage/35 bg-white p-6 text-otilink-volcan">
        Impossible de créer une nouvelle page.
      </div>
    );
  }

  redirect(`/dashboard/pages/${encodeURIComponent(created.id)}`);
}

