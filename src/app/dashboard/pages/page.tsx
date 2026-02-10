import { createClient } from '@/lib/supabase/server';
import type { LinksPage } from '@/lib/types';

export default async function PagesIndex() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Layout already protects, but keep a safe fallback
  if (!user) return null;

  const { data: pagesRows } = await supabase
    .from('links_pages')
    .select('*')
    .eq('owner_user_id', user.id)
    .order('created_at', { ascending: true });
  const pages = (pagesRows ?? []) as LinksPage[];

  // Optional: homepage (only visible if RLS allows it)
  const { data: homepageRow } = await supabase
    .from('links_pages')
    .select('*')
    .eq('is_homepage', true)
    .single();
  const homepage = (homepageRow ?? null) as LinksPage | null;

  const all = homepage ? [homepage, ...pages.filter((p) => p.id !== homepage.id)] : pages;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-otilink-sage/35 bg-white p-5">
        <h1 className="text-xl font-extrabold text-otilink-charcoal">Mes pages</h1>
        <p className="mt-1 text-sm text-otilink-graphite">
          Créez et gérez vos pages Linktree. La page d’accueil organisation est gérée séparément.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href="/dashboard/pages/new"
            className="rounded-xl bg-otilink-teal px-4 py-2 text-sm font-extrabold text-white hover:bg-otilink-teal-700"
          >
            Nouvelle page
          </a>
          <a
            href="/dashboard/profile"
            className="rounded-xl border border-otilink-sage/45 bg-white px-4 py-2 text-sm font-extrabold text-otilink-graphite hover:bg-otilink-offwhite"
          >
            Mon profil
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {all.map((p) => (
          <a
            key={p.id}
            href={p.is_homepage ? '/dashboard/homepage' : `/dashboard/pages/${encodeURIComponent(p.id)}`}
            className="group rounded-2xl border border-otilink-sage/35 bg-white p-5 shadow-sm hover:border-otilink-sage/60"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-extrabold text-otilink-charcoal">
                  {p.is_homepage ? 'Accueil (organisation)' : p.display_name || 'Page'}
                </div>
                <div className="mt-1 text-xs font-semibold text-otilink-graphite">
                  {p.is_homepage ? '/' : `/${p.slug}`}
                </div>
              </div>
              <span className="rounded-full bg-otilink-offwhite px-3 py-1 text-xs font-extrabold text-otilink-teal group-hover:bg-white">
                Éditer
              </span>
            </div>
            {p.bio ? (
              <p className="mt-3 line-clamp-2 text-sm text-otilink-graphite">{p.bio}</p>
            ) : (
              <p className="mt-3 text-sm text-otilink-graphite/70">Aucune description.</p>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}

