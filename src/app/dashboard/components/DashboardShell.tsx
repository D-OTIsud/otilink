'use client';

import { useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { BrandMark } from '@/components/BrandMark';

export function DashboardShell({
  userEmail,
  isAdmin,
  isHomepageEditor,
  children,
}: {
  userEmail: string;
  isAdmin: boolean;
  isHomepageEditor: boolean;
  children: React.ReactNode;
}) {
  const [logoOk, setLogoOk] = useState(true);
  const pathname = usePathname();

  const nav = useMemo(() => {
    const items: Array<{ href: string; label: string }> = [
      { href: '/dashboard/pages', label: 'Pages' },
      { href: '/dashboard/profile', label: 'Profil' },
    ];
    if (isHomepageEditor) items.push({ href: '/dashboard/homepage', label: 'Accueil (/)'} );
    if (isAdmin) {
      items.push({ href: '/dashboard/admin/editors', label: 'Droits' });
      items.push({ href: '/dashboard/admin/templates', label: 'Templates' });
    }
    return items;
  }, [isAdmin, isHomepageEditor]);

  return (
    <div className="min-h-screen bg-otilink-offwhite">
      <header className="relative border-b border-otilink-sage/35 bg-otilink-teal text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
              {logoOk ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src="/brand/otisud-logo.png"
                  alt="OTISUD"
                  className="h-9 w-9 rounded-xl object-contain"
                  onError={() => setLogoOk(false)}
                />
              ) : (
                <BrandMark className="h-9 w-9" />
              )}
            </div>
            <div className="leading-tight">
              <div className="text-sm font-extrabold tracking-wide">OTISUD Links</div>
              <div className="text-xs text-white/80">{userEmail}</div>
            </div>
          </div>

          <form action="/logout" method="post">
            <button
              type="submit"
              className="rounded-xl bg-white px-3 py-2 text-sm font-extrabold text-otilink-teal ring-1 ring-white/40 hover:bg-otilink-offwhite"
            >
              Déconnexion
            </button>
          </form>
        </div>

        {/* subtle wave */}
        <svg
          className="absolute -bottom-1 left-0 h-6 w-full text-otilink-offwhite"
          viewBox="0 0 1440 60"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M0,32 C220,52 420,52 640,36 C860,20 1040,4 1240,10 C1340,13 1395,22 1440,26 L1440,60 L0,60 Z"
          />
        </svg>
      </header>

      <div className="mx-auto flex max-w-5xl gap-4 px-4 py-6">
        <aside className="hidden w-60 shrink-0 lg:block">
          <nav className="rounded-2xl border border-otilink-sage/35 bg-white p-3">
            <div className="px-3 pb-2 text-xs font-extrabold uppercase tracking-wide text-otilink-graphite">
              Navigation
            </div>
            <div className="space-y-1">
              {nav.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={
                      active
                        ? 'block rounded-xl bg-otilink-teal px-3 py-2 text-sm font-extrabold text-white'
                        : 'block rounded-xl px-3 py-2 text-sm font-extrabold text-otilink-graphite hover:bg-otilink-offwhite'
                    }
                  >
                    {item.label}
                  </a>
                );
              })}
            </div>
          </nav>
        </aside>

        <main className="min-w-0 flex-1 text-otilink-charcoal">{children}</main>
      </div>
    </div>
  );
}
