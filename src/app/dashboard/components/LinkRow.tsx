'use client';

import { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Link } from '@/lib/types';
import { FIELD_LIMITS, isSafeUrl } from '@/lib/utils';

const LINK_TYPES = ['social', 'website', 'other'] as const;
const ICON_OPTIONS = ['facebook', 'instagram', 'youtube', 'twitter', 'linkedin', 'link', ''] as const;

export function LinkRow({
  link,
  clickCount,
  onUpdate,
  onDelete,
}: {
  link: Link;
  clickCount?: number;
  onUpdate: (updates: Partial<Link>) => void;
  onDelete: () => void;
}) {
  const [label, setLabel] = useState(link.label);
  const [url, setUrl] = useState(link.url);
  const [urlError, setUrlError] = useState<string | null>(null);

  useEffect(() => {
    setLabel(link.label);
    setUrl(link.url);
  }, [link.label, link.url]);

  function handleUrlBlur() {
    const trimmed = url.trim();
    if (!trimmed) {
      setUrlError('L\'URL est obligatoire.');
      return;
    }
    if (!isSafeUrl(trimmed)) {
      setUrlError('L\'URL doit commencer par https:// ou http://');
      return;
    }
    setUrlError(null);
    onUpdate({ url: trimmed });
  }

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: link.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-white p-3 ${
        isDragging ? 'z-10 opacity-90 shadow-md' : ''
      }`}
    >
      <button
        type="button"
        className="cursor-grab touch-none rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
        {...attributes}
        {...listeners}
        aria-label="Réordonner"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </button>
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={() => onUpdate({ label: label.trim() })}
        placeholder="Label"
        maxLength={FIELD_LIMITS.label}
        className="min-w-[100px] flex-1 rounded border border-zinc-300 px-2 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
      />
      <div className="min-w-[140px] flex-1">
        <input
          type="url"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setUrlError(null); }}
          onBlur={handleUrlBlur}
          placeholder="https://..."
          maxLength={FIELD_LIMITS.url}
          className={`w-full rounded border px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 ${
            urlError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-zinc-300 focus:border-teal-500'
          }`}
        />
        {urlError && <p className="mt-0.5 text-xs text-red-600">{urlError}</p>}
      </div>
      <select
        value={link.type ?? ''}
        onChange={(e) => onUpdate({ type: e.target.value || null })}
        className="rounded border border-zinc-300 px-2 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
      >
        {LINK_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <select
        value={link.icon ?? ''}
        onChange={(e) => onUpdate({ icon: e.target.value || null })}
        className="rounded border border-zinc-300 px-2 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
      >
        {ICON_OPTIONS.map((i) => (
          <option key={i || 'none'} value={i}>
            {i || '—'}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-1.5 text-sm text-zinc-600">
        <input
          type="checkbox"
          checked={link.is_active}
          onChange={(e) => onUpdate({ is_active: e.target.checked })}
          className="rounded border-zinc-300 text-teal-600 focus:ring-teal-500"
        />
        Actif
      </label>
      {typeof clickCount === 'number' && (
        <span className="rounded bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600" title="Clics (hors bots)">
          {clickCount} clic{clickCount !== 1 ? 's' : ''}
        </span>
      )}
      <button
        type="button"
        onClick={onDelete}
        className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
        aria-label="Supprimer"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}
