import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Conditions d\'utilisation – OTISUD Links',
};

export default function Conditions() {
  return (
    <>
      <h1>Conditions d&apos;utilisation</h1>
      <p><em>Dernière mise à jour : février 2026</em></p>

      <h2>Objet</h2>
      <p>
        Le service OTISUD Links permet aux utilisateurs autorisés de l&apos;OTI du Sud de créer
        une page personnelle regroupant des liens vers leurs réseaux sociaux et sites web.
      </p>

      <h2>Accès au service</h2>
      <p>
        L&apos;accès est réservé aux personnes disposant d&apos;un compte Google et autorisées par
        l&apos;OTI du Sud. L&apos;inscription se fait via l&apos;authentification Google OAuth.
      </p>

      <h2>Responsabilité de l&apos;utilisateur</h2>
      <ul>
        <li>L&apos;utilisateur est responsable du contenu des liens qu&apos;il publie.</li>
        <li>Il est interdit de publier des liens vers des contenus illicites, diffamatoires,
          pornographiques, incitant à la haine ou à la violence.</li>
        <li>L&apos;utilisateur s&apos;engage à ne pas utiliser le service à des fins de spam
          ou de phishing.</li>
      </ul>

      <h2>Propriété intellectuelle</h2>
      <p>
        Le service, son design et son code sont la propriété de l&apos;OTI du Sud.
        Les contenus publiés par les utilisateurs restent leur propriété.
      </p>

      <h2>Modération</h2>
      <p>
        L&apos;OTI du Sud se réserve le droit de supprimer tout contenu ou de suspendre tout
        compte en cas de non-respect des présentes conditions.
      </p>

      <h2>Limitation de responsabilité</h2>
      <p>
        L&apos;OTI du Sud ne peut être tenu responsable des dommages directs ou indirects
        résultant de l&apos;utilisation du service, notamment en cas d&apos;indisponibilité
        temporaire ou de perte de données.
      </p>

      <h2>Modification des conditions</h2>
      <p>
        Ces conditions peuvent être modifiées à tout moment. Les utilisateurs seront informés
        de toute modification substantielle.
      </p>
    </>
  );
}
