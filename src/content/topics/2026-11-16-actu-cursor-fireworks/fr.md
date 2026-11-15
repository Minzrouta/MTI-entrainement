---
title: "L'extension Claude Code piégée venait d'une clé volée chez un fournisseur d'IA de Cursor"
date: "2026-11-16"
category: "Actu"
level: "Semaine 47"
summary: "Le 14 novembre, Cursor a expliqué l'origine de l'extension Claude Code piégée du 29 octobre : des attaquants ont volé des identifiants chez Fireworks AI, son fournisseur d'inférence, puis trouvé d'autres clés en clair dans d'anciennes traces d'agents de code. Plus : Fireworks AI révèle une deuxième intrusion, Apify change les jetons de ses clients, .NET 11 sort avec C# 15 et Gemini 4 Carbon arrive chez le grand public."
---

## La une

Il y a deux semaines, on parlait d'une version piégée de l'extension Claude Code distribuée par la boutique de Cursor. Cette semaine, on sait comment l'attaquant y est arrivé, et l'histoire commence ailleurs.

D'après BleepingComputer, qui s'appuie sur le rapport d'incident de Cursor publié le **14 novembre** :

- **Le point de départ est chez un fournisseur.** Des attaquants ont volé des identifiants chez **Fireworks AI**, une plateforme qui fait tourner des modèles d'IA pour d'autres entreprises, dont Cursor.
- **Une clé stockée chez Fireworks** donnait accès en lecture à un espace de stockage que Cursor utilisait pour partager des données avec ce fournisseur. Il contenait d'**anciennes traces d'agents de code**, surtout de 2025, d'utilisateurs qui n'avaient pas activé le mode confidentialité.
- **Dans ces traces, des clés en clair.** Certaines contenaient des identifiants d'API non masqués, qui ouvraient l'accès à d'autres systèmes de Cursor.
- **Le 29 octobre**, avec l'un de ces identifiants, l'attaquant a déposé des copies malveillantes de l'extension Claude Code (versions **2.1.312 et 2.1.313**, alors que la 2.1.312 était jusque-là donnée comme saine) dans le cache qui sert la boutique d'extensions de Cursor. Elles sont restées en ligne **environ 11 heures**. Selon Cursor, l'extension officielle d'Anthropic et Open VSX n'ont pas été compromis.
- **Ce qui a fuité aussi** : des dépôts de code archivés hors production, des échanges avec le support et les identifiants que des clients y avaient collés, des métriques d'usage, des coordonnées et des résumés de conversations d'agents. Cursor parle de **moins de 0,05 %** des utilisateurs dont les traces ont été exposées et de **moins de 0,01 %** des clients dont des identifiants d'API ont été compromis. **Jusqu'à 5 000 utilisateurs** ont pu recevoir l'extension piégée.
- **Réaction** : Cursor a sorti tout son trafic d'inférence de chez Fireworks, révoqué et changé les identifiants exposés, reconstruit sa boutique d'extensions et redéployé sa production.

**Pourquoi c'est notable.** Aucune faille de code n'a été nécessaire. Il a suffi d'une clé chez un partenaire, puis de clés laissées en clair dans des journaux conservés depuis un an. Ce que vous tapez ou collez dans un agent de code (un `.env`, un jeton, une sortie de commande) peut finir dans des traces stockées, partagées avec un fournisseur, et lues par quelqu'un d'autre des mois plus tard.

> 🎤 **En entretien** : si on vous demande « quels risques voyez-vous avec les assistants de code IA ? », vous pouvez répondre : « Le code généré n'est pas le seul risque, il y a aussi les données qu'on leur donne. Chez Cursor, des clés collées dans des conversations d'agents se sont retrouvées dans des traces partagées avec un fournisseur, et un attaquant passé par ce fournisseur s'en est servi pour publier une extension piégée. Donc je ne colle jamais de secret dans un prompt, j'active les réglages de confidentialité, et je traite chaque clé exposée comme à changer. » Vous montrez que vous suivez la donnée de bout en bout, pas seulement le code.

## Aussi cette semaine

| Quoi | Qui | Pourquoi c'est notable |
|---|---|---|
| **Deuxième intrusion chez Fireworks AI** | Fireworks AI | Révélée le **10 novembre**. Un fournisseur cloud qui héberge ses machines de recherche a été piraté le **23 octobre**, et l'attaquant a atteint les machines de développement de Fireworks le 24. Métadonnées, facturation, et pour certains clients des jeux de données et des poids de modèles incomplets. Une première fuite, début octobre, touchait déjà des variables d'environnement |
| **Apify change les jetons de ses clients** | Apify (plateforme de scraping) | Intrusion les **9 et 10 novembre**, détectée le 10. Identifiants internes invalidés, sessions réinitialisées, connexions OAuth (dont GitHub) révoquées par précaution. Jetons d'API et mots de passe de proxy des clients touchés changés, et demande de réinitialiser la double authentification. La porte d'entrée n'est pas publiée |
| **.NET 11 et C# 15** | Microsoft | Sortis le **10 novembre** à la .NET Conf 2026. C# 15 apporte les **types union**. Version à support standard (deux ans), .NET 10 reste la version à support long. Selon la presse, .NET 8 et 9 arrivent en fin de support le même jour |
| **Gemini 4 Carbon pour le grand public** | Google | Déploiement annoncé à partir du **10 novembre** dans l'API Gemini, AI Studio et l'application, après deux semaines réservées à des équipes de cybersécurité. Les noms (Argon, Carbon) varient selon les sources et les performances sont des chiffres de Google |

## Pourquoi ça vous concerne

- **Ne collez pas de secrets dans un agent.** Remplacez une clé par `XXX` avant de partager une erreur ou un fichier de configuration. Ce que l'agent voit peut être stocké, partagé et lu plus tard.
- **Lisez les réglages de confidentialité de vos outils.** Mode confidentialité, conservation des données, partage avec des sous-traitants : c'est souvent désactivé par défaut.
- **Vos fournisseurs ont des fournisseurs.** Cursor dépendait de Fireworks, qui dépendait d'un hébergeur cloud. Pour un projet de groupe, savoir lister les services tiers et ce qu'ils voient est déjà une bonne réponse d'architecture.
- **Changer une clé, c'est le réflexe.** Dès qu'un secret a pu être vu (dans un log, un prompt, un ticket de support), on le révoque. Apify et Cursor ont fait exactement ça.
- **Mettez à jour vos projets .NET.** Si un projet d'école tourne encore sur .NET 8 ou 9, il ne reçoit plus de correctifs. .NET 10 est le choix prudent, .NET 11 si vous voulez C# 15.

## En entretien

**« Qu'est-ce qu'une attaque par la chaîne d'approvisionnement ? »**

L'attaquant ne vise pas directement la cible, il passe par quelqu'un en qui elle a confiance : un paquet, une extension, un fournisseur. Chez Cursor, il est passé par Fireworks AI pour obtenir des clés, puis par la boutique d'extensions pour toucher les utilisateurs.

**« Comment éviter que des secrets se retrouvent dans des logs ? »**

On masque les secrets avant de journaliser (filtres sur les en-têtes `Authorization`, les champs `password`, les formats de clés connus), on limite la durée de conservation des journaux, et on scanne les logs et les dépôts avec un outil comme gitleaks. Et on ne donne jamais un secret à un outil qui n'en a pas besoin.

**« C'est quoi un type union en C# 15 ? »**

Un type dont la valeur est exactement l'un de plusieurs types listés, par exemple un résultat qui est soit une valeur, soit une erreur. Le compilateur peut vérifier qu'on traite tous les cas dans un `switch`, comme avec les unions de TypeScript ou les enums de Rust.

## Pour aller plus loin

- [Cursor confirme que l'extension Claude Code piégée vient d'une intrusion (BleepingComputer)](https://www.bleepingcomputer.com/news/security/cursor-confirms-security-breach-led-to-malicious-claude-code-extension/)
- [Rapport d'incident de Cursor (Cursor)](https://cursor.com/blog/security-incident-update)
- [Consignes de Cursor sur l'extension Claude Code (Cursor)](https://cursor.com/blog/security-notice-claude-code-extension)
- [Fireworks AI révèle une nouvelle intrusion (BleepingComputer)](https://www.bleepingcomputer.com/news/security/fireworks-ai-discloses-new-breach-after-cloud-provider-hack/)
- [Apify change les jetons d'API après une intrusion (BleepingComputer)](https://www.bleepingcomputer.com/news/security/apify-rotates-api-tokens-prompts-2fa-resets-after-breach/)
- [Annonce de .NET 11 (blog .NET)](https://devblogs.microsoft.com/dotnet/?p=61205)
- [.NET Conf 2026 (Microsoft)](https://dotnet.microsoft.com/en-us/conf)
- [Google déploie Gemini 4 Carbon pour le grand public (Let's Data Science)](https://letsdatascience.com/news/google-rolls-out-gemini-4-carbon-to-general-public-9b41bcb4)
