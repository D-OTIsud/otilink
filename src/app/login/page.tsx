import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LoginButton } from './LoginButton';

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-100 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-center text-xl font-semibold text-zinc-900">
          OTISUD Links
        </h1>
        <p className="mb-6 text-center text-sm text-zinc-600">
          Connectez-vous pour gérer votre page de liens.
        </p>
        <LoginButton />
      </div>
      <footer className="mt-6 text-center text-xs text-zinc-500">
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
