---
title: "Claude signe désormais tout ce qu'il écrit : le filigrane invisible débarque dans vos copier-coller"
date: "2026-08-17"
category: "Actu"
level: "Semaine 34"
summary: "Anthropic marque le texte généré par Claude d'un filigrane invisible qui survit au copier-coller, pour se conformer à l'article 50 du règlement européen sur l'IA applicable depuis le 2 août. Plus : Gemini 3.7 Flash, GPT-5.6-Cyber, et une semaine chargée côté RCE."
---

## La une

Le **11 août**, Anthropic a confirmé que **Claude marque désormais son texte d'un filigrane invisible**. Pas une bannière, pas une mention en bas de page : une signature statistique intégrée au modèle lui-même.

Le mécanisme, en clair : le modèle **biaise légèrement ses choix de mots** selon une clé secrète. Sur un mot isolé, indétectable. Sur quelques centaines de mots, le motif ressort d'une analyse statistique. Conséquence pratique : **la marque voyage avec le copier-coller** et survit à des retouches légères, mais s'efface si le texte est lourdement réécrit. Pour les fichiers, Anthropic utilise en plus le standard ouvert **C2PA** : des métadonnées de provenance signées cryptographiquement, qui indiquent que Claude est passé par là et permettent de détecter une altération.

La portée est large et sans opt-out : API Claude, application Claude, **Claude Code**, Claude Cowork, Claude Tag, partout dans le monde. Tous les modèles publiés **après le 2 août 2026** l'embarquent d'office ; les plus anciens suivront d'ici décembre.

Pourquoi maintenant ? Parce que l'**article 50 du règlement européen sur l'IA** est applicable depuis le **2 août 2026**. Il impose aux fournisseurs de systèmes génératifs que leurs sorties (texte, image, audio, vidéo) soient **marquées dans un format lisible par machine et détectables** comme générées par une IA. Les sanctions montent à **15 millions d'euros ou 3 % du chiffre d'affaires mondial**, le plus élevé des deux. Les systèmes déjà sur le marché ont jusqu'au **2 décembre 2026** pour se mettre en conformité sur le marquage. Google, Meta, Microsoft, OpenAI et d'autres ont pris le même engagement : Anthropic est simplement le premier à livrer la version texte.

L'accueil, lui, n'a rien de tiède. La crainte dominante n'est pas la censure mais **l'exposition** : un devoir, un rapport, une lettre de motivation retouchés avec Claude peuvent être signalés à l'insu de celui qui les rend. Des outils de suppression de filigrane sont apparus dans la semaine, ce qui pose la vraie question technique : un marquage qui ne survit pas à une réécriture est-il un contrôle, ou un signal ?

> 🎤 **En entretien** : la bonne distinction à poser, celle que peu de candidats font : **filigrane ≠ détecteur d'IA**. Un détecteur type GPTZero *devine* à partir du style et se trompe souvent (avec un biais documenté contre les non-anglophones). Un filigrane, lui, est *posé à la source* par le producteur du texte, avec une clé : c'est de la **provenance**, pas de la stylométrie. Savoir expliquer cette différence en deux phrases vous place immédiatement au-dessus du discours ambiant sur « les détecteurs d'IA ».

## Aussi cette semaine

| Quoi | Qui | Pourquoi c'est notable |
|---|---|---|
| **Gemini 3.7 Flash** | Google | Sorti le 13 août, trois semaines seulement après 3.6 Flash, et pas ré-entraîné de zéro. Bonds sur le code et l'agentique : DeepSWE v1.1 de 49,0 % à 65,3 %, AutomationBench de 17,0 % à 30,4 %, Elo WebDev Arena de 1538 à 1588. Tarif 0,75 $ / 3,75 $ le million de tokens **jusqu'au 31 décembre 2026**, puis doublé au 1er janvier. Le flagship Gemini 3.5 Pro, lui, reste en retard |
| **GPT-5.6-Cyber** en accès filtré | OpenAI | Un modèle spécialisé cyberdéfense ouvert à un groupe restreint d'experts validés, sur dossier. Dans la foulée, un palier d'API **Ultrafast** qui fait tourner GPT-5.6 Sol jusqu'à 14 fois plus vite que la file standard |
| Semaine noire pour les RCE | JetBrains, IBM, Progress | Exécution de code à distance **non authentifiée** sur TeamCity (CVE-2026-63077) et sur IBM Langflow (CVE-2026-9198), plus Progress LoadMaster (CVE-2026-8037), toutes exploitées activement. La CI et l'outillage interne sont la cible, pas le site vitrine |
| Extensions VS Code piégées et CI GitLab visées | CISA | Après le ver npm du début de mois, la chaîne d'outils développeur reste le vecteur privilégié : marketplace d'extensions, paquets, pipelines |
| 10,9 Md$ de revenus au T2, premier bénéfice opérationnel | Anthropic | 559 M$ de résultat opérationnel : le premier trimestre positif d'un grand labo de modèles frontière |
| Le milliard d'utilisateurs mensuels | Google | Sundar Pichai annonce que l'application Gemini a franchi le milliard d'utilisateurs actifs mensuels |

## Pourquoi ça vous concerne

- **Vos livrables écrits portent maintenant une étiquette.** Rapport de stage, lettre de motivation, README : si le texte sort de Claude et part tel quel, il est marqué. La stratégie saine n'est pas la triche technique mais le workflow : l'IA sert de brouillon et de relecteur, vous écrivez la version finale. Vous gardez la voix, et le problème disparaît.
- **La conformité devient une ligne de cahier des charges.** Si vous construisez un produit qui génère du texte pour des utilisateurs européens, l'article 50 vous concerne : informer l'utilisateur qu'il parle à une IA, marquer les sorties synthétiques. C'est exactement le genre de contrainte qu'un candidat capable de citer sans réviser fait remarquer en entretien.
- **Provenance et détection sont deux métiers différents.** C2PA signe la chaîne de production d'un fichier ; le filigrane textuel marque la sortie d'un modèle ; un détecteur statistique devine après coup. Les trois répondent à des questions différentes et n'ont pas les mêmes garanties.
- **Le prix affiché d'un modèle a une date de péremption.** Gemini 3.7 Flash est bon marché jusqu'au 31 décembre, puis double. Toute estimation de coût d'une feature IA devrait mentionner la date à laquelle elle a été calculée.
- **Sécurisez la CI comme la prod.** Trois RCE non authentifiées sur des outils internes en une semaine : un serveur TeamCity ou un Langflow laissé accessible, c'est un accès direct aux secrets de build. La question « qui peut joindre votre CI depuis Internet ? » est une vraie question d'entretien.

## En entretien

**« Comment sait-on qu'un texte a été généré par une IA ? »**

Trois familles de réponses, à ne pas confondre. Le **filigrane** : le fournisseur biaise les choix de tokens avec une clé, et vérifie ensuite statistiquement ; fiable sur un volume suffisant, fragile à la réécriture (c'est ce qu'Anthropic a déployé le 11 août). La **provenance signée** type C2PA : des métadonnées cryptographiques attachées au fichier, qui disparaissent si on recopie le contenu ailleurs. Le **détecteur statistique** : il devine à partir de la perplexité et du style, avec des faux positifs documentés. Conclure par la limite honnête : aucun des trois ne prouve qu'un humain n'a pas écrit le texte, ils prouvent au mieux qu'une machine y a touché.

**« Le règlement européen sur l'IA, ça change quoi pour un dev ? »**

Depuis le 2 août 2026, l'article 50 impose la transparence : dire à l'utilisateur qu'il interagit avec une IA, et marquer les contenus synthétiques dans un format lisible par machine. Sanctions jusqu'à 15 M€ ou 3 % du CA mondial. Concrètement, côté code : une mention d'interface, un marquage à la génération, et une trace de provenance conservée. C'est de la fonctionnalité produit, pas seulement du juridique.

**« Vous utilisez l'IA pour coder ? »**

Répondez oui, sans détour, puis montrez la méthode : ce que vous déléguez (boilerplate, tests répétitifs, exploration d'une API inconnue), ce que vous ne déléguez jamais (le choix d'architecture, la revue de sécurité), et comment vous vérifiez (vous relisez la diff, vous lancez les tests, vous savez expliquer chaque ligne). Le recruteur ne cherche pas quelqu'un qui n'utilise pas l'IA, il cherche quelqu'un qui sait quand elle a tort.

## Pour aller plus loin

- [Anthropic va marquer le texte généré par ses modèles (TechCrunch)](https://techcrunch.com/2026/08/11/anthropic-says-it-will-watermark-text-generated-by-its-ai-models/)
- [Ce que le filigrane de Claude détecte, et ce qu'il rate (explainX)](https://explainx.ai/blog/anthropic-claude-invisible-watermarks-c2pa-august-2026)
- [Les obligations de transparence de l'article 50, guide pratique (EU Artificial Intelligence Act)](https://artificialintelligenceact.eu/transparency-rules-article-50/)
- [Obligations de transparence de l'article 50 (Commission européenne)](https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act)
- [Gemini 3.7 Flash, le modèle de travail de Google (blog Google)](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-3-7-flash/)
- [Gemini 3.7 Flash arrive avant Gemini 3.5 Pro (Axios)](https://www.axios.com/2026/08/13/google-gemini-37-flash)
- [Six failles activement exploitées cette semaine (Security Online)](https://securityonline.info/weekly-cve-report-august-2026/)
