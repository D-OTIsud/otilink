'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { createClient } from '@/lib/supabase/client';
import type { Link } from '@/lib/types';
import { LinkRow } from './LinkRow';

/**
 * pageId is needed for INSERT. RLS validates user can edit the page.
 * clickCounts: map of link_id -> number of clicks (loaded server-side).
 */
export function LinksManager({
  pageId,
  initialLinks,
  clickCounts,
}: {
  pageId: string;
  initialLinks: Link[];
  clickCounts: Record<string, number>;
}) {
  const [links, setLinks] = useState<Link[]>(initialLinks);
  const supabase = createClient();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const persistLink = useCallback(
    async (id: string, updates: Partial<Link>) => {
      const { error } = await supabase
        .from('links_links')
        .update(updates)
        .eq('id', id);
      if (!error) {
        setLinks((prev) =>
          prev.map((l) => (l.id === id ? { ...l, ...updates } : l))
        );
      }
    },
    [supabase]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = links.findIndex((l) => l.id === active.id);
      const newIndex = links.findIndex((l) => l.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const newOrder = arrayMove(links, oldIndex, newIndex);
      setLinks(newOrder);
      const updates = newOrder.map((link, i) =>
        supabase.from('links_links').update({ sort_order: i }).eq('id', link.id)
      );
      await Promise.all(updates);
    },
    [links, supabase]
  );

  const addLink = useCallback(async () => {
    const maxOrder = links.length === 0 ? 0 : Math.max(...links.map((l) => l.sort_order), 0) + 1;
    const { data, error } = await supabase
      .from('links_links')
      .insert({
        page_id: pageId,
        label: 'Nouveau lien',
        url: 'https://',
        sort_order: maxOrder,
      })
      .select()
      .single();
    if (!error && data) setLinks((prev) => [...prev, data as Link]);
  }, [links, pageId, supabase]);

  const deleteLink = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from('links_links')
        .delete()
        .eq('id', id);
      if (!error) setLinks((prev) => prev.filter((l) => l.id !== id));
    },
    [supabase]
  );

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900">Liens</h2>
        <button
          type="button"
          onClick={addLink}
          className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          Ajouter un lien
        </button>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={links.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {links.map((link) => (
              <LinkRow
                key={link.id}
                link={link}
                clickCount={clickCounts[link.id] ?? 0}
                onUpdate={(updates) => persistLink(link.id, updates)}
                onDelete={() => deleteLink(link.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {links.length === 0 && (
        <p className="text-sm text-zinc-500">Aucun lien. Cliquez sur &quot;Ajouter un lien&quot;.</p>
      )}
    </section>
  );
}
