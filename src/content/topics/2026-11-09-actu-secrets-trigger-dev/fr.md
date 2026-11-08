---
title: "Trigger.dev piraté : les variables d'environnement de ses clients lues par un attaquant"
date: "2026-11-09"
category: "Actu"
level: "Semaine 46"
summary: "Le 1er novembre, la plateforme de tâches en arrière-plan Trigger.dev a découvert qu'un attaquant avait obtenu des clés API racine de certains environnements clients, et donc leurs variables d'environnement. 0,66 % des clients sont touchés. Plus : la faille GitLab CVE-2026-97229 toujours exploitée, KERNEL piraté via un identifiant d'hébergeur, les poids de Kimi K3.1 Pro publiés et une mise à jour de sécurité Next.js."
---

## La une

Cette semaine, ce n'est pas le code d'une entreprise qui a fuité, ce sont les secrets qu'elle confie à un service tiers.

**Trigger.dev** est une plateforme qui exécute des tâches en arrière-plan pour d'autres applications (envoi d'e-mails, traitements longs, tâches planifiées). Pour que ces tâches tournent, les clients y stockent leurs **variables d'environnement** : mots de passe de base de données, clés d'API tierces, jetons d'accès.

Ce que dit l'entreprise dans son rapport d'incident publié le **6 novembre** :

- **Le 1er novembre**, des alertes d'infrastructure se déclenchent. Trigger.dev découvre qu'un attaquant a obtenu les **clés API racine** de certains environnements clients. Une clé racine donne un accès complet aux réglages de l'environnement, **y compris ses variables d'environnement**.
- L'attaquant a aussi listé des exécutions, des déploiements et des tâches planifiées (identifiants, noms de tâches, étiquettes).
- **0,66 % des clients** sont concernés. L'entreprise dit n'avoir trouvé aucune trace d'accès aux bases de production ni aux comptes du tableau de bord.
- **La cause n'est pas publiée** : « nous ne pouvons pas commenter le vecteur d'attaque pour l'instant ». Le rapport ne dit pas non plus si les variables marquées comme secrètes étaient incluses. Prudence donc : il faut supposer qu'elles l'étaient.
- **Réaction** : accès de l'attaquant coupé, identifiants internes changés, toutes les clés API des clients touchés révoquées, experts en réponse à incident et forces de l'ordre prévenus. Trigger.dev a aussi ajouté une liste blanche d'IP pour les clés à périmètre limité et la prise en charge d'**OIDC**.
- **Aux clients touchés**, prévenus par e-mail dès le 1er novembre au soir : régénérer leurs clés Trigger.dev, puis **changer chaque identifiant** stocké dans les environnements touchés et révoquer les anciens chez chaque fournisseur. Les secrets de signature des webhooks n'ont pas été exposés.

**Pourquoi c'est notable.** Les variables d'environnement sont souvent présentées comme « l'endroit sûr » pour les secrets, par opposition au code. Elles le sont vis-à-vis de Git, pas vis-à-vis de la plateforme qui les stocke. Chaque service à qui vous confiez un secret devient une partie de votre surface d'attaque. Et le vrai coût d'une fuite n'est pas la fuite elle-même : c'est le temps de faire la rotation de chaque clé, chez chaque fournisseur.

> 🎤 **En entretien** : si on vous demande « où stockez-vous vos secrets ? », vous pouvez répondre : « Hors du code, dans des variables d'environnement ou un gestionnaire de secrets, mais je garde en tête que la plateforme qui les stocke peut être piratée. Cette semaine, un attaquant a lu les variables d'environnement d'une partie des clients de Trigger.dev. Donc je donne à chaque clé le minimum de droits, je préfère des jetons courts comme OIDC aux clés longues, et je sais où se trouve chaque secret pour pouvoir le changer vite. » Vous montrez que vous pensez à l'après-fuite, pas seulement au stockage.

## Aussi cette semaine

| Quoi | Qui | Pourquoi c'est notable |
|---|---|---|
| **CVE-2026-97229, faille GitLab toujours exploitée** | GitLab, CISA, Shadowserver | Note **10/10**, exécution de code à distance sans authentification via le compilateur d'expressions régulières de la CI/CD. Corrigée le 12 octobre (19.4.2, 19.3.5, 19.2.8), ajoutée au catalogue des failles exploitées de la CISA fin octobre. Shadowserver comptait **plus de 1 000 serveurs** encore vulnérables le **1er novembre**. Alpine Linux a reconstruit son serveur après une tentative d'attaque |
| **KERNEL piraté via un identifiant d'hébergeur** | KERNEL (infrastructure de navigateurs) | Incident détecté le **2 novembre**. Avec un identifiant volé du compte chez son hébergeur, l'attaquant a accédé à des serveurs GPU le 3 novembre. Identifiants révoqués, serveurs mis hors ligne (avis public du 4 novembre) |
| **Kimi K3.1 Pro, poids publiés** | Moonshot AI | Promis pour le **4 novembre**, les poids sont arrivés sur Hugging Face (les dates varient entre le 2 et le 5 selon les sources). MoE de 2 800 milliards de paramètres, 104 milliards actifs, contexte d'un million de jetons. Les comparaisons avec les modèles fermés viennent de Moonshot, les testeurs extérieurs sont plus réservés |
| **Mise à jour de sécurité Next.js** | Vercel | Publiée le **3 novembre**. Un billet DEV parle de sept failles de gravité moyenne, dont les avis détaillés n'étaient pas encore publics |
| **Inkling 2 Small** | Thinking Machines Lab | Annoncé le **5 novembre** selon des agrégateurs : MoE de 594 milliards de paramètres, 17 milliards actifs, poids promis après des tests de sécurité externes. Non vérifié dans l'annonce d'origine |

## Pourquoi ça vous concerne

- **Vos projets ont déjà des secrets chez des tiers.** Variables CI/CD de GitLab, réglages Vercel, Coolify ou Railway, clés dans Supabase. Faites la liste : c'est la première question à se poser le jour d'une fuite.
- **Le droit minimal, même sur un projet d'école.** Une clé en lecture seule ou limitée à un seul projet fait beaucoup moins de dégâts qu'une clé administrateur.
- **Préférez les jetons courts.** OIDC permet à une CI d'obtenir un jeton valable quelques minutes au lieu d'une clé stockée pour toujours. C'est justement ce que Trigger.dev vient d'ajouter.
- **Mettez à jour ce que vous hébergez.** Un GitLab ou un Next.js auto-hébergé pour un projet de groupe est une vraie cible : la faille GitLab touche des serveurs exposés sur Internet, sans identifiant.
- **Entraînez-vous à la rotation.** Changer une clé sans casser la prod est une compétence concrète qu'un recruteur appréciera bien plus qu'une phrase générale sur la sécurité.

## En entretien

**« Un service tiers vous informe que vos variables d'environnement ont pu fuiter. Que faites-vous ? »**

Je pars du principe qu'elles ont fuité. Je liste les secrets concernés, je les change un par un chez chaque fournisseur en révoquant les anciens, en commençant par les plus puissants (base de données, clés cloud). Ensuite je regarde les journaux d'accès de chaque service pour repérer une utilisation anormale, et je préviens l'équipe.

**« Variables d'environnement ou gestionnaire de secrets ? »**

Les variables d'environnement suffisent pour commencer, à condition de ne jamais les commiter. Un gestionnaire de secrets ajoute la rotation automatique, l'historique des accès et des droits fins. Dans les deux cas, le secret est stocké quelque part : ce qui compte, c'est qu'il ait peu de droits, une durée de vie courte et qu'on sache le changer vite.

**« C'est quoi OIDC en CI/CD ? »**

Au lieu de stocker une clé cloud dans la CI, la CI présente un jeton signé qui prouve qui elle est (tel dépôt, telle branche), et le fournisseur cloud lui donne en échange un accès temporaire. Il n'y a plus de clé longue à voler.

## Pour aller plus loin

- [Rapport d'incident de Trigger.dev, 6 novembre (Trigger.dev)](https://trigger.dev/blog/security-incident-report-nov-2026)
- [Annonce initiale de l'incident, 1er novembre (Trigger.dev)](https://trigger.dev/blog/security-incident-nov-2026)
- [Trigger.dev reconnaît la fuite de variables d'environnement (SC Media)](https://www.scworld.com/brief/trigger-dev-discloses-security-incident-involving-exposed-environment-variables)
- [Plus de 1 000 serveurs GitLab exposés à CVE-2026-97229 (Aviatrix)](https://aviatrix.ai/threat-research-center/over-1000-gitlab-servers-vulnerable-to-code-execution-attacks-cve-2026-97229/)
- [Avis public de KERNEL du 4 novembre (KERNEL)](https://www.kernel.sh/blog/public-notice-of-security-incident-nov-4-2026)
- [Les poids de Kimi K3.1 Pro arrivent sur Hugging Face (ai-tldr)](https://ai-tldr.dev/releases/moonshot-kimi-k3-1-pro-open-weights/)
- [Blog Next.js, mise à jour de sécurité de novembre (Next.js)](https://nextjs.org/blog)
- [Actus LLM du 7 novembre (BenchLM)](https://benchlm.ai/blog/posts/llm-news-november-7-2026)
