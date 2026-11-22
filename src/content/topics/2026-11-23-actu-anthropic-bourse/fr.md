---
title: "Anthropic entre en bourse : les comptes du créateur de Claude sont publics"
date: "2026-11-23"
category: "Actu"
level: "Semaine 48"
summary: "Le 19 novembre, Anthropic a fait ses débuts au Nasdaq sous le symbole ANT après avoir levé environ 81 milliards de dollars, un record. Son prospectus montre 33,2 milliards de chiffre d'affaires sur neuf mois et des engagements de calcul énormes. Plus : le paquet PyPI agent-framework de Microsoft piégé, des scripts Optimizely infectés sur 178 sites, GPT-6.2 chez OpenAI, Gemini 4 Neon chez Google et une porte dérobée cachée dans un fichier de réglages Claude Code."
---

## La une

Après trois semaines de piratages, une actu d'un autre genre : l'entreprise derrière Claude est cotée en bourse, et ses comptes sont lisibles par tout le monde.

D'après CNBC et Fortune :

- **Le prix.** Le **18 novembre**, Anthropic a fixé son action à **83 dollars**, au-dessus de la fourchette annoncée (70 à 78 dollars). La demande a fait passer l'opération de 825 à **980 millions d'actions**.
- **Le montant.** Environ **81 milliards de dollars** levés (81,3 selon CNBC, 79 hors actions vendues par des actionnaires existants selon Fortune). Le record précédent appartenait à SpaceX, avec 75 milliards en juin. À 83 dollars, Anthropic valait **1 500 milliards de dollars**.
- **Le premier jour.** Le **19 novembre**, l'action ANT a ouvert à 111,50 dollars (+34 %) au Nasdaq, puis a fini à **97,17 dollars (+17 %)**, soit environ 1 800 milliards de capitalisation.
- **Les comptes.** Sur les neuf premiers mois de 2026, Anthropic déclare **33,2 milliards de dollars** de chiffre d'affaires, contre 2,5 milliards un an plus tôt. La perte nette atteint **104 milliards**. Fortune précise que l'essentiel vient du traitement comptable d'obligations convertibles : Anthropic n'a pas dépensé cette somme en liquide.
- **Le calcul.** CNBC cite un contrat allant jusqu'à **120,5 milliards de dollars** avec SpaceX d'ici 2029 pour de la capacité de calcul. Les analyses du prospectus comptent environ **900 milliards** d'engagements au total, presque tous en calcul et infrastructure.
- **Le contrôle.** Une société des fondateurs garde **50,1 % des droits de vote**. Amazon détient 14,7 % du capital, Google 13,7 %.
- **Et OpenAI ?** Toujours privée. Selon Fortune, son entrée en bourse attendra au moins 2027.

**Pourquoi c'est notable.** Une entreprise cotée publie ses comptes tous les trimestres et liste ses risques par écrit. Vous pouvez donc lire, pour la première fois, ce que coûte un laboratoire d'IA de cette taille. Les analyses du prospectus relèvent un point qui touche les développeurs : un agent qui enchaîne les appels d'outils et garde un long contexte consomme bien plus de calcul qu'un appel d'API simple. Les prix et les quotas des outils que vous utilisez dépendent de cette équation.

> 🎤 **En entretien** : si on vous demande « sur quel modèle d'IA baseriez-vous un produit ? », vous pouvez répondre : « Je choisirais un modèle selon la tâche et le coût, mais je garderais la possibilité d'en changer. Le prospectus d'Anthropic montre que le calcul pèse lourd dans les comptes, et que les agents en consomment beaucoup plus qu'un appel simple. Les prix et les limites peuvent bouger. Donc j'isole l'appel au modèle derrière une interface, je mesure mes tokens, et je teste un second fournisseur. » Vous montrez que vous lisez l'actu économique et que vous en tirez une décision technique.

## Aussi cette semaine

| Quoi | Qui | Pourquoi c'est notable |
|---|---|---|
| **agent-framework piégé sur PyPI** | Microsoft | Le **17 novembre** à 20h35 UTC, un attaquant a publié les versions **1.26.1** puis **1.26.2** du paquet officiel (environ 200 000 téléchargements par mois). Elles posaient un fichier `.pth`, que Python exécute à chaque démarrage, même sans importer le paquet. Le code volait variables d'environnement, fichiers d'identifiants et jetons Azure et GitHub Actions. PyPI a retiré les deux versions en moins d'une heure. Selon Wiz, l'attaquant semble avoir compromis un certificat du pipeline de publication de Microsoft. La 1.26.0 est saine |
| **Scripts Optimizely infectés** | Optimizely (tests A/B) | Le **16 novembre**, un attaquant a exploité une faille du parcours d'inscription pour ajouter du JavaScript aux projets de clients. Report URI compte **188 scripts infectés chez 178 organisations**. BleepingComputer cite Zoom, la BBC, CNN, Salesforce et GitLab parmi les sites qui chargeaient le script. Le code volait des numéros de carte et remplaçait des adresses de portefeuilles crypto. Selon Report URI, 24 organisations ont bloqué l'exécution grâce à une CSP stricte |
| **GPT-6.2 Astra et Sol** | OpenAI | Sortis le **17 novembre** dans ChatGPT, Codex et l'API. Astra vise les tâches complexes (8 $ / 40 $ par million de tokens en entrée / sortie), Sol l'usage courant (2 $ / 10 $). OpenAI annonce des garde-fous renforcés sur l'aide en cybersécurité |
| **Gemini 4 Neon** | Google | Sorti le **18 novembre**. Modèle intermédiaire entre Carbon et Hydrogen, 3 $ / 15 $ par million de tokens et 1 million de tokens de contexte selon la presse. Les comparaisons avec Opus 5.5 et GPT-6.2 Sol sont des chiffres de Google |
| **Porte dérobée dans `.claude/settings.json`** | Google GTIG | Selon des reprises d'un rapport du **16 novembre** (le rapport d'origine reste à lire), un groupe lié à la Corée du Nord a modifié ce fichier dans des dépôts internes d'entreprises crypto. Lancer Claude Code dans le dépôt téléchargeait alors une porte dérobée |

## Pourquoi ça vous concerne

- **Vos outils d'IA ont un coût réel.** Les abonnements et les quotas de Claude, ChatGPT ou Gemini peuvent changer. Pour un projet, notez le modèle utilisé, comptez les tokens et prévoyez un plan B.
- **Deux sorties de modèles en deux jours.** Regardez le prix par million de tokens avant le classement. Sol à 2 $ / 10 $ ou Neon à 3 $ / 15 $ suffisent pour la plupart des projets étudiants.
- **Attendez avant de mettre à jour.** Les versions piégées d'agent-framework ont vécu moins d'une heure. Un délai de quelques jours avant d'accepter une nouvelle version (option de délai minimal dans Renovate ou Dependabot) vous aurait protégé.
- **Figez vos dépendances.** Un fichier de verrouillage avec des versions exactes évite qu'un `pip install` récupère la dernière version publiée dix minutes plus tôt.
- **Une CSP, ça sert.** Chez Optimizely, les sites avec une `Content-Security-Policy` stricte ont bloqué le script malveillant alors qu'il venait d'un domaine de confiance. Ajoutez-en une à vos projets web.
- **Relisez les fichiers de configuration d'un dépôt.** `.claude/settings.json`, `.vscode/tasks.json`, hooks git : ces fichiers peuvent lancer des commandes. Dans une revue de code, ils méritent la même attention que le code.

## En entretien

**« C'est quoi une introduction en bourse, et qu'est-ce que ça change pour une boîte tech ? »**

L'entreprise vend des actions au public pour lever de l'argent. En échange, elle publie un prospectus (le formulaire S-1 aux États-Unis) puis des comptes chaque trimestre. Pour Anthropic, cela finance du calcul, et tout le monde peut lire son chiffre d'affaires, ses pertes et ses risques.

**« Comment limiter la dépendance à un fournisseur de LLM ? »**

On place l'appel au modèle derrière une interface interne, on garde les prompts et les jeux de tests hors du code du fournisseur, et on fait tourner les mêmes tests sur un second modèle. Changer de fournisseur devient alors un changement de configuration.

**« À quoi sert une Content Security Policy ? »**

C'est un en-tête HTTP qui indique au navigateur quelles sources de scripts, de styles ou de connexions une page accepte. Avec `script-src` et `connect-src` restreints, un script injecté ne peut ni se charger depuis un domaine inconnu ni envoyer des données ailleurs. Dans l'incident Optimizely, c'est ce qui a protégé une partie des sites.

## Pour aller plus loin

- [Les débuts d'Anthropic au Nasdaq (CNBC)](https://www.cnbc.com/2026/11/19/anthropic-ipo-ant-live-updates.html)
- [Anthropic bondit pour son premier jour de cotation (Fortune)](https://fortune.com/2026/11/19/anthropic-ipo-first-day-trading-nasdaq-record-valuation/)
- [L'action Anthropic finit en hausse de 17 % (Deadline)](https://deadline.com/2026/11/anthropic-ai-volatile-ipo-shares-trading-nasdaq-market-1237229045/)
- [Analyse du prospectus S-1 d'Anthropic (sec-api.io)](https://sec-api.io/insights/anthropic-ant-s-1-ipo-sec-filing-analysis)
- [agent-framework compromis sur PyPI (Wiz)](https://www.wiz.io/blog/malicious-version-of-microsofts-agent-framework-published-to-pypi)
- [Le paquet agent-framework de Microsoft compromis (BleepingComputer)](https://www.bleepingcomputer.com/news/security/microsofts-agent-framework-pypi-package-compromised-to-steal-credentials/)
- [L'attaque Optimizely infecte les sites de grandes marques (BleepingComputer)](https://www.bleepingcomputer.com/news/security/optimizely-supply-chain-attack-infects-major-brands-sites-with-malware/)
- [L'analyse de Report URI sur Optimizely (Report URI)](https://blog.report-uri.com/worlds-largest-brands-infected-with-malware-via-optimizely/)
- [GPT-6.2 Astra et Sol sont disponibles (forum développeurs OpenAI)](https://community.openai.com/t/gpt-6-2-astra-and-sol-are-now-available/1417531)
- [Présentation de Gemini 4 Neon (Google)](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-neon/)
- [La porte dérobée dans les réglages Claude Code, d'après le GTIG (explainx.ai)](https://explainx.ai/blog/google-gtig-sombermeme-claude-code-settings-backdoor-november-2026)
