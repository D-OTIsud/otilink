'use client';

import { useState } from 'react';
import { BrandMark } from '@/components/BrandMark';

export function DashboardShell({
  currentPublicPath,
  children,
}: {
  currentPublicPath: string;
  children: React.ReactNode;
}) {
  const [logoOk, setLogoOk] = useState(true);
  const baseUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL ?? 'https://links.otisud.re';

  return (
    <div className="min-h-screen otilink-backend-bg">
      <header className="relative overflow-hidden border-b border-otilink-sage/30 bg-otilink-teal text-white">
        <div className="absolute inset-0 opacity-25">
          <div className="absolute -left-24 -top-28 h-72 w-72 rounded-full bg-otilink-curry blur-3xl" />
          <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-otilink-sage blur-3xl" />
        </div>

        <div className="relative mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
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
              <div className="text-sm font-extrabold tracking-wide">OTISUD</div>
              <div className="text-xs text-white/80">Links · Backoffice</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`${baseUrl}${currentPublicPath}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/20 hover:bg-white/15"
            >
              Voir public
            </a>
            <form action="/logout" method="post">
              <button
                type="submit"
                className="rounded-xl bg-white px-3 py-2 text-sm font-extrabold text-otilink-teal ring-1 ring-white/40 hover:bg-otilink-offwhite"
              >
                Déconnexion
              </button>
            </form>
          </div>
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

      <main className="mx-auto max-w-3xl px-4 py-8 text-otilink-charcoal">{children}</main>
    </div>
  );
}
