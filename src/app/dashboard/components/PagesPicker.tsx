'use client';

import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { slugFromString, isReservedSlug } from '@/lib/utils';

type PageSummary = {
  id: string;
  slug: string;
  is_homepage: boolean;
};

export function PagesPicker({
  pages,
  currentPageId,
}: {
  pages: PageSummary[];
  currentPageId: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = pages.find((p) => p.id === currentPageId) ?? pages[0];

  async function createNewPage() {
    setCreating(true);
    setError(null);
    const raw = window.prompt('Slug de la nouvelle page (ex: equipe-ventes)') ?? '';
    const candidate = slugFromString(raw);
    if (!candidate) {
      setCreating(false);
      return;
    }
    if (isReservedSlug(candidate)) {
      setError('Ce slug est réservé.');
      setCreating(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from('links_pages')
      .insert({
        slug: candidate,
        // owner_user_id is enforced by RLS as auth.uid() on insert policy
        owner_user_id: (await supabase.auth.getUser()).data.user?.id,
        template_slug: 'otisud-default',
      })
      .select('id')
      .single();

    setCreating(false);
    if (insertError || !data?.id) {
      setError(insertError?.message ?? 'Impossible de créer la page.');
      return;
    }
    window.location.href = `/dashboard?page=${encodeURIComponent(data.id)}`;
  }

  return (
    <section className="rounded-2xl border border-otilink-sage/35 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Pages</h2>
          <p className="text-xs text-zinc-500">
            Sélectionnez une page à éditer (un utilisateur peut en avoir plusieurs).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={current?.id ? `/dashboard?page=${encodeURIComponent(current.id)}` : '/dashboard'}
            className="rounded-xl border border-otilink-sage/40 bg-white px-3 py-2 text-sm font-extrabold text-otilink-graphite hover:bg-otilink-offwhite"
          >
            Rafraîchir
          </a>
          <button
            type="button"
            onClick={createNewPage}
            disabled={creating}
            className="rounded-xl bg-otilink-teal px-3 py-2 text-sm font-extrabold text-white hover:bg-otilink-teal-700 disabled:opacity-50"
          >
            {creating ? 'Création…' : 'Nouvelle page'}
          </button>
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {pages.map((p) => {
          const active = p.id === currentPageId;
          const label = p.is_homepage ? 'Accueil (/)' : `/${p.slug}`;
          return (
            <a
              key={p.id}
              href={`/dashboard?page=${encodeURIComponent(p.id)}`}
              className={
                active
                  ? 'rounded-full bg-otilink-teal px-3 py-1.5 text-xs font-extrabold text-white'
                  : 'rounded-full border border-otilink-sage/40 bg-white px-3 py-1.5 text-xs font-extrabold text-otilink-graphite hover:bg-otilink-offwhite'
              }
            >
              {label}
            </a>
          );
        })}
      </div>
    </section>
  );
}

