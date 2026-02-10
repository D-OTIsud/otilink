'use client';

import { useState } from 'react';

type EditorRow = { user_id: string; email: string | null };

export function EditorsManager({
  initialEditors,
  addAction,
  removeAction,
}: {
  initialEditors: EditorRow[];
  addAction: (formData: FormData) => Promise<void>;
  removeAction: (formData: FormData) => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [editors] = useState(initialEditors);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-otilink-sage/35 bg-white p-5">
        <h1 className="text-xl font-extrabold text-otilink-charcoal">Droits · Éditeurs de l’accueil</h1>
        <p className="mt-1 text-sm text-otilink-graphite">
          Ces personnes peuvent modifier la page d’accueil (/) et ses liens.
        </p>
      </div>

      <section className="rounded-2xl border border-otilink-sage/35 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-extrabold text-otilink-charcoal">Ajouter un éditeur</h2>
        <form
          action={addAction}
          className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <label className="mb-1 block text-sm font-extrabold text-otilink-graphite">
              Email (doit exister dans Auth)
            </label>
            <input
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prenom.nom@otisud.com"
              className="w-full rounded-xl border border-otilink-sage/45 bg-white px-3 py-2 text-otilink-charcoal focus:border-otilink-teal focus:outline-none focus:ring-2 focus:ring-otilink-teal/20"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-otilink-teal px-4 py-2 text-sm font-extrabold text-white hover:bg-otilink-teal-700"
          >
            Ajouter
          </button>
        </form>
        <p className="mt-2 text-xs text-otilink-graphite/70">
          Note : l’utilisateur doit s’être connecté au moins une fois (pour exister dans Auth), ou être déjà présent dans Auth.
        </p>
      </section>

      <section className="rounded-2xl border border-otilink-sage/35 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-extrabold text-otilink-charcoal">Éditeurs actuels</h2>
        {editors.length === 0 ? (
          <p className="mt-2 text-sm text-otilink-graphite">Aucun éditeur défini.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-otilink-graphite">
                <tr>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">User ID</th>
                  <th className="py-2 pr-4"></th>
                </tr>
              </thead>
              <tbody className="text-otilink-charcoal">
                {editors.map((e) => (
                  <tr key={e.user_id} className="border-t border-otilink-sage/25">
                    <td className="py-2 pr-4">{e.email ?? '—'}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{e.user_id}</td>
                    <td className="py-2 pr-0 text-right">
                      <form action={removeAction}>
                        <input type="hidden" name="user_id" value={e.user_id} />
                        <button
                          type="submit"
                          className="rounded-xl border border-otilink-sage/45 bg-white px-3 py-1.5 text-xs font-extrabold text-otilink-volcan hover:bg-otilink-offwhite"
                        >
                          Retirer
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

