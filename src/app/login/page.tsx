import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getStaffRowByEmail } from '@/lib/staff';
import { LoginButton } from './LoginButton';

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const email = user.email;
    if (!email) {
      // Logged in but no email claim (should be rare). Force logout path.
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-100 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
            <h1 className="mb-2 text-center text-xl font-semibold text-zinc-900">OTISUD Links</h1>
            <p className="mb-6 text-center text-sm text-zinc-600">
              Accès impossible (email manquant). Déconnectez-vous puis réessayez.
            </p>
            <form action="/logout" method="post">
              <button className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
                Se déconnecter
              </button>
            </form>
          </div>
        </div>
      );
    }

    const staffRow = await getStaffRowByEmail(email);
    if (staffRow) redirect('/dashboard');

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-100 px-4">
        <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
          <h1 className="mb-2 text-center text-xl font-semibold text-zinc-900">OTISUD Links</h1>
          <p className="mb-6 text-center text-sm text-zinc-600">
            Accès réservé au personnel OTISUD. Votre compte n’est pas autorisé.
          </p>
          <form action="/logout" method="post">
            <button className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
              Se déconnecter
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-100 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-center text-xl font-semibold text-zinc-900">
          OTISUD Links
        </h1>
        <p className="mb-6 text-center text-sm text-zinc-600">
          Connectez-vous pour gérer votre page de liens.
        </p>
        {searchParams?.no_access ? (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs text-amber-800">
            Accès réservé au personnel OTISUD. Si vous pensez qu’il s’agit d’une erreur, contactez
            l’administrateur.
          </p>
        ) : null}
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
