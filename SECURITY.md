# Politique de sécurité

Ce document explique comment signaler une vulnérabilité de Widoo, application mobile de parcours urbains, sans l'exposer publiquement.

## Périmètre

- l'application mobile Widoo ;
- son API ;
- son interface d'administration (modération).

Une faille d'un service tiers utilisé par Widoo (hébergement, authentification, cartographie) se signale à son éditeur.

## Signaler en privé

- **Par GitHub** : onglet **Security** du dépôt, puis **Report a vulnerability**. Le signalement n'est visible que des mainteneurs du dépôt.
- **À défaut**, contactez directement un mainteneur du dépôt et demandez un canal privé avant d'envoyer le moindre détail technique.

Décrivez si possible le composant touché, l'impact, les étapes de reproduction et la version ou le commit concerné. La suite des échanges se fait sur ce canal privé.

## Ne rien publier

N'ouvrez ni issue, ni pull request, ni discussion publiques sur une vulnérabilité. Aucun détail exploitable ne doit y apparaître : étapes de reproduction, preuve de concept, secret découvert, données obtenues. Si vous avez eu accès à des données personnelles, ne les partagez pas.
