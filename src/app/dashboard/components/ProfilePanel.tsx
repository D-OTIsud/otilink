'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { LinksProfile } from '@/lib/types';
import { slugFromString, isReservedSlug, FIELD_LIMITS } from '@/lib/utils';

export function ProfilePanel({ profile }: { profile: LinksProfile }) {
  const [displayName, setDisplayName] = useState(profile.display_name ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [slug, setSlug] = useState(profile.slug);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const trimmedSlug = slug.trim() || profile.slug;

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
      .from('links_profiles')
      .update({
        display_name: displayName || null,
        bio: bio || null,
        slug: trimmedSlug,
        avatar_url: avatarUrl.trim() || null,
      })
      .eq('user_id', profile.user_id);

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
    setMessage({ type: 'ok', text: 'Profil enregistré.' });
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-zinc-900">Profil</h2>
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
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
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
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
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
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm text-zinc-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Votre page sera à : /{slug || '…'}
          </p>
          {isReservedSlug(slug) && (
            <p className="mt-1 text-xs text-red-500">Ce slug est réservé.</p>
          )}
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
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer le profil'}
        </button>
      </form>
    </section>
  );
}
