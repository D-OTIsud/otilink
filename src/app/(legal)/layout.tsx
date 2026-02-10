import { BrandMark } from '@/components/BrandMark';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen otilink-backend-bg">
      <header className="relative overflow-hidden border-b border-otilink-sage/30 bg-otilink-teal text-white">
        <div className="relative mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
            <BrandMark className="h-9 w-9" />
          </div>
          <a href="/" className="text-sm font-extrabold tracking-wide text-white hover:underline">
            OTISUD Links
          </a>
        </div>
        <svg
          className="absolute -bottom-1 left-0 h-10 w-full text-otilink-offwhite"
          viewBox="0 0 1440 80"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M0,48 C160,80 320,80 480,56 C640,32 800,0 960,8 C1120,16 1280,56 1440,48 L1440,80 L0,80 Z"
          />
        </svg>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <article className="prose prose-zinc max-w-none rounded-2xl border border-otilink-sage/35 bg-white p-6 shadow-sm">
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
