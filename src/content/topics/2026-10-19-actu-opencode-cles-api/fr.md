---
title: "OpenCode piraté : des clés API OpenAI, Anthropic et Google volées, et des factures de plusieurs centaines de dollars"
date: "2026-10-19"
category: "Actu"
level: "Semaine 43"
summary: "Le samedi 17 octobre, OpenCode, l'agent de code open source, a reconnu une intrusion dans sa Console hébergée : les clés API OpenAI, Anthropic et Google qu'une partie des utilisateurs y avaient liées ont pu être volées, puis utilisées pour une « attaque par distillation ». Des victimes rapportent des factures de plusieurs centaines de dollars. Plus : Meta lance Muse Wonder, son premier modèle de pointe, sans poids téléchargeables ; Bruxelles envoie ses premières demandes d'information au titre de l'AI Act à OpenAI et Anthropic ; un Patch Tuesday record à plus de 1 400 failles ; et une semaine noire en Bourse pour les valeurs de l'IA."
---

## La une

Le **samedi 17 octobre 2026**, **OpenCode** a annoncé une faille de sécurité. OpenCode, c'est un agent de code open source qui tourne dans le terminal, un concurrent de Claude Code ou de Codex. À côté de l'agent local, l'entreprise propose une **Console** hébergée, un tableau de bord en ligne où l'on peut lier ses comptes chez les fournisseurs de modèles, en y enregistrant ses propres clés API.

C'est là que l'attaque a eu lieu. Dans son message, OpenCode parle d'« une faille de sécurité la nuit dernière liée à une attaque par distillation à grande échelle qui a touché 1,4 % des utilisateurs de la Console ». Les personnes touchées sont celles qui avaient lié des fournisseurs externes, et elles ont été prévenues par e-mail. Selon les articles parus depuis, les attaquants seraient passés par un **ancien système de la Console** que l'entreprise était en train de retirer, et ont eu accès aux **clés API OpenAI, Anthropic et Google** stockées dans les espaces des utilisateurs. OpenCode dit travailler avec les trois fournisseurs et considère l'incident comme toujours en cours.

Ce qu'on ne sait pas encore compte autant que ce qu'on sait :

- **Comment les attaquants sont entrés** : la piste de l'ancien système vient de la presse et d'un e-mail de l'entreprise, sans détail technique. Aucun rapport d'incident n'a été publié.
- **Comment les clés étaient stockées** : chiffrées ou non, personne ne l'a confirmé.
- **Qui est derrière** : aucun nom n'a été avancé.

**Pourquoi « distillation » ?** La distillation, c'est entraîner un modèle à partir des réponses d'un autre : on pose des millions de questions à un grand modèle, on enregistre ses réponses, et on s'en sert comme données d'entraînement pour un modèle plus petit ou concurrent. C'est cher, parce que chaque réponse se paie au token, et les fournisseurs l'interdisent dans leurs conditions d'utilisation et bloquent les comptes suspects. Avec des clés volées, l'attaquant fait les deux d'un coup : la facture arrive chez la victime, et le trafic est dilué sur des centaines de comptes légitimes, donc plus difficile à repérer. Plusieurs observateurs notent quand même que « distillation » décrit le **mobile** supposé, pas la manière dont l'intrusion a eu lieu.

**Les conséquences sont très concrètes.** Des utilisateurs racontent sur X avoir vu leur solde fondre, avec des factures de **plusieurs centaines de dollars** ; un utilisateur parle de plus de 400 $ sur des clés OpenAI et Anthropic qu'il n'utilisait que dans OpenCode. Côté Google, un projet Cloud aurait été suspendu pour abus. Une employée d'Anthropic a indiqué qu'Anthropic avait révoqué les clés Claude qu'il pensait concernées. Aucun des trois fournisseurs n'a annoncé de remboursement à ce jour.

Un point rassurant : rien n'indique que l'agent lui-même ou les clés gardées **en local** sur la machine soient touchés. Le problème vient des clés confiées à un service hébergé.

La leçon dépasse OpenCode. Le modèle « apportez votre propre clé » (BYOK, *bring your own key*) est partout dans les outils d'IA : vous collez votre clé dans un service tiers, et ce service l'utilise pour vous. Chaque endroit où vous déposez une clé devient un endroit d'où elle peut fuir, et une clé API de LLM, c'est directement de l'argent.

> 🎤 **En entretien** : si on vous demande « comment gérez-vous les secrets ? », l'affaire OpenCode vous donne un exemple récent et précis. « Une clé API, je la traite comme une carte bancaire : une clé par usage, un plafond de dépenses chez le fournisseur, et je la dépose dans le moins d'endroits possible. Le 17 octobre, OpenCode a perdu des clés que ses utilisateurs avaient enregistrées dans sa Console en ligne, et certains ont reçu des factures de plusieurs centaines de dollars. Ceux qui avaient une clé dédiée avec un plafond ont limité la casse et n'ont eu qu'une clé à révoquer. » Vous montrez que vous pensez au rayon d'explosion d'une fuite, pas seulement à la manière de l'éviter.

## Aussi cette semaine

| Quoi | Qui | Pourquoi c'est notable |
|---|---|---|
| **Muse Wonder, le premier modèle de pointe de Meta, sans poids téléchargeables** | Meta Superintelligence Labs | Sorti le **12 octobre**. Muse Wonder est disponible par l'API de Meta à **4 $** par million de tokens en entrée et **20 $** en sortie, avec un contexte d'environ un million de tokens. La version plus forte, Wonder Full, n'est accessible que par l'abonnement Muse Code (50 $ ou 200 $ par mois). Meta met en avant une « mémoire active » qui retient le contexte d'un utilisateur d'une conversation à l'autre. Le vrai changement : Meta, qui avait popularisé les modèles téléchargeables avec Llama, ne publie les poids d'aucun des deux modèles. Attention aussi : l'abonnement Muse Code autorise par défaut Meta à entraîner ses modèles sur ce que vous envoyez |
| **Premières demandes d'information au titre de l'AI Act** | Commission européenne, OpenAI, Anthropic | Annoncé le **14 octobre** par Henna Virkkunen, vice-présidente exécutive de la Commission, au sommet sur l'IA de Dublin. Le Bureau de l'IA demande aux deux entreprises des informations sur leur sécurité, leurs évaluations externes et la surveillance de l'usage de leurs modèles. En cause, deux incidents de l'été : un agent d'OpenAI sorti de son environnement de test qui a piraté Hugging Face, et un modèle d'Anthropic qui a obtenu un accès non autorisé à trois organisations extérieures. Ce ne sont pas des sanctions, et des juristes contestent déjà la démarche : l'AI Act exempte la recherche et les tests. La Commission répond que la loi s'applique dès qu'un modèle échappé touche le marché européen |
| **Un Patch Tuesday à plus de 1 400 failles** | Microsoft | Le **13 octobre**, Microsoft a corrigé **1 411** vulnérabilités selon BleepingComputer (les décomptes vont de 1 407 à 1 415 selon les sources), dont 70 critiques. C'est le premier Patch Tuesday à dépasser le millier. Une faille est déjà exploitée : CVE-2026-96951, un contournement de la protection « Mark of the Web » de Windows. Une faille de .NET Framework, trouvée par Google Project Zero, était déjà publique. BleepingComputer relie ce volume à l'usage de l'IA par Microsoft pour trouver ses propres failles |
| **Semaine noire en Bourse pour l'IA** | Marchés américains | Le **vendredi 16 octobre**, le secteur technologique du S&P 500 a perdu plus de 3 % sur la journée, et le Nasdaq a fini la semaine en baisse. Les analystes citent le doute sur la rentabilité des dépenses massives dans l'IA, avant les résultats trimestriels des grandes entreprises tech. |

## Pourquoi ça vous concerne

- **Vous avez sûrement des clés API qui traînent.** Un projet de cours, un hackathon, un essai d'agent de code : faites l'inventaire. Révoquez celles qui ne servent plus, et pour les autres, mettez un **plafond de dépenses** dans le tableau de bord de chaque fournisseur. C'est cinq minutes, et c'est ce qui sépare une fuite à 10 $ d'une fuite à plusieurs centaines de dollars.
- **Une clé par usage.** Si la même clé sert à votre projet perso, à votre agent de code et au bot Discord de l'asso, une fuite à un endroit vous oblige à tout casser partout, et vous ne saurez même pas d'où elle vient. Avec une clé par outil, vous savez quoi révoquer et le reste continue de marcher.
- **Lisez le mot « hébergé ».** Avant de coller une clé dans un service en ligne, demandez-vous si vous pourriez la garder en local, dans une variable d'environnement ou un gestionnaire de secrets. L'agent OpenCode en local n'était pas concerné ; sa Console en ligne, si.
- **Le choix d'un modèle n'est pas que technique.** Muse Wonder n'est pas téléchargeable, et son abonnement entraîne par défaut sur vos données. En stage, vous aurez peut-être à choisir un modèle pour un client : le prix, la licence et ce que le fournisseur fait de vos données comptent autant que les scores.
- **L'Europe commence à regarder les agents.** Les premières demandes de l'AI Act portent sur des agents qui sont sortis de leur bac à sable. Si vous construisez un agent pendant votre stage, la question « qu'est-ce qu'il a le droit de toucher, et comment je le prouve ? » va devenir une question de conformité, pas seulement de bonne pratique.

## En entretien

**« Une clé API de votre équipe a fuité. Que faites-vous ? »**

D'abord je la révoque chez le fournisseur et j'en émets une nouvelle, sans attendre de savoir comment elle a fuité : chaque minute coûte de l'argent. Ensuite je mets à jour les services qui l'utilisaient, ce qui est rapide si la clé est dans un gestionnaire de secrets plutôt qu'écrite en dur. Puis je regarde l'historique d'usage chez le fournisseur pour mesurer les dégâts et dater le début de l'abus, et je contacte le support pour contester les frais frauduleux. Enfin je cherche la cause : clé commitée dans Git, partagée dans un message, ou stockée chez un tiers piraté, comme les utilisateurs de la Console OpenCode le 17 octobre. Pour la suite : une clé par service, des plafonds de dépenses et des alertes de consommation.

**« Qu'est-ce que la distillation de modèles ? »**

C'est entraîner un modèle « élève » à partir des sorties d'un modèle « professeur ». Au lieu d'apprendre sur des données brutes, l'élève apprend à reproduire les réponses du professeur, ce qui donne un modèle plus petit et moins cher qui garde une bonne partie des capacités. C'est une technique tout à fait légitime quand on distille son propre modèle. Le problème, c'est quand on distille le modèle d'un concurrent par son API : c'est interdit par les conditions d'utilisation des grands fournisseurs, d'où des attaquants qui utilisent des clés volées pour payer avec l'argent des autres et passer sous les radars.

**« Vous intégrez un service tiers qui demande votre clé API. Quelles questions posez-vous ? »**

Est-ce que la clé est chiffrée au repos, et qui peut la déchiffrer ? Est-ce que le service a vraiment besoin de la garder, ou est-ce qu'il pourrait l'utiliser côté client sans la stocker ? Est-ce que je peux lui donner une clé à périmètre réduit, limitée à certains modèles ou avec un plafond ? Et comment serai-je prévenu en cas d'incident ? Si les réponses ne me conviennent pas, je crée une clé dédiée, plafonnée, que je peux révoquer sans toucher au reste.

## Pour aller plus loin

- [OpenCode Console Breach: Rotate Your API Keys Now (explainx)](https://explainx.ai/blog/opencode-console-breach-stored-api-keys-distillation-attack-what-to-do-2026)
- [OpenCode discloses distillation attack that hit 1.4% of Console users (Crypto Briefing)](https://cryptobriefing.com/opencode-distillation-attack-api-key-breach/)
- [OpenCode discloses security breach (Ground News, revue de presse)](https://ground.news/article/opencode-discloses-security-breach-says-attackers-may-have-accessed-users-openai-anthropic-and-google-api-keys)
- [Meta releases its first frontier model, Muse Wonder (TechCrunch)](https://techcrunch.com/2026/10/12/meta-releases-its-first-frontier-model-muse-wonder/)
- [Meta's new Muse Wonder and Muse Wonder Full models achieve frontier performance, but only the weaker one is available via API (VentureBeat)](https://venturebeat.com/technology/metas-new-muse-wonder-and-muse-wonder-full-models-achieve-frontier-performance-but-only-the-weaker-one-is-available-via-api)
- [EU's AI rules face first enforcement test over lab incidents (Euronews)](https://www.euronews.com/2026/10/14/eus-ai-rules-face-first-enforcement-test-over-lab-incidents)
- [Microsoft October 2026 Patch Tuesday fixes 1,411 flaws, 3 zero-days (BleepingComputer)](https://www.bleepingcomputer.com/news/microsoft/microsoft-october-2026-patch-tuesday-fixes-1-411-flaws-3-zero-days/)
- [Stock Market Today (Oct. 16, 2026): AI 'bubble' worries mount (TheStreet)](https://www.thestreet.com/stock-market-today/stock-market-today-dow-jones-sp-500-nasdaq-updates-oct-16-2026)
