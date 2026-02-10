'use client';

import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { LinksProfile } from '@/lib/types';
import { slugFromString, isReservedSlug, FIELD_LIMITS, isSafeUrl } from '@/lib/utils';

export function UserProfilePanel({ profile }: { profile: LinksProfile }) {
  const supabase = useMemo(() => createClient(), []);
  const [displayName, setDisplayName] = useState(profile.display_name ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [slug, setSlug] = useState(profile.slug ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const safeAvatar = isSafeUrl(avatarUrl) ? avatarUrl : '';
  const initials = (displayName || slug || 'OT')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const trimmedSlug = slug.trim() || profile.slug;
    if (trimmedSlug.length < FIELD_LIMITS.slug_min || trimmedSlug.length > FIELD_LIMITS.slug_max) {
      setMessage({
        type: 'error',
        text: `Le slug doit faire entre ${FIELD_LIMITS.slug_min} et ${FIELD_LIMITS.slug_max} caractères.`,
      });
      setSaving(false);
      return;
    }
    if (isReservedSlug(trimmedSlug)) {
      setMessage({ type: 'error', text: 'Ce slug est réservé. Choisissez un autre.' });
      setSaving(false);
      return;
    }

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
      setMessage({ type: 'error', text: error.message });
      return;
    }
    setMessage({ type: 'ok', text: 'Profil enregistré.' });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-otilink-sage/35 bg-white p-5">
        <h1 className="text-xl font-extrabold text-otilink-charcoal">Mon profil (interne)</h1>
        <p className="mt-1 text-sm text-otilink-graphite">
          Ce profil est interne (staff). Vos pages publiques sont gérées dans “Pages”.
        </p>
      </div>

      <section className="rounded-2xl border border-otilink-sage/35 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-otilink-charcoal">Informations</h2>
            <p className="text-sm text-otilink-graphite">Utilisé comme valeurs par défaut lors de la création de pages.</p>
          </div>
          <div className="flex items-center gap-3">
            {safeAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={safeAvatar} alt="" className="h-12 w-12 rounded-full border border-otilink-sage/35 object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-otilink-sage/35 bg-otilink-offwhite text-sm font-extrabold text-otilink-graphite">
                {initials || 'OT'}
              </div>
            )}
          </div>
        </div>

        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-extrabold text-otilink-graphite">Nom affiché</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={FIELD_LIMITS.display_name}
              className="w-full rounded-xl border border-otilink-sage/45 bg-white px-3 py-2 text-otilink-charcoal focus:border-otilink-teal focus:outline-none focus:ring-2 focus:ring-otilink-teal/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-extrabold text-otilink-graphite">Bio</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={FIELD_LIMITS.bio}
              className="w-full rounded-xl border border-otilink-sage/45 bg-white px-3 py-2 text-otilink-charcoal focus:border-otilink-teal focus:outline-none focus:ring-2 focus:ring-otilink-teal/20"
            />
            <p className="mt-1 text-xs text-otilink-graphite/70">
              {bio.length}/{FIELD_LIMITS.bio}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-extrabold text-otilink-graphite">Slug (interne)</label>
            <input
              value={slug}
              onChange={(e) => setSlug(slugFromString(e.target.value) || e.target.value)}
              maxLength={FIELD_LIMITS.slug_max}
              className="w-full rounded-xl border border-otilink-sage/45 bg-white px-3 py-2 font-mono text-sm text-otilink-charcoal focus:border-otilink-teal focus:outline-none focus:ring-2 focus:ring-otilink-teal/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-extrabold text-otilink-graphite">URL avatar</label>
            <input
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              maxLength={FIELD_LIMITS.avatar_url}
              placeholder="https://..."
              className="w-full rounded-xl border border-otilink-sage/45 bg-white px-3 py-2 text-otilink-charcoal focus:border-otilink-teal focus:outline-none focus:ring-2 focus:ring-otilink-teal/20"
            />
          </div>

          {message ? (
            <p className={message.type === 'ok' ? 'text-sm text-otilink-teal' : 'text-sm text-otilink-volcan'}>
              {message.text}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-otilink-teal px-4 py-2 text-sm font-extrabold text-white hover:bg-otilink-teal-700 disabled:opacity-50"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      </section>
    </div>
  );
}

