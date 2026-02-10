export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <a href="/" className="font-semibold text-zinc-900 hover:underline">OTISUD Links</a>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <article className="prose prose-zinc max-w-none">
          {children}
        </article>
      </main>
      <footer className="border-t border-zinc-200 bg-white py-4 text-center text-xs text-zinc-500">
        <a href="/mentions-legales" className="hover:underline">Mentions légales</a>
        {' · '}
        <a href="/confidentialite" className="hover:underline">Confidentialité</a>
        {' · '}
        <a href="/conditions" className="hover:underline">Conditions</a>
        {' · '}
        <a href="/contact" className="hover:underline">Contact</a>
      </footer>
    </div>
  );
}
