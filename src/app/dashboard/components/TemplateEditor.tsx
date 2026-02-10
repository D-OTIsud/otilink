'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { LinksTemplate } from '@/lib/types';
import { FIELD_LIMITS } from '@/lib/utils';

const PLACEHOLDERS = [
  '{{display_name}}',
  '{{bio}}',
  '{{avatar_url}}',
  '{{avatar_block}}',
  '{{links}}',
];

export function TemplateEditor({ template }: { template: LinksTemplate }) {
  const [html, setHtml] = useState(template.html);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    if (html.length > FIELD_LIMITS.html) {
      setMessage({ type: 'error', text: `Le template ne peut pas dépasser ${FIELD_LIMITS.html} caractères.` });
      setSaving(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase
      .from('links_templates')
      .update({ html, updated_at: new Date().toISOString() })
      .eq('id', template.id);

    setSaving(false);
    if (error) {
      setMessage({ type: 'error', text: error.message });
      return;
    }
    setMessage({ type: 'ok', text: 'Modèle enregistré.' });
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="mb-2 text-lg font-semibold text-zinc-900">Modèle HTML <span className="text-xs font-normal text-zinc-400">(admin)</span></h2>
      <p className="mb-4 text-sm text-zinc-600">
        Placeholders disponibles : {PLACEHOLDERS.join(', ')}
      </p>
      <textarea
        value={html}
        onChange={(e) => setHtml(e.target.value)}
        rows={18}
        maxLength={FIELD_LIMITS.html}
        className="mb-2 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm text-zinc-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        spellCheck={false}
      />
      <p className="mb-4 text-xs text-zinc-400">{html.length}/{FIELD_LIMITS.html}</p>
      {message && (
        <p
          className={
            message.type === 'ok' ? 'mb-2 text-sm text-green-600' : 'mb-2 text-sm text-red-600'
          }
        >
          {message.text}
        </p>
      )}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
      >
        {saving ? 'Enregistrement…' : 'Enregistrer le modèle'}
      </button>
    </section>
  );
}
