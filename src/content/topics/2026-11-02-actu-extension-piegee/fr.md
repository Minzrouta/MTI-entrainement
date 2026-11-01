---
title: "Une fausse extension Claude Code installe une porte dérobée SSH sur les postes de développeurs"
date: "2026-11-02"
category: "Actu"
level: "Semaine 45"
summary: "Le 29 octobre, une version 2.1.313 piégée de l'extension « anthropic.claude-code » a circulé sur Open VSX, la boutique d'extensions utilisée par Cursor. Elle ajoutait une clé SSH de l'attaquant et ouvrait un tunnel inverse. Plus : Anthropic publie des chaînes d'exploits construites par un modèle non publié, Mistral Large 4 doit sortir ses poids, Thrive Holdings rachète ADT et Reddit passe à une expérience connectée."
---

## La une

Cette semaine, l'outil le plus banal d'un développeur, une extension d'éditeur, a servi de porte d'entrée.

Selon les articles de presse spécialisée de la semaine, la version **2.1.313** de l'extension **`anthropic.claude-code`** publiée sur **Open VSX** (la boutique d'extensions ouverte que Cursor utilise) était **malveillante**. Les chercheurs y ont trouvé un chargeur d'environ 66 lignes inséré avant le code normal. Il ajoute **une clé SSH de l'attaquant** dans `authorized_keys`, ouvre un **tunnel inverse** vers un serveur externe et met en place de la **persistance**. Autrement dit : un accès distant à la machine du développeur.

Les faits à retenir, avec leurs limites :

- **Cursor a indiqué** que la version modifiée avait été distribuée par sa boutique, pour **5 000 utilisateurs au plus**, et qu'elle **n'avait pas été développée par Anthropic**.
- **La boutique officielle de Microsoft** n'est pas connue comme touchée. Les chercheurs précisent que leurs constats ne prouvent pas que la version officielle d'Anthropic ou sa chaîne de distribution ait été compromise. Un message sur les réseaux sociaux affirmant le contraire n'est pas confirmé.
- **Les dates varient** selon les sources (29 ou 30 octobre). Ce qui est cohérent : la version a été retirée rapidement. Les versions 2.1.312 et 2.1.314 sont données comme saines.
- **Désinstaller ne suffit pas.** Le programme a déposé de la persistance en dehors de l'extension : il faut chercher et supprimer la clé ajoutée dans `authorized_keys` (un nom comme `svc-telemetry` est cité) et **changer les identifiants** accessibles depuis la machine.

**Pourquoi c'est notable.** Une extension s'exécute avec vos droits : vos clés SSH, vos jetons Git, vos fichiers `.env`. Un nom connu (« anthropic », « claude-code ») inspire confiance, alors que la boutique ouverte n'a pas les mêmes contrôles que la boutique officielle. C'est la même famille de risques que les attaques sur les paquets npm vues cette année : la chaîne d'approvisionnement des outils de développement est une cible.

> 🎤 **En entretien** : si on vous demande « comment gérez-vous la sécurité de votre poste de dev ? », vous pouvez répondre : « Je traite une extension d'éditeur comme une dépendance : elle a accès à mes secrets. Cette semaine, une version piégée d'une extension Claude Code a circulé sur Open VSX avec une clé SSH ajoutée et un tunnel inverse. Donc je vérifie l'éditeur, je limite le nombre d'extensions, et si un doute apparaît, je regarde `authorized_keys` et je change mes clés, pas seulement je désinstalle. » Vous montrez que vous pensez à la persistance, pas seulement à l'installation.

## Aussi cette semaine

| Quoi | Qui | Pourquoi c'est notable |
|---|---|---|
| **Chaînes d'exploits construites par un modèle non publié** | Anthropic (Frontier Red Team) | Selon la presse, publié le **27 octobre** : cinq chaînes d'exploits pour Chrome, Safari, Android, Windows et Linux, en environnement de test. Les failles auraient été signalées aux éditeurs et corrigées. La couverture est inégale et le texte d'origine n'a pas été relu ici |
| **Mistral Large 4, poids ouverts** | Mistral | Aperçu public via API depuis le **6 octobre**, publication des poids annoncée pour le **27 octobre**. Taille et performances en cybersécurité sont des chiffres du fournisseur, sans évaluation indépendante publiée. Je n'ai pas pu confirmer que la sortie a bien eu lieu |
| **Thrive Holdings rachète ADT** | Thrive Holdings (soutenu par OpenAI) | Annoncé le **29 octobre** : environ 15,3 milliards de dollars de valeur d'entreprise, avec l'idée d'apporter de l'IA à la sécurité domestique (TechCrunch) |
| **Reddit passe à une expérience connectée** | Reddit | Annoncé le **29 octobre**, alors que le trafic venu des moteurs de recherche baisse. Le but affiché est de protéger les données du pillage par les IA et de négocier des licences (TechCrunch) |
| **ARTEX, un cadre d'agents IA utilisé en intrusion** | CrowdStrike | Le **29 octobre**, CrowdStrike a décrit un groupe lié à la Chine, VAPOR PANDA, qui s'en sert dans des intrusions. Source secondaire, à vérifier dans le rapport |

## Pourquoi ça vous concerne

- **Votre portable d'étudiant contient des secrets.** Clés SSH vers GitLab ou GitHub, jetons de déploiement, accès au VPS de l'équipe. Une seule extension piégée suffit à tout exposer.
- **Choisissez où vous installez.** Boutique officielle ou boutique ouverte, éditeur vérifié ou non : lisez le nom de l'éditeur et le nombre d'installations avant de cliquer, surtout pour un nom connu.
- **Sachez auditer en dix minutes.** `cat ~/.ssh/authorized_keys`, `ss -tnp` pour voir les connexions sortantes inattendues, et la liste des extensions installées. C'est une compétence qu'un recruteur apprécie.
- **Séparez les droits.** Une clé de déploiement ne doit pas être votre clé personnelle, et un jeton doit avoir le minimum de droits et une date d'expiration.
- **Les outils d'IA sont aussi des cibles.** Plus un outil est populaire, plus son nom est imité. Ce n'est pas une raison de ne plus les utiliser, c'est une raison de vérifier la source.

## En entretien

**« Une extension de votre éditeur est compromise. Que faites-vous ? »**

Je la désinstalle, mais surtout je pars du principe que ce qu'elle pouvait lire est compromis. Je cherche la persistance (clés ajoutées dans `authorized_keys`, tâches planifiées, connexions sortantes), je révoque et je régénère mes clés SSH et mes jetons, et je regarde l'historique des accès sur les services concernés. Je préviens aussi mon équipe, parce que mes accès sont ceux de l'équipe.

**« Pourquoi une extension est-elle plus risquée qu'un site web ? »**

Elle tourne avec les droits de mon utilisateur, sans le cloisonnement du navigateur : elle peut lire mes fichiers, lancer des commandes et ouvrir des connexions réseau. Une mise à jour, même d'un nom connu, est du code nouveau qui s'exécute chez moi.

**« Comment réduire ce risque dans une équipe ? »**

Une liste d'extensions approuvées, l'installation depuis la boutique officielle ou un miroir contrôlé, des clés de déploiement distinctes des clés personnelles avec peu de droits, et une procédure écrite de rotation des secrets pour savoir quoi faire en cas d'alerte.

## Pour aller plus loin

- [Une extension Claude Code piégée donne un accès distant aux postes de développeurs (Cybersecurity News)](https://cybersecuritynews.com/malicious-claude-code-extension/)
- [L'extension Claude Code 2.1.313 a posé une porte dérobée SSH via Open VSX (daily.dev)](https://daily.dev/posts/malicious-claude-code-vs-code-extension-2-1-313-planted-an-ssh-backdoor-via-open-vsx-nwik77u1j)
- [Frontier Red Team : un modèle non publié a enchaîné des failles en exploits (AI Weekly)](https://aiweekly.co/alerts/anthropics-frontier-red-team-says-unreleased-claude-chained-flaws-into-working)
- [Mistral dévoile Large 4, « Le Chonk » (Cybernews)](https://cybernews.com/news/mistral-sovereign-model-le-chonk/)
- [Thrive Holdings rachète ADT (TechCrunch)](https://techcrunch.com/2026/10/29/openai-backed-thrive-holdings-acquires-adt)
- [Reddit passe à une expérience connectée (TechCrunch)](https://techcrunch.com/2026/10/29/as-search-traffic-dries-up-reddit-announces-its-shifting-to-a-logged-in-experience)
