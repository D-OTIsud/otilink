import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact – OTISUD Links',
};

export default function Contact() {
  return (
    <>
      <h1>Contact</h1>

      <h2>Nous contacter</h2>
      <p>
        Pour toute question relative au service OTISUD Links, vous pouvez nous joindre :
      </p>
      <ul>
        <li><strong>Email</strong> : [adresse email de contact]</li>
        <li><strong>Téléphone</strong> : [numéro de téléphone]</li>
        <li>
          <strong>Adresse postale</strong> :<br />
          Office de Tourisme Intercommunal du Sud<br />
          [Adresse complète]<br />
          La Réunion, France
        </li>
      </ul>

      <h2>Réseaux sociaux</h2>
      <ul>
        <li><a href="https://www.facebook.com/otidusud" target="_blank" rel="noopener noreferrer">Facebook</a></li>
        <li><a href="https://www.instagram.com/otidusud" target="_blank" rel="noopener noreferrer">Instagram</a></li>
        <li><a href="https://www.youtube.com/@otidusud" target="_blank" rel="noopener noreferrer">YouTube</a></li>
      </ul>

      <h2>Exercice de vos droits RGPD</h2>
      <p>
        Pour toute demande relative à vos données personnelles (accès, rectification,
        suppression, portabilité), envoyez un email à : [email DPO/responsable].
      </p>
    </>
  );
}
