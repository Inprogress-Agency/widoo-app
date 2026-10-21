/**
 * Text for the users of the wiki page Politique-de-confidentialite, between its two
 * separators: draft of 2026-09-28 (D-063), revised on 2026-10-20 (D-107), to be reviewed by a
 * lawyer before the stores; the passages in square brackets are still to complete in the wiki.
 * Changed in the wiki first, then here, with a new version in `../documents.ts`. Links to other
 * wiki pages are kept as their text.
 */
export const privacyFr = `
## Politique de confidentialité de Widoo

Mise à jour le [date de publication].

### L'essentiel

- Nous gardons votre profil, vos favoris, vos sorties et vos parcours.
- Votre position sert sur le téléphone ; elle n'est jamais enregistrée sur nos serveurs.
- La mesure d'audience n'a lieu qu'avec votre accord.

### 1. Qui est responsable de vos données

Inprogress Agency, société par actions simplifiée, 14 avenue Georges Pompidou, 93360 Neuilly-Plaisance, RCS Bobigny 908 744 444, édite Widoo et décide de l'usage de vos données.

Pour toute question sur vos données ou pour exercer vos droits : contact@widooapp.com, ou « Nous écrire » dans l'app (sujet « Données »).

### 2. Les données que nous utilisons

| Données | Pourquoi | Sur quelle base | Combien de temps |
|---|---|---|---|
| Compte : adresse e-mail, prénom ou pseudo, photo, identifiant de connexion (Apple, Google ou e-mail) | créer votre compte, vous connecter, vous écrire au sujet de votre compte | l'exécution des conditions d'utilisation | tant que le compte existe, puis 30 jours |
| Profil public : bio, quartier, anecdotes, parcours à la une, badge « Créateur certifié » | afficher votre profil de créateur | l'exécution des conditions d'utilisation | tant que le compte existe ; vous pouvez masquer votre profil |
| Favoris, sorties programmées et passées, préférences (langue, types de notifications) | faire fonctionner ces fonctions et vous envoyer les rappels choisis | l'exécution des conditions d'utilisation | tant que le compte existe, puis 30 jours |
| Parcours, photos, avis (note et commentaire), vérifications et signalements | les publier, les relire, informer les autres utilisateurs, garder un contenu fiable | l'exécution des conditions d'utilisation ; notre intérêt légitime à assurer la qualité et la sécurité du contenu | parcours publiés : en ligne après la suppression du compte, sans lien vers vous ; avis : [supprimés ou anonymisés avec le compte, à trancher] ; vérifications : supprimées avec le compte, sinon anonymisées après 24 mois ; journal de modération : [durée] |
| Position du téléphone | centrer la carte, trier les parcours par distance, vous guider pendant une sortie | votre autorisation, donnée au téléphone | jamais enregistrée sur nos serveurs : la recherche ne reçoit que la zone de carte affichée |
| Jeton de notification | vous envoyer les notifications que vous avez choisies | votre autorisation, donnée au téléphone | jusqu'à ce que vous coupiez les notifications ou supprimiez le compte |
| Abonnement : identifiant d'achat du store, formule, état, dates | vous donner accès à Widoo Premium | l'exécution des conditions d'utilisation | pendant l'abonnement, puis 3 ans ; nous ne recevons aucune donnée bancaire |
| Mesure d'audience : pages vues et actions dans l'app, identifiant aléatoire, modèle et système du téléphone, sans adresse IP conservée | comprendre l'usage de l'app pour l'améliorer | votre consentement, retirable à tout moment | 12 mois |
| Rapports de plantage : données techniques de l'erreur, sans information sur vous et sans adresse IP conservée | corriger les erreurs | notre intérêt légitime à faire fonctionner l'app | 90 jours |
| Messages envoyés au support : adresse de réponse, sujet, message, version de l'app, modèle du téléphone | vous répondre | notre intérêt légitime à vous aider ; l'exécution des conditions d'utilisation | 3 ans après le dernier échange |
| Changement d'adresse e-mail en attente | confirmer la nouvelle adresse | l'exécution des conditions d'utilisation | jusqu'à la confirmation, l'annulation ou l'expiration du lien |

Le fichier créé par « Télécharger mes données » est préparé à votre demande et n'est pas conservé sur nos serveurs.

### 3. Qui reçoit vos données

- L'équipe Widoo, pour ce dont elle a besoin : support, relecture des parcours, sécurité.
- Les autres utilisateurs voient ce que vous publiez : votre profil s'il est public, vos parcours, et vos avis avec votre prénom ou pseudo, votre initiale, la date et la note.
- Nos prestataires, qui traitent les données pour notre compte et selon nos instructions :
  - Google Cloud : hébergement de nos serveurs, de la base de données et des photos, à Paris ;
  - Firebase (Google) : connexion à votre compte et envoi des notifications [lieu de traitement à vérifier] ;
  - Expo : envoi des notifications et mises à jour de l'app [lieu de traitement à vérifier] ;
  - Mapbox : affichage des cartes et recherche de lieux ; Mapbox reçoit l'adresse IP du téléphone et la zone de carte affichée [lieu de traitement à vérifier] ;
  - PostHog, dans l'Union européenne : mesure d'audience, seulement avec votre accord ;
  - Sentry, dans l'Union européenne : rapports de plantage ;
  - RevenueCat : suivi des abonnements achetés dans les stores [lieu de traitement à vérifier] ;
  - Google Cloud Vertex AI (Union européenne) : traduction des parcours publiés et des avis ; il reçoit le texte, pas votre profil ;
  - Brevo (France, Union européenne) : envoi des e-mails de connexion, de confirmation d'adresse et des réponses du support ;
  - Vercel (États-Unis) : hébergement du site widooapp.com ; il reçoit l'adresse IP et les données techniques de connexion des visiteurs du site, qui ne dépose aucun cookie.
- Apple et Google, quand vous vous connectez avec leur compte ou achetez Premium par leur store : ils agissent alors selon leurs propres politiques.
- Google Maps, quand vous touchez « Itinéraire » pendant une sortie : l'adresse de l'étape suivante lui est transmise et Google Maps s'ouvre, selon la politique de Google.
- Les autorités, si la loi nous y oblige.

Nous ne vendons pas vos données et nous ne les utilisons pas pour de la publicité.

### 4. Données traitées hors de l'Union européenne

Certains de nos prestataires sont établis aux États-Unis. Quand vos données y sont traitées, le transfert est encadré par la décision d'adéquation de la Commission européenne pour les entreprises certifiées au Data Privacy Framework ou par les clauses contractuelles types de la Commission européenne [à vérifier pour chaque prestataire].

### 5. Vos droits

Vous pouvez à tout moment :

- accéder à vos données et les récupérer dans un fichier : Réglages › Confidentialité › Télécharger mes données ;
- les corriger : Modifier le profil, Réglages › E-mail ;
- les effacer : Réglages › Supprimer mon compte ;
- retirer votre consentement à la mesure d'audience : Réglages › Confidentialité ; à la position et aux notifications : réglages du téléphone ;
- vous opposer à un traitement fondé sur notre intérêt légitime, ou en demander la limitation ;
- définir des directives sur le sort de vos données après votre décès.

Pour tout le reste, écrivez à contact@widooapp.com. Nous répondons dans un délai d'un mois. En cas de doute sur votre identité, nous pouvons vous demander de le confirmer depuis l'adresse de votre compte.

Si vous estimez que vos droits ne sont pas respectés, vous pouvez adresser une réclamation à la CNIL (cnil.fr, 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07).

### 6. Sécurité

Les échanges entre l'app et nos serveurs sont chiffrés. L'accès aux données est réservé aux personnes qui en ont besoin, et chaque utilisateur ne peut modifier que ses propres contenus. Widoo ne stocke aucun mot de passe : la connexion passe par Apple, Google ou un lien envoyé par e-mail. Une photo publiée peut être supprimée immédiatement à votre demande.

### 7. Âge minimum

Widoo est réservé aux personnes de 16 ans et plus. Si nous apprenons qu'un compte a été créé par une personne plus jeune, nous le supprimons.

### 8. Traceurs

L'app n'utilise ni cookie publicitaire ni identifiant publicitaire du téléphone. La mesure d'audience ne démarre qu'après votre accord, demandé au premier lancement ; votre choix est gardé sur le téléphone et se change dans Réglages › Confidentialité. Tant que vous n'avez pas choisi, seuls les rapports de plantage sont envoyés.

### 9. Changements de cette politique

Nous vous prévenons dans l'app de tout changement important de cette politique avant son entrée en vigueur.
`;
