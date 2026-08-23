---
title: "GitHub à genoux pendant 8 heures : les agents IA ont doublé le trafic, l'infra n'a pas suivi"
date: "2026-08-24"
category: "Actu"
level: "Semaine 35"
summary: "Le 17 août, GitHub a passé 7h47 en panne mondiale : pas un bug, un pur manque de capacité face à un trafic doublé par les agents IA. Plus : Nvidia finance jusqu'à 105 Md$ de datacenter pour OpenAI, 421 CVE au Patch Tuesday, Claude conçoit des protéines validées en labo."
---

## La une

Le **dimanche 17 août**, GitHub est tombé. De **13h28 à 21h15 UTC**, soit **7 heures et 47 minutes**, github.com, l'authentification, les API, les Issues, les Pull Requests, **GitHub Actions** et **Copilot** ont été dégradés dans le monde entier. Au pic, environ **20 % des requêtes web et API** échouaient, et jusqu'à **50 % des téléchargements d'archives**.

Le postmortem, publié cette semaine sur le blog de GitHub, tient en une phrase qui change tout : la panne n'a été causée **ni par une modification de code ni par un changement de configuration**. Un composant d'infrastructure critique du datacenter Central US n'a simplement **pas suivi un pic de trafic record**, et la pression de capacité s'est propagée en cascade, en commençant par l'authentification. La presse spécialisée pointe les proxys sidecar (Istio) qui relaient la communication entre services : saturés, mais invisibles pour l'auto-scaling, qui ne comptait pas leur capacité.

D'où vient ce trafic record ? Des chiffres du postmortem eux-mêmes : les commits mensuels sont passés de **1,4 milliard en avril à 2,9 milliards en août 2026**. Un doublement en quatre mois, largement attribué aux **agents IA** qui committent, ouvrent des PR (environ 130 millions fusionnées par mois) et déclenchent des runs Actions (plus de 115 millions) à un rythme qu'aucune croissance humaine n'explique. L'ironie de 2026 résumée en une panne : l'IA qui écrit le code a fait plier la plateforme qui l'héberge.

Détail technique savoureux : la récupération a été **ralentie par les clients eux-mêmes**. Les boucles de retry des services Copilot ont augmenté le trafic pendant la reprise, un classique de la « retry storm » qu'il a fallu maîtriser avant de pouvoir rouvrir en sécurité. GitHub annonce en réponse plus de **3 millions de cœurs CPU** et **120 pétaoctets de stockage** déployés, une migration vers Azure passée de **12 % de la charge en mai à 58 %**, et des **budgets de retry** cohérents entre services.

> 🎤 **En entretien** : le réflexe qui vous distingue, c'est de savoir que **toutes les pannes ne sont pas des bugs**. Ici, zéro déploiement fautif : de la capacité, un auto-scaler aveugle à un composant, et des retries qui aggravent. Si vous savez placer « backoff exponentiel avec jitter et budget de retry » en expliquant pourquoi les clients Copilot ont ralenti la récupération de GitHub, vous parlez comme quelqu'un qui a déjà lu un postmortem.

## Aussi cette semaine

| Quoi | Qui | Pourquoi c'est notable |
|---|---|---|
| **Jusqu'à 105 Md$ de financement** pour un datacenter OpenAI | Nvidia | Révélé par un dépôt SEC du 17 août : Nvidia garantit le financement de la première phase d'un campus de **8 gigawatts** dans l'Ohio, construit et exploité par SB Energy avec un bail de 20 ans pour OpenAI. Nvidia sera le fournisseur exclusif du compute, mise en service à partir de 2028. Le fournisseur de puces finance son propre client : la circularité de l'économie IA en une transaction |
| **4 failles activement exploitées** ajoutées au catalogue KEV | CISA | Le 18 août : traversée de chemin **vCenter (CVE-2026-59310, CVSS 9.8)**, 361 serveurs compromis dans 47 pays avec un ransomware dérivé de Babuk ; contournement d'authentification **SharePoint (CVE-2026-55040, 9.1)** exploité quelques heures après la publication du PoC ; une faille IKE Windows **wormable** (9.8) ; un bypass du partage d'écran macOS utilisé pour installer des cryptomineurs |
| Patch Tuesday : **421 CVE corrigées**, un zero-day | Microsoft | Dont **CVE-2026-68820**, un use-after-free dans le driver afd.sys (Winsock) exploité dans la nature pour élever ses privilèges jusqu'à System |
| Claude conçoit des **protéines validées en labo** | Anthropic | Des binders conçus par Claude ont fonctionné contre **14 cibles sur 15** testées par Adaptyv Bio et Twist Bioscience, avec 22 à 35 % de réussite contre 10 à 15 % de taux typique du secteur. L'IA générative sort du texte et entre dans la biologie mesurable |
| **30 licenciements** et départs volontaires proposés | Cognition | Trois semaines après avoir racheté Windsurf, la startup derrière Devin licencie 30 personnes et propose un buyout aux ~200 restants. La consolidation des startups de code IA continue, même chez les mieux financées |
| Release de sécurité **programmée le 26 août** | Next.js | Patches annoncés pour Next.js 16.3 et 15.5, dont **une faille critique**. Si vous avez un projet Next.js en prod, bloquez 30 minutes mardi pour mettre à jour |

## Pourquoi ça vous concerne

- **Votre CI vit chez GitHub, pas chez vous.** Huit heures sans Actions ni authentification, c'est une journée de travail d'équipe perdue si personne ne sait travailler en dégradé. Rappel utile : git est **distribué**. Committez localement, échangez des branches entre collègues, gardez éventuellement un remote miroir (GitLab, Codeberg). La panne de l'hébergeur n'est une panne de git que si vous l'acceptez.
- **Le retry naïf est un amplificateur de panne.** Une boucle `while (fail) retry` sans backoff transforme chaque client en participant au DDoS de récupération. Backoff exponentiel, jitter, budget de retry, idempotence : quatre mots à connaître avant votre premier service en production.
- **Lisez les postmortems, c'est de la formation gratuite.** Celui de GitHub donne la chronologie, la cause racine, les facteurs aggravants et les remédiations chiffrées. C'est exactement le niveau de détail qu'un recruteur adore entendre cité en entretien.
- **La fenêtre de patch se compte en heures.** SharePoint exploité quelques heures après le PoC public, vCenter cinq jours après le correctif. La vraie question n'est plus « avez-vous patché ? » mais « pourquoi votre vCenter ou votre SharePoint est-il joignable depuis Internet ? »
- **Le marché du stage IA a deux visages.** D'un côté des dizaines de milliards en infrastructure (Nvidia, OpenAI, Ohio), de l'autre des licenciements chez les startups de code IA les mieux financées (Cognition). Cibler l'infra, les plateformes et les boîtes qui déploient l'IA en interne est aujourd'hui moins risqué que la n-ième startup d'agents.

## En entretien

**« GitHub est en panne, votre équipe est bloquée. Vous faites quoi ? »**

D'abord constater proprement (status page, pas de panique), puis rappeler que git est distribué : les commits, branches et diffs continuent en local, et deux collègues peuvent s'échanger des branches sans serveur central. Ensuite protéger la reprise : ne pas marteler l'API avec des retries agressifs, différer les pushes non urgents. Enfin communiquer : prévenir l'équipe de ce qui est bloqué (CI, reviews) et de ce qui ne l'est pas. Ce que le recruteur évalue, c'est votre calme et votre compréhension de l'outil, pas votre capacité à attendre.

**« C'est quoi un retry bien conçu ? »**

Quatre ingrédients. Un **backoff exponentiel** : on attend de plus en plus longtemps entre les tentatives. Du **jitter** : un aléa qui évite que tous les clients réessaient à la même seconde. Un **budget de retry** : au-delà d'un certain taux d'échec, on arrête d'insister et on dégrade proprement. Et l'**idempotence** : rejouer la requête ne doit pas créer de doublon. Exemple d'actualité : pendant la panne du 17 août, les boucles de retry des clients Copilot ont augmenté le trafic au moment précis où GitHub essayait de récupérer.

**« Racontez-moi une panne célèbre et ce qu'elle enseigne. »**

Le 17 août 2026, GitHub : 7h47 d'indisponibilité mondiale, sans bug ni mauvais déploiement. Cause : un composant du datacenter Central US saturé par un trafic record (commits doublés en quatre mois, poussés par les agents IA), invisible pour l'auto-scaling. Leçons : la capacité est une cause de panne à part entière, l'auto-scaling ne protège que ce qu'il mesure, et les retries clients peuvent prolonger un incident. Bonus : citer la remédiation (budgets de retry, migration Azure à 58 % de la charge) montre que vous avez lu la source, pas un tweet.

## Pour aller plus loin

- [Le postmortem officiel : « The August 17 outage, and the work ahead » (GitHub Blog)](https://github.blog/news-insights/company-news/the-august-17-outage-and-the-work-ahead/)
- [La panne du 17 août en détail, chronologie et réactions (DEV Community)](https://dev.to/jamilxt/github-is-down-the-august-17-2026-outage-in-detail-1e36)
- [Nvidia garantit jusqu'à 105 Md$ pour le datacenter OpenAI de l'Ohio (CNBC)](https://www.cnbc.com/2026/08/17/nvidia-financing-open-ai-data-center-ohio.html)
- [Patch Tuesday d'août : 421 CVE, un zero-day exploité (SecurityWeek)](https://www.securityweek.com/august-2026-patch-tuesday-microsoft-fixes-421-cves-one-exploited-zero-day/)
- [Les 4 failles ajoutées au catalogue KEV de la CISA le 18 août (XHack)](https://xhack.io/blog/cisa-known-exploited-vulnerabilities-august-2026)
- [Cognition licencie trois semaines après le rachat de Windsurf (Tech Startups)](https://techstartups.com/2026/08/17/top-tech-news-today-august-17-2026-ge-microsoft-nvidia-open-stripe-unitree-more/)
- [Release de sécurité Next.js annoncée pour le 26 août (blog Next.js)](https://nextjs.org/blog)
