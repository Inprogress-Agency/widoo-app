# Journal des décisions

Décisions durables d'architecture, de périmètre et de méthode. Une décision est inscrite ici avant d'être appliquée ; elle n'est jamais supprimée, seulement remplacée par une décision ultérieure qui la référence. Les spécifications détaillées vivent dans le wiki ; ce journal explique le pourquoi.

## D-001 — Base de données PostgreSQL + PostGIS, pas Firestore (2026-09-21)

Le cœur du produit est une recherche géographique combinée à des filtres multiples sur des données relationnelles (parcours → étapes → lieux → horaires). Firestore limite à une clause `array-contains-any` par requête, gère la géo par geohash et n'a pas de jointures. Postgres avec PostGIS répond nativement, et le modèle tiendra l'extension à plusieurs villes et aux créateurs. Firebase reste utilisé pour l'authentification et les notifications.

## D-002 — API Fastify + TypeScript + Zod sur Cloud Run (2026-09-21)

Validation par schéma partagée entre l'app, l'admin et l'API via `packages/shared`. Cloud Run pour un service sans état, scale à zéro puis horizontal, en région Paris. Express aurait fonctionné mais n'apporte rien de plus.

## D-003 — Création de parcours par les utilisateurs dès le MVP, publication modérée (2026-09-21)

Décision d'Ilan. Pour contenir le risque de qualité : création libre et usage privé sans validation, publication publique soumise à modération humaine, cohérence calculée par le moteur d'orchestration plutôt que saisie. Les parcours de l'équipe utilisent le même éditeur.

## D-004 — Pas de navigation GPS ; Go ouvre Google Maps (2026-09-21)

Widoo met en avant des lieux et compose des moments cohérents ; il ne développe pas de guidage. Le bouton Go construit une URL Google Maps avec les étapes en points de passage, ou l'étape suivante seule au-delà de la limite de points.

## D-005 — Vérification communautaire des lieux dès le MVP (2026-09-21)

Modèle Waze : confirmations et signalements pondérés par lieu, statuts `verified` / `stale` / `flagged` / `closed`, alerte sur les parcours concernés, traitement par les modérateurs. Le lieu est l'objet vérifié, pas le parcours.

## D-006 — Consultation sans compte, compte au premier engagement (2026-09-21)

Aucune barrière avant la fiche parcours. Le compte est demandé au premier favori, programmation, création ou signalement, avec reprise de l'action après connexion. Aucune barrière payante au lancement ; les champs `plan`, `access`, `booking_provider` et `sponsored` existent dès le premier schéma pour éviter une migration.

## D-007 — Analytics et crash reporting dès v0.1 (2026-09-21)

PostHog (UE) et Sentry, avec consentement au premier lancement. Les hypothèses du MVP ne se valident pas sans mesure.

## D-008 — Méthode de travail : modes et harness (2026-09-21)

Reprise des modes DESIGN / MANAGER / CODE / ORCHESTRATOR / LIBRE / ITERATION de turbo-splash, avec la rigueur de 16scouting : CI bloquante, plafond de diff 400/500, template de PR, niveaux de risque dans SECURITY.md, ce journal. Le wiki est le cahier des charges ; Claude Design porte les maquettes ; la page `Ecrans` fait le lien.

## D-009 — Freemium dès le MVP, « consulter libre, agir limité » (2026-09-21)

Décision d'Ilan. Tout le catalogue reste consultable ; le gratuit est limité à 3 programmations par mois et 10 favoris ; Premium illimité avec accès aux parcours signature. Abonnement par achat intégré via RevenueCat. Aucune limite sur la consultation ni sur le nombre de fiches ouvertes, pour garder une mesure propre de l'intérêt du produit.

## D-010 — Accueil en deux vues et recommandation explicable (2026-09-21)

Carte et liste partagent recherche, filtres et résultats. Le classement par défaut est un score pondéré déterministe (proximité, qualité, fiabilité, fraîcheur, contexte, officiel) avec passe de diversité, poids en configuration ; pas d'apprentissage avant d'avoir des données d'usage.

## D-011 — Notation et vérification sur place (2026-09-21)

Note sur 5 obligatoire en fin de parcours réalisé, commentaire facultatif, une note par utilisateur et par parcours, pas d'avis sans sortie. Vérification des lieux proposée à chaque étape cochée du Go (poids fort) puis en fin de parcours, en plus de la vérification à distance depuis la fiche.

## D-012 — Profil public de créateur dans le MVP, communauté après (2026-09-21)

Page légère (avatar, prénom, parcours publiés, note moyenne), désactivable par l'utilisateur. Badges, abonnements et fil d'activité sont hors MVP mais prévus dans le modèle.

## D-013 — Accessibilité mobile : texte dynamique, contrastes, lecteur d'écran (2026-09-23)

Décision d'Ilan à la validation de la planche « Contrôle accessibilité » (ticket #79). Le texte suit le réglage système partout sans hauteur fixe ; les composants denses sont plafonnés à 1,3 dans le design system ; seuls la tooltip de la carte et le résumé de parcours changent de mise en page à partir de `fontScale >= 1.3` ; objectif de recette 150 % sans troncature d'un texte essentiel. Contrastes 4,5:1 texte et 3:1 composants, aucune information portée par la couleur seule. Chaque contrôle est libellé et son état annoncé. Règles détaillées : wiki Direction-Artistique, section Accessibilité ; rappel dans CLAUDE.md, mode CODE.
