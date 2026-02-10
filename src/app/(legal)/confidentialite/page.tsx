import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Politique de confidentialité – OTISUD Links',
};

export default function Confidentialite() {
  return (
    <>
      <h1>Politique de confidentialité</h1>
      <p><em>Dernière mise à jour : février 2026</em></p>

      <h2>Responsable du traitement</h2>
      <p>
        Office de Tourisme Intercommunal du Sud de La Réunion (OTI du Sud).<br />
        Email : [email de contact DPO/responsable]
      </p>

      <h2>Données collectées</h2>
      <p>Lors de votre utilisation du service OTISUD Links, nous collectons :</p>
      <ul>
        <li><strong>Données d&apos;authentification</strong> : adresse email, nom et photo de profil
          via votre compte Google (OAuth).</li>
        <li><strong>Données de profil</strong> : nom affiché, bio, slug, URL d&apos;avatar que vous
          renseignez.</li>
        <li><strong>Données de liens</strong> : les liens que vous créez (label, URL, icône).</li>
        <li><strong>Données de statistiques</strong> : lors d&apos;un clic sur un lien public, nous
          enregistrons uniquement des <strong>compteurs statistiques agrégés</strong> (par mois et
          par lien), ainsi qu&apos;un indicateur technique permettant d&apos;exclure les robots (bots) des
          statistiques. <strong>Aucun compte visiteur n&apos;est créé</strong> et nous ne collectons pas
          l&apos;identité des visiteurs.</li>
      </ul>

      <h2>Base légale et finalités</h2>
      <ul>
        <li><strong>Exécution du contrat</strong> : fournir le service de page de liens.</li>
        <li><strong>Intérêt légitime</strong> : statistiques anonymisées de clics pour améliorer
          le service.</li>
      </ul>

      <h2>Durée de conservation</h2>
      <p>
        Vos données sont conservées tant que votre compte est actif. Vous pouvez demander la
        suppression de votre compte et de toutes vos données à tout moment.
      </p>
      <p>
        Les statistiques de clics sont conservées sous forme <strong>agrégée</strong> (mensuelle) afin
        de permettre un suivi de tendance. Aucune donnée de clic « évènement par évènement » n&apos;est
        conservée pour les visiteurs.
      </p>

      <h2>Cookies</h2>
      <p>
        Ce site utilise uniquement des cookies strictement nécessaires au fonctionnement de
        l&apos;authentification (session Supabase). Aucun cookie de suivi publicitaire ou analytique
        n&apos;est déposé.
      </p>

      <h2>Vos droits (RGPD)</h2>
      <p>Conformément au RGPD, vous disposez des droits suivants :</p>
      <ul>
        <li>Droit d&apos;accès à vos données personnelles</li>
        <li>Droit de rectification</li>
        <li>Droit à l&apos;effacement (« droit à l&apos;oubli »)</li>
        <li>Droit à la portabilité des données</li>
        <li>Droit d&apos;opposition et de limitation du traitement</li>
      </ul>
      <p>
        Pour exercer ces droits, contactez-nous à : [email de contact].<br />
        Vous pouvez également introduire une réclamation auprès de la CNIL.
      </p>

      <h2>Sous-traitants</h2>
      <ul>
        <li><strong>Supabase</strong> (authentification et base de données) – données hébergées
          conformément à leur politique de confidentialité.</li>
        <li><strong>Google</strong> (fournisseur OAuth) – pour l&apos;authentification uniquement.</li>
      </ul>
    </>
  );
}
