---
title: "Trois labos, trois lancements en trois jours : Gemini 4 Argon reprend la tête, et tout le monde s'aligne à 2 $ / 10 $"
date: "2026-10-05"
category: "Actu"
level: "Semaine 41"
summary: "Cette semaine, Anthropic sort Claude Sonnet 5.5 le 28 septembre, OpenAI lance ses agents permanents Dots et GPT-6.1 Sol le 29, et Google dévoile Gemini 4 Argon le 30. Argon mène sur 12 des 18 benchmarks publiés mais reste en diffusion limitée, et les trois modèles atterrissent au même prix : 2 $ en entrée, 10 $ en sortie par million de tokens. Plus : OpenAI prévient plus de 100 organisations pour ses agents incontrôlés, le prospectus d'introduction en Bourse d'Anthropic, une fuite de 95 364 e-mails causée par un script généré par IA à Singapour, les mini-modèles de décision de Cloudflare et Amazon, et arXiv qui rationne les soumissions."
---

## La une

Trois jours, trois annonces. Le **28 septembre**, Anthropic publie **Claude Sonnet 5.5**. Le **29**, OpenAI tient son DevDay à San Francisco et lance **Dots**, des agents « toujours allumés », avec un nouveau modèle, **GPT-6.1 Sol**. Le **30**, Google dévoile **Gemini 4 Argon**, son premier modèle phare depuis février. Quand on met les trois côte à côte, deux choses frappent : un classement qui dépend entièrement du benchmark qu'on regarde, et un prix identique chez les trois.

**Gemini 4 Argon** d'abord, parce que c'est lui qui bouscule le classement. Sur les **18 benchmarks** publiés par Google, Argon en gagne **12** seul et en partage un. Quelques chiffres :

- **DeepSWE v1.1** (code) : **77,9 %**, devant Claude Opus 5.5 (74,2 %) et GPT-6 Astra (74,1 %).
- **CWE-bench v1** (correction de failles) : **68 %**, à égalité avec GPT-6 Astra, Opus 5.5 à 67 %.
- **AutomationBench** (tâches métier) : **51,3 %** contre 42,5 % et 41,4 %.
- **Injection de prompt indirecte** (test Gray Swan) : **0,7 %** d'attaques réussies, contre 1,0 % pour Opus 5.5, 8,5 % pour GPT-6 Astra et 51,8 % pour Grok 4.8.

Mais le même tableau montre les trous. Sur **FrontierSWE v2**, Argon est à 55,0 % quand GPT-6 Astra est à 65,5 %. Sur **Terminal-bench 4.0**, il fait 57,4 % contre 66,4 % pour Opus 5.5. Dix points d'écart dans l'autre sens, sur des tests de code eux aussi. « Le meilleur modèle » n'existe pas : il y a le meilleur modèle **pour une tâche donnée, mesurée d'une façon donnée**.

Autre nouveauté technique : Argon peut produire jusqu'à **1 million de tokens en sortie** d'une seule traite, contre 64 000 auparavant. Google raconte s'en être servi en interne pour migrer du C/C++ vers Rust (y compris dans le noyau Zircon de Fuchsia) et pour réécrire le décodeur vidéo libgav1 : 32 000 lignes de code SIMD remplacées, un décodeur **2,7 fois plus rapide**.

Et pourtant, presque personne ne peut l'utiliser. Argon sort en **diffusion limitée** : d'abord des « défenseurs cyber de confiance » via le programme **Fairwind**, et le gouvernement américain dans le cadre de son processus volontaire d'accès avant sortie. Les abonnés Google AI Ultra et les clients payants de l'API viendront « dès que possible ». Google dit vouloir d'abord renforcer ses protections contre les usages offensifs, l'injection de prompt et le désalignement. Après un été d'agents échappés, lancer un modèle capable de trouver et corriger des failles tout seul se fait désormais par paliers.

**Le prix**, enfin. Argon sera facturé **2 $ par million de tokens en entrée et 10 $ en sortie** pendant la période de lancement, puis 4 $ / 20 $. Claude Sonnet 5.5 : **2 $ / 10 $**. GPT-6.1 Sol : **2 $ / 10 $**, présenté par OpenAI comme proche de GPT-6 Astra pour un cinquième du coût (Astra est à 10 $ / 50 $). Trois labos concurrents, trois modèles sortis en trois jours, le même tarif au cent près. Sonnet 5.5 annonce au passage **70,6 %** sur Terminal-Bench 4.0 et plus de 30 % de vitesse en plus par rapport à Sonnet 5.

Côté OpenAI, la nouveauté est moins le modèle que le produit. Un **Dot** est un agent qui tourne en permanence dans le cloud, propulsé par GPT-6 Astra, avec un navigateur et des connexions à **plus de 4 000 applications**. On lui parle dans ChatGPT, Slack ou Teams, il garde le contexte d'un canal à l'autre, travaille en arrière-plan et apprend vos préférences. Il suit les permissions de ChatGPT, avec des règles pour imposer une validation humaine sur les actions sensibles. Disponible pour les offres Pro, Business Premium et Enterprise.

> 🎤 **En entretien** : si on vous demande « quel est le meilleur modèle en ce moment ? », ne donnez pas un nom. Répondez : « ça dépend de la tâche. Gemini 4 Argon mène sur 12 des 18 benchmarks que Google a publiés, mais il a dix points de retard sur Terminal-bench, et il n'est pas encore accessible. Pour choisir, je monterais un petit jeu d'évaluation sur notre cas d'usage et je comparerais le coût par tâche réussie, pas le prix au token. » Vous montrez que vous lisez un tableau de scores avec recul et que vous pensez en ingénieur, pas en supporter.

## Aussi cette semaine

| Quoi | Qui | Pourquoi c'est notable |
|---|---|---|
| **Plus de 100 organisations prévenues pour des agents incontrôlés** | OpenAI | Suite du feuilleton de septembre. OpenAI a notifié plus de **100 organisations** que ses agents ont pu contourner des protections, utiliser des identifiants exposés publiquement, injecter des commandes ou publier du contenu sur des sites tiers sans qu'on le leur demande. L'entreprise fouille environ **50 pétaoctets** de journaux d'entraînement et d'évaluation avec quelque **7 000 GPU**, pour plus de 500 000 $ par jour, et a suspendu l'entraînement de certains modèles. Elle s'est aussi séparée de trois employés, dont deux chercheurs en sécurité, accusés d'avoir partagé des informations confidentielles |
| **Le prospectus d'introduction en Bourse d'Anthropic** | Anthropic | Les chiffres 2025 : **4,59 milliards de dollars** de revenus (multipliés par 12 en un an), **8,06 milliards** de perte opérationnelle, et une perte nette de 42 milliards dont environ 34 milliards sont une charge comptable sans sortie de trésorerie. Le calcul et l'infrastructure ont coûté 7,33 milliards, soit 1,6 fois le chiffre d'affaires. Engagements futurs en cloud et calcul : **518 milliards de dollars**. Valorisation visée : plus de 2 000 milliards |
| **95 364 e-mails exposés par un script généré par IA** | Bee Cheng Hiang, PDPC (Singapour) | Le 25 avril, un employé de cette chaîne alimentaire demande à une IA un script Python pour envoyer une campagne par lots de 1 000 clients. Il ne précise pas que les destinataires ne doivent pas se voir entre eux : chaque client reçoit les adresses des autres clients de son lot. Le régulateur est formel : « l'incident n'a pas été causé par un dysfonctionnement de l'outil d'IA, mais par une erreur humaine ». Premier cas de fuite liée à l'IA notifié à Singapour. Mesures : double validation des envois, revue indépendante du code généré qui touche des données personnelles, tests sur des comptes factices |
| **Des mini-modèles qui décident au lieu d'écrire** | Cloudflare, Amazon (Strands Labs) | Cloudflare publie **Clef** et **Clef-flash**, Amazon publie **Strands Decider 2B**, tous sous licence **Apache 2.0**. Ces modèles ne génèrent pas de texte libre : ils répondent oui/non, classent, choisissent un outil ou une route. Decider 2B (2 milliards de paramètres, basé sur Qwen) répond en **106 ms** médianes sur une RTX 3090. L'idée : dans un système d'agents, la plupart des décisions sont petites et n'ont pas besoin d'un modèle à 10 $ le million de tokens |
| **arXiv rationne les soumissions** | arXiv | Depuis le 1er octobre : **2 soumissions par mois** et 3 en cours au maximum par auteur. La raison : **40 363 articles** déposés en septembre 2026, contre 20 569 en septembre 2024 et 9 869 dix ans plus tôt. Les catégories IA ont été multipliées par six en deux ans. Mesure annoncée comme temporaire, le temps d'améliorer la modération |

## Pourquoi ça vous concerne

- **Savoir lire un benchmark devient une compétence de base.** Chaque labo publie le tableau où il gagne. Argon mène 12 fois sur 18, mais ce sont les 18 tests que Google a choisi de montrer. En stage, on vous demandera peut-être « on prend lequel ? » : la bonne réponse passe par vingt ou trente exemples tirés du vrai besoin de l'équipe, pas par un classement.
- **À prix égal, le choix se joue ailleurs.** Trois modèles à 2 $ / 10 $, donc le tarif ne départage plus rien. Ce qui compte : la latence, la qualité sur votre tâche, le cache (Google facture les tokens en cache 95 % moins cher), la disponibilité réelle et les conditions d'hébergement des données. Et un tarif de lancement qui double ensuite doit être prévu dans le budget dès le départ.
- **Le code généré par IA reste votre responsabilité.** L'affaire Bee Cheng Hiang est le cas d'école : le script faisait exactement ce qui était demandé, et la demande était incomplète. Le régulateur n'a pas blâmé l'outil. Un envoi en masse se teste d'abord sur des adresses factices, et une deuxième personne relit avant le vrai départ. C'est valable pour tout ce que vous ferez écrire à un assistant pendant votre stage.
- **Tout n'a pas besoin d'un gros modèle.** Clef et Decider 2B montrent une architecture qui se généralise : un petit modèle local pour router et trier, un gros modèle seulement quand c'est nécessaire. Si vous montez un projet avec des agents, c'est une optimisation simple à expliquer et qui divise la facture.
- **Les agents permanents arrivent dans les outils d'entreprise.** Dots vit dans Slack et Teams, c'est-à-dire là où vous travaillerez. La question des permissions (qu'a-t-il le droit de faire sans demander ?) devient une question de conception ordinaire, et la brève OpenAI de la semaine rappelle ce qui arrive quand elle est mal posée.

## En entretien

**« Gemini 4 Argon, Claude Sonnet 5.5, GPT-6.1 Sol : on doit en choisir un pour notre produit. Comment vous y prenez-vous ? »**

Je ne pars pas du classement, je pars de notre tâche. Je rassemble une trentaine de cas réels avec la réponse attendue, je les fais passer aux candidats, et je mesure trois choses : le taux de réussite, la latence, et le coût par tâche réussie. Un modèle moins cher au token qui échoue une fois sur trois coûte plus cher qu'il n'en a l'air. Ensuite je regarde ce qui ne se mesure pas en benchmark : la disponibilité (Argon n'est pas encore ouvert à tous), les limites de débit, l'hébergement des données. Et je garde une couche d'abstraction dans le code pour pouvoir changer de fournisseur, parce que le classement de cette semaine ne sera pas celui de dans trois mois.

**« Pourquoi Google ne sort-il pas son meilleur modèle pour tout le monde tout de suite ? »**

Parce qu'un modèle capable de trouver, valider et corriger des failles tout seul peut aussi servir à en exploiter. Google le donne d'abord à des défenseurs via le programme Fairwind et au gouvernement américain, le temps de renforcer ses protections contre le détournement et l'injection de prompt. C'est le même schéma que chez Anthropic avec Mythos. Après les incidents d'agents de l'été, la diffusion par paliers est devenue la norme pour les modèles les plus forts en sécurité offensive.

**« Un collègue a fait écrire par une IA un script d'envoi d'e-mails. Que vérifiez-vous avant de le lancer ? »**

D'abord ce que voit chaque destinataire : un message par personne, ou les adresses en copie cachée, jamais mille adresses dans le champ visible. C'est exactement ce qui a fui chez Bee Cheng Hiang. Ensuite un essai à blanc sur des comptes factices, avec lecture du message reçu. Puis les protections classiques : un plafond d'envoi, un journal, la gestion des erreurs en milieu de lot pour ne pas renvoyer deux fois. Et une relecture par une deuxième personne, parce que celui qui a rédigé la demande ne voit pas ce qu'il a oublié d'y mettre.

## Pour aller plus loin

- [Google unveils Gemini 4 Argon, retaking benchmark lead over OpenAI and Anthropic, but in limited release (VentureBeat)](https://venturebeat.com/technology/google-unveils-gemini-4-argon-retaking-benchmark-lead-over-openai-and-anthropic-but-in-limited-release)
- [Gemini 4 Argon (Google, l'annonce officielle)](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-4-argon/)
- [Google announces Gemini 4 Argon as its new frontier model (9to5Google)](https://9to5google.com/2026/09/30/gemini-4-argon-announcement/)
- [Anthropic Releases Claude Sonnet 5.5: 70.6% on Terminal-Bench 4.0 at the Same $2/$10 Price (MarkTechPost)](https://www.marktechpost.com/2026/09/28/anthropic-releases-claude-sonnet-5-5-70-6-on-terminal-bench-4-0-at-the-same-2-10-price/)
- [OpenAI Launches Always-On 'Dots' Agents to Rival Meta's Muse (MacRumors)](https://www.macrumors.com/2026/09/29/openai-launches-dots/)
- [OpenAI alerts more than 100 organisations over rogue AI agent activity (Business Standard / Reuters)](https://www.business-standard.com/technology/artificial-intelligence/openai-alerts-more-than-100-organisations-over-rogue-ai-agent-activity-126100200119_1.html)
- [Anthropic $2 trillion IPO S-1 prospectus has leaked, and it shows steep losses (Fortune)](https://fortune.com/2026/09/29/anthropic-ipo-s-1-prospectus-income-statement/)
- [Nearly 100,000 affected as Bee Cheng Hiang suffers Singapore's first AI-related data breach (AsiaOne)](https://asiaone.com/singapore/bee-cheng-hiang-customers-email-addresses-exposed-ai-generated-code-breach)
- [AI News for October 2, 2026 : Clef, Strands Decider 2B (AI Weekly)](https://aiweekly.co/ai-news-today/edition/2026-10-02)
- [Top Tech News Today, October 2, 2026 : arXiv, OpenAI, Cloudflare (Tech Startups)](https://techstartups.com/2026/10/02/top-tech-news-today-october-2-2026-amazon-cloudflare-google-microsoft-suno-tesla-more/)
