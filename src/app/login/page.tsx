import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getStaffRowByEmail } from '@/lib/staff';
import { BrandMark } from '@/components/BrandMark';
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
        <div className="flex min-h-screen flex-col items-center justify-center otilink-backend-bg px-4">
          <div className="w-full max-w-sm rounded-3xl border border-otilink-sage/35 bg-white p-8 shadow-sm">
            <div className="mb-4 flex items-center justify-center">
              <BrandMark className="h-14 w-14" />
            </div>
            <h1 className="mb-2 text-center text-2xl font-extrabold text-otilink-charcoal">
              OTISUD Links
            </h1>
            <p className="mb-6 text-center text-sm text-zinc-600">
              Accès impossible (email manquant). Déconnectez-vous puis réessayez.
            </p>
            <form action="/logout" method="post">
              <button className="w-full rounded-xl bg-otilink-teal px-4 py-2 text-sm font-extrabold text-white hover:bg-otilink-teal-700">
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
      <div className="flex min-h-screen flex-col items-center justify-center otilink-backend-bg px-4">
        <div className="w-full max-w-sm rounded-3xl border border-otilink-sage/35 bg-white p-8 shadow-sm">
          <div className="mb-4 flex items-center justify-center">
            <BrandMark className="h-14 w-14" />
          </div>
          <h1 className="mb-2 text-center text-2xl font-extrabold text-otilink-charcoal">OTISUD Links</h1>
          <p className="mb-6 text-center text-sm text-zinc-600">
            Accès réservé au personnel OTISUD. Votre compte n’est pas autorisé.
          </p>
          <form action="/logout" method="post">
            <button className="w-full rounded-xl bg-otilink-teal px-4 py-2 text-sm font-extrabold text-white hover:bg-otilink-teal-700">
              Se déconnecter
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center otilink-backend-bg px-4">
      <div className="w-full max-w-sm rounded-3xl border border-otilink-sage/35 bg-white p-8 shadow-sm">
        <div className="mb-4 flex items-center justify-center">
          <BrandMark className="h-14 w-14" />
        </div>
        <h1 className="mb-2 text-center text-2xl font-extrabold text-otilink-charcoal">OTISUD Links</h1>
        <p className="mb-6 text-center text-sm text-zinc-600">
          Connectez-vous pour gérer votre page de liens.
        </p>
        {searchParams?.no_access ? (
          <p className="mb-4 rounded-xl border border-otilink-curry/40 bg-white px-3 py-2 text-center text-xs font-semibold text-otilink-graphite">
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
