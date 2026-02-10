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
    <section className="rounded-2xl border border-otilink-sage/35 bg-white p-6 shadow-sm">
      <h2 className="mb-2 text-lg font-extrabold text-otilink-charcoal">
        Modèle HTML <span className="text-xs font-semibold text-otilink-graphite">(admin)</span>
      </h2>
      <p className="mb-4 text-sm text-otilink-graphite">
        Placeholders disponibles : {PLACEHOLDERS.join(', ')}
      </p>
      <textarea
        value={html}
        onChange={(e) => setHtml(e.target.value)}
        rows={18}
        maxLength={FIELD_LIMITS.html}
        className="mb-2 w-full rounded-xl border border-otilink-sage/45 bg-white px-3 py-2 font-mono text-sm text-otilink-charcoal focus:border-otilink-teal focus:outline-none focus:ring-2 focus:ring-otilink-teal/20"
        spellCheck={false}
      />
      <p className="mb-4 text-xs text-otilink-graphite/70">{html.length}/{FIELD_LIMITS.html}</p>
      {message && (
        <p
          className={
            message.type === 'ok' ? 'mb-2 text-sm text-otilink-teal' : 'mb-2 text-sm text-otilink-volcan'
          }
        >
          {message.text}
        </p>
      )}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="rounded-xl bg-otilink-teal px-4 py-2 text-sm font-extrabold text-white hover:bg-otilink-teal-700 disabled:opacity-50"
      >
        {saving ? 'Enregistrement…' : 'Enregistrer le modèle'}
      </button>
    </section>
  );
}
