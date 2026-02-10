'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { LinksPage, LinksTemplate } from '@/lib/types';
import { slugFromString, isReservedSlug, FIELD_LIMITS, isSafeUrl } from '@/lib/utils';

export function ProfilePanel({
  page,
  templates,
}: {
  page: LinksPage;
  templates: Pick<LinksTemplate, 'slug' | 'name'>[];
}) {
  const [displayName, setDisplayName] = useState(page.display_name ?? '');
  const [bio, setBio] = useState(page.bio ?? '');
  const [slug, setSlug] = useState(page.slug);
  const [avatarUrl, setAvatarUrl] = useState(page.avatar_url ?? '');
  const [templateSlug, setTemplateSlug] = useState(page.template_slug ?? 'otisud-default');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const trimmedSlug = slug.trim() || page.slug;

    // Client-side validation
    if (trimmedSlug.length < FIELD_LIMITS.slug_min || trimmedSlug.length > FIELD_LIMITS.slug_max) {
      setMessage({ type: 'error', text: `Le slug doit faire entre ${FIELD_LIMITS.slug_min} et ${FIELD_LIMITS.slug_max} caractères.` });
      setSaving(false);
      return;
    }
    if (isReservedSlug(trimmedSlug)) {
      setMessage({ type: 'error', text: 'Ce slug est réservé. Choisissez un autre.' });
      setSaving(false);
      return;
    }
    if (displayName.length > FIELD_LIMITS.display_name) {
      setMessage({ type: 'error', text: `Le nom affiché ne peut pas dépasser ${FIELD_LIMITS.display_name} caractères.` });
      setSaving(false);
      return;
    }
    if (bio.length > FIELD_LIMITS.bio) {
      setMessage({ type: 'error', text: `La bio ne peut pas dépasser ${FIELD_LIMITS.bio} caractères.` });
      setSaving(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase
      .from('links_pages')
      .update({
        display_name: displayName || null,
        bio: bio || null,
        slug: trimmedSlug,
        avatar_url: avatarUrl.trim() || null,
        template_slug: templateSlug,
      })
      .eq('id', page.id);

    setSaving(false);
    if (error) {
      if (error.code === '23505') {
        setMessage({ type: 'error', text: 'Ce slug est déjà utilisé. Choisissez un autre.' });
      } else if (error.code === '23514') {
        setMessage({ type: 'error', text: 'Valeur invalide. Vérifiez la longueur des champs.' });
      } else {
        setMessage({ type: 'error', text: error.message });
      }
      return;
    }
    setMessage({ type: 'ok', text: 'Page enregistrée.' });
  }

  const safeAvatar = isSafeUrl(avatarUrl) ? avatarUrl : '';
  const initials = (displayName || slug || 'OT')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');

  return (
    <section className="rounded-2xl border border-otilink-sage/35 bg-white/80 p-6 shadow-sm backdrop-blur">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">
            {page.is_homepage ? 'Page d’accueil (organisation)' : 'Page'}
          </h2>
          <p className="text-sm text-zinc-500">
            {page.is_homepage ? 'Affichée sur /' : `Affichée sur /${slug || '…'}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {safeAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={safeAvatar}
              alt=""
              className="h-12 w-12 rounded-full border border-zinc-200 object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-sm font-semibold text-zinc-600">
              {initials || 'OT'}
            </div>
          )}
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="display_name" className="mb-1 block text-sm font-medium text-zinc-700">
            Nom affiché
          </label>
          <input
            id="display_name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={FIELD_LIMITS.display_name}
            className="w-full rounded-xl border border-otilink-sage/45 bg-white px-3 py-2 text-otilink-charcoal focus:border-otilink-teal focus:outline-none focus:ring-2 focus:ring-otilink-teal/20"
          />
        </div>
        <div>
          <label htmlFor="bio" className="mb-1 block text-sm font-medium text-zinc-700">
            Bio
          </label>
          <textarea
            id="bio"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={FIELD_LIMITS.bio}
            className="w-full rounded-xl border border-otilink-sage/45 bg-white px-3 py-2 text-otilink-charcoal focus:border-otilink-teal focus:outline-none focus:ring-2 focus:ring-otilink-teal/20"
          />
          <p className="mt-1 text-xs text-zinc-400">{bio.length}/{FIELD_LIMITS.bio}</p>
        </div>
        <div>
          <label htmlFor="slug" className="mb-1 block text-sm font-medium text-zinc-700">
            Slug (URL)
          </label>
          <input
            id="slug"
            type="text"
            value={slug}
            onChange={(e) => setSlug(slugFromString(e.target.value) || e.target.value)}
            maxLength={FIELD_LIMITS.slug_max}
            disabled={page.is_homepage}
            className="w-full rounded-xl border border-otilink-sage/45 bg-white px-3 py-2 font-mono text-sm text-otilink-charcoal focus:border-otilink-teal focus:outline-none focus:ring-2 focus:ring-otilink-teal/20 disabled:opacity-60"
          />
          <p className="mt-1 text-xs text-zinc-500">
            {page.is_homepage ? 'Cette page est accessible sur /' : `Votre page sera à : /${slug || '…'}`}
          </p>
          {isReservedSlug(slug) && (
            <p className="mt-1 text-xs text-red-500">Ce slug est réservé.</p>
          )}
        </div>
        <div>
          <label htmlFor="template_slug" className="mb-1 block text-sm font-medium text-zinc-700">
            Modèle (template)
          </label>
          <select
            id="template_slug"
            value={templateSlug}
            onChange={(e) => setTemplateSlug(e.target.value)}
            className="w-full rounded-xl border border-otilink-sage/45 bg-white px-3 py-2 text-otilink-charcoal focus:border-otilink-teal focus:outline-none focus:ring-2 focus:ring-otilink-teal/20"
          >
            {templates.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name} ({t.slug})
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-zinc-500">
            Vous pouvez sélectionner un modèle. Seuls les admins peuvent modifier la liste des modèles.
          </p>
        </div>
        <div>
          <label htmlFor="avatar_url" className="mb-1 block text-sm font-medium text-zinc-700">
            URL de l&apos;avatar
          </label>
          <input
            id="avatar_url"
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            maxLength={FIELD_LIMITS.avatar_url}
            placeholder="https://..."
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
        {message && (
          <p
            className={
              message.type === 'ok'
                ? 'text-sm text-green-600'
                : 'text-sm text-red-600'
            }
          >
            {message.text}
          </p>
        )}
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-otilink-teal px-4 py-2 text-sm font-extrabold text-white hover:bg-otilink-teal-700 disabled:opacity-50"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer la page'}
        </button>
      </form>
    </section>
  );
}
