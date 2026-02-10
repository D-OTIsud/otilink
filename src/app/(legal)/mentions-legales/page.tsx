import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mentions légales – OTISUD Links',
};

export default function MentionsLegales() {
  return (
    <>
      <h1>Mentions légales</h1>

      <h2>Éditeur du site</h2>
      <p>
        <strong>Office de Tourisme Intercommunal du Sud de La Réunion (OTI du Sud)</strong><br />
        {/* TODO: compléter avec les informations réelles */}
        Adresse : [Adresse du siège]<br />
        Téléphone : [Numéro de téléphone]<br />
        Email : [Email de contact]<br />
        Directeur de publication : [Nom du directeur]
      </p>

      <h2>Hébergement</h2>
      <p>
        Ce site est hébergé par :<br />
        {/* TODO: compléter avec les informations de l'hébergeur Coolify / VPS */}
        [Nom de l&apos;hébergeur]<br />
        [Adresse de l&apos;hébergeur]
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        L&apos;ensemble du contenu de ce site (textes, images, logos) est la propriété de l&apos;OTI du Sud
        ou de ses partenaires. Toute reproduction sans autorisation préalable est interdite.
      </p>

      <h2>Responsabilité</h2>
      <p>
        L&apos;OTI du Sud s&apos;efforce de fournir des informations exactes et à jour. Toutefois,
        il ne peut garantir l&apos;exactitude, la complétude ou l&apos;actualité des informations diffusées.
        Les liens vers des sites externes sont fournis à titre informatif et n&apos;engagent pas la
        responsabilité de l&apos;éditeur.
      </p>
    </>
  );
}
