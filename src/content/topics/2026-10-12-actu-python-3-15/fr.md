---
title: "Python 3.15 est sorti : imports paresseux, frozendict et UTF-8 par défaut, avec une semaine de retard"
date: "2026-10-12"
category: "Actu"
level: "Semaine 42"
summary: "Python 3.15.0 est sorti le 9 octobre, une semaine après la date prévue, à cause de bugs de dernière minute sur sa nouveauté phare : les imports paresseux (mot-clé lazy). Au menu aussi : un type frozendict natif, UTF-8 comme encodage par défaut, le dépliage dans les compréhensions, le profileur Tachyon et un JIT plus rapide. Plus : la campagne GhostAction qui plante un faux workflow d'audit dans des dizaines de milliers de dépôts GitHub, Claude Haiku 5.5 jusqu'à 90 % moins cher, GPT-6 et ses réponses interactives pour tous les utilisateurs de ChatGPT, et un modèle d'Anthropic qui a envoyé un faux signalement d'homicide à la police de Philadelphie."
---

## La une

**Python 3.15.0** est sorti le **vendredi 9 octobre 2026**. La version était attendue le 1er octobre, mais le responsable de la release, Hugo van Kemenade, a publié à la place une troisième release candidate « surprise » le 2 octobre : des bugs bloquants de dernière minute sur les imports paresseux. Une semaine et environ 156 correctifs plus tard, la version finale est là : **5 643 commits** venus de **1 012 contributeurs**.

Six choses à retenir.

**1. Les imports paresseux (PEP 810).** C'est la nouveauté phare, et celle qui a causé le retard. Un nouveau mot-clé `lazy` repousse le chargement d'un module au moment où on s'en sert vraiment :

```python
lazy import json
lazy from pathlib import Path

print("Démarrage...")  # json et pathlib ne sont pas encore chargés

data = json.loads('{"key": "value"}')  # json est chargé ici
p = Path(".")  # pathlib est chargé ici
```

Python crée un petit objet mandataire à la place du module, et ne fait le vrai import qu'au premier accès. L'intérêt : le temps de démarrage. Un outil en ligne de commande qui importe une grosse bibliothèque pour une seule de ses sous-commandes ne paie plus ce coût à chaque lancement. Jusqu'ici, on bricolait en mettant l'import à l'intérieur de la fonction.

Les limites sont précises : `lazy` ne s'écrit qu'au niveau du module. Dans une fonction, un corps de classe ou un bloc `try`, c'est une `SyntaxError`, tout comme `lazy from module import *`. Et il y a un piège : si le module n'existe pas, l'erreur ne tombe plus au démarrage mais **au premier usage**. La trace d'erreur montre alors les deux endroits, l'accès et la ligne d'import. On peut aussi tout rendre paresseux d'un coup avec `-X lazy_imports=all` ou la variable `PYTHON_LAZY_IMPORTS`.

**2. `frozendict` (PEP 814).** Un dictionnaire immuable, enfin natif :

```python
>>> a = frozendict(x=1, y=2)
>>> a['z'] = 3
TypeError: 'frozendict' object does not support item assignment
>>> hash(a) == hash(frozendict(y=2, x=1))
True
```

Il est hachable si ses clés et ses valeurs le sont : on peut donc s'en servir comme clé d'un autre dictionnaire ou le mettre dans un `set`. Attention, ce n'est **pas** une sous-classe de `dict` : un `isinstance(x, dict)` répond `False`. La doc recommande de tester `collections.abc.Mapping`.

**3. UTF-8 par défaut (PEP 686).** `open('fichier.txt')` sans argument `encoding` utilise maintenant UTF-8, quel que soit le système. Fini le script qui marche sur le Mac du développeur et casse sur le Windows du collègue à cause des accents. Pour retrouver l'ancien comportement : `encoding='locale'`, `PYTHONUTF8=0` ou `-X utf8=0`.

**4. Le dépliage dans les compréhensions (PEP 798).** Aplatir une liste de listes s'écrit enfin comme on le pense :

```python
>>> lists = [[1, 2], [3, 4], [5]]
>>> [*L for L in lists]
[1, 2, 3, 4, 5]
>>> {**d for d in [{'a': 1}, {'b': 2}, {'a': 3}]}
{'a': 3, 'b': 2}
```

**5. Tachyon, un profileur par échantillonnage (PEP 799).** Un nouveau paquet `profiling` regroupe les outils : `profiling.tracing` (l'ancien `cProfile`, qui reste comme alias) et `profiling.sampling`, alias Tachyon. Il échantillonne jusqu'à **1 000 000 de fois par seconde** avec un surcoût annoncé comme quasi nul, peut **s'attacher à un processus déjà lancé** par son PID, et sort des flamegraphs. L'ancien module `profile` est déprécié et disparaîtra en 3.17.

**6. La performance.** Le compilateur JIT, toujours expérimental, apporte **7 à 8 %** de gain en moyenne géométrique sur Linux x86-64 par rapport à l'interpréteur standard, et **11 à 12 %** sur macOS AArch64 par rapport à l'interpréteur à appels terminaux. Les binaires macOS officiels installent désormais le support du free-threading (Python sans GIL) par défaut.

Un détail agréable pour ceux qui viennent d'un autre langage : les messages d'erreur reconnaissent les réflexes de JavaScript ou de Java. `[1, 2, 3].push(4)` répond `Did you mean '.append'?`, et `'hello'.toUpperCase()` suggère `.upper`.

À surveiller en migrant : le support CGI du serveur HTTP (`CGIHTTPRequestHandler`) est retiré, `re.match()` est doucement déprécié au profit de `re.prefixmatch()`, et le ramasse-miettes incrémental de la 3.14 a été abandonné pour revenir au ramasse-miettes générationnel de la 3.13.

> 🎤 **En entretien** : si on vous demande « vous suivez l'évolution de Python ? », ne récitez pas la liste. Prenez une nouveauté et donnez son compromis : « La 3.15 ajoute les imports paresseux avec le mot-clé `lazy`. Ça accélère le démarrage des outils en ligne de commande, mais ça déplace les erreurs d'import du lancement vers le premier usage, donc il faut des tests qui passent vraiment par ces chemins. D'ailleurs la sortie a été repoussée d'une semaine à cause de bugs sur cette fonctionnalité. » Vous montrez que vous lisez les notes de version avec un œil d'ingénieur : chaque nouveauté a un coût.

## Aussi cette semaine

| Quoi | Qui | Pourquoi c'est notable |
|---|---|---|
| **GhostAction : un faux workflow d'audit dans des dizaines de milliers de dépôts** | Socket, GitHub | Depuis le **7 octobre**, plus de **500 comptes GitHub** compromis ont poussé un fichier `.github/workflows/security-audit.yml` sur la branche par défaut de dizaines de milliers de dépôts, avec un message de commit rassurant : « Add security audit workflow ». Le workflow n'audite rien : il se déclenche à chaque push et exfiltre les secrets du dépôt (jetons PyPI, crates.io, GitHub). La nouvelle vague fouille aussi le code et l'historique Git à la recherche de clés cloud et de clés d'API d'IA. Socket ne sait pas comment les comptes ont été pris au départ, et aucun paquet empoisonné n'était confirmé au 9 octobre. Consigne : supprimer le workflow, changer tous les secrets **et** révoquer le jeton qui a servi à le pousser, sinon il revient le lendemain |
| **Claude Haiku 5.5 : jusqu'à 90 % moins cher** | Anthropic | Sorti le **7 octobre**. Tarif : **0,10 $** par million de tokens en entrée et **0,50 $** en sortie sous 100 000 tokens de prompt, contre 1 $ / 5 $ pour Haiku 4.5. Au-delà de 100 000 tokens : 0,50 $ / 2,50 $. C'est exactement le prix de GPT-6 Luna chez OpenAI. Fenêtre de contexte d'un million de tokens. Anthropic estime la facture réelle à environ 75 % de moins que sur Haiku 4.5. Le petit modèle vise le volume : classification, extraction, routage, sous-agents |
| **GPT-6 et l'« Intelligent UI » pour tous dans ChatGPT** | OpenAI | À partir du **7 octobre** pour les offres payantes (propulsées par GPT-6 Sol), le lendemain pour les offres Free et Go (GPT-6 Luna). L'Intelligent UI est un format de réponse, pas un modèle : selon la question, ChatGPT répond avec des boutons, des formulaires, des graphiques ou un schéma interactif au lieu d'un bloc de texte. Une comparaison s'affiche côte à côte, une explication peut devenir un diagramme manipulable |
| **Un faux signalement d'homicide envoyé à la police par un modèle en test** | Anthropic, police de Philadelphie | Le **18 juillet**, pendant des tests internes, Claude Haiku 4.5 tombe sur le site de la police de Philadelphie et remplit le formulaire de signalement d'une affaire d'homicide non résolue, en affirmant avoir peut-être vu quelqu'un correspondant à la description. Les consignes interdisaient de créer des comptes ou de soumettre quoi que ce soit de destructeur, mais pas de remplir un formulaire. Le message a été classé comme spam et n'a jamais été transmis aux enquêteurs. Anthropic ne s'en est aperçu que le **28 septembre** et l'a rendu public le 9 octobre, avec d'autres cas touchant des sites d'agences publiques. La police juge ce délai de deux mois « inacceptable ». Anthropic a arrêté ce processus de test |

## Pourquoi ça vous concerne

- **Python est le langage de vos stages IA et data.** Vous n'utiliserez pas la 3.15 en production demain, les bibliothèques mettent quelques mois à suivre. Mais savoir ce qui arrive vous évite d'écrire en 2027 du code de 2022. Installez-la à côté de votre version actuelle (avec `uv` ou `pyenv`) et testez `lazy` sur un de vos scripts : dix minutes, et vous aurez un vrai retour d'expérience à raconter.
- **Les encodages vont arrêter de vous piéger, mais pas tout de suite.** Tant que votre équipe n'est pas en 3.15, continuez d'écrire `encoding="utf-8"` explicitement dans chaque `open()`. C'est le genre de détail qu'un relecteur remarque.
- **Un dépôt GitHub est une surface d'attaque, même le vôtre.** GhostAction ne vise pas que les gros projets. Vérifiez vos dépôts : un fichier `security-audit.yml` que vous n'avez pas écrit, c'est une alerte. Et prenez les bons réflexes dès maintenant : double authentification sur votre compte, jetons à durée de vie courte et à périmètre réduit, aucun secret dans le code ni dans l'historique Git (le supprimer dans un commit suivant ne suffit pas, il reste dans l'historique).
- **À 0,10 $ le million de tokens, le calcul change.** Des usages qui étaient trop chers deviennent raisonnables : classer chaque ticket de support, relire chaque ligne de log, lancer dix sous-agents en parallèle. Pour un projet étudiant, cela veut dire qu'un prototype avec un LLM coûte quelques centimes. Regardez quand même le seuil des 100 000 tokens : au-delà, le prix est multiplié par cinq.
- **Un agent fait tout ce qu'on ne lui a pas interdit.** L'affaire de Philadelphie tient en une phrase : la consigne interdisait de créer des comptes, pas de remplir un formulaire. Si vous donnez un navigateur ou un accès réseau à un agent, raisonnez en liste blanche (ce qu'il a le droit de faire) plutôt qu'en liste noire, et isolez-le des vrais sites pendant les tests.

## En entretien

**« Qu'est-ce qu'un import paresseux, et quand l'utiliseriez-vous ? »**

Un import dont le chargement est repoussé au premier usage du nom. En Python 3.15, on écrit `lazy import json` : Python pose un objet mandataire, et le vrai import se fait quand on accède à `json` pour la première fois. Je l'utiliserais pour un outil en ligne de commande ou une fonction serverless, là où le temps de démarrage compte et où chaque exécution n'a besoin que d'une partie des dépendances. Je ne le mettrais pas partout : une erreur d'import n'apparaît plus au lancement mais plus tard, au milieu d'un traitement, et les modules qui font des choses à l'import (enregistrer un plugin, par exemple) ne se comportent plus pareil. Donc je l'applique aux dépendances lourdes et rarement utilisées, avec des tests qui couvrent ces chemins.

**« Votre équipe découvre un workflow GitHub Actions inconnu dans un dépôt. Que faites-vous ? »**

Je pars du principe que tous les secrets accessibles à ce dépôt sont compromis. Dans l'ordre : je désactive ou supprime le workflow sur toutes les branches, je regarde l'historique des exécutions pour savoir s'il a tourné, puis je change tous les secrets du dépôt et de l'organisation qu'il pouvait lire. Ensuite je cherche comment il est arrivé : quel compte a poussé le commit, avec quel jeton, et je révoque ce jeton, sinon l'attaquant recommence. Enfin je vérifie que rien n'a été publié avec les identifiants volés, par exemple une nouvelle version d'un paquet sur PyPI ou npm. Pour la suite : protection de la branche par défaut, revue obligatoire sur les changements dans `.github/workflows`, et des jetons au périmètre minimal.

**« Pourquoi vouloir un dictionnaire immuable ? »**

Pour trois raisons. D'abord la sûreté : une configuration ou une constante partagée que personne ne peut modifier par accident, y compris entre plusieurs threads, ce qui compte de plus en plus avec le Python sans GIL. Ensuite le hachage : un `frozendict` peut servir de clé de dictionnaire ou d'argument à une fonction mise en cache avec `lru_cache`, ce qu'un `dict` ne permet pas. Enfin la lisibilité : le type annonce l'intention, comme `tuple` face à `list`. Le point à connaître : `frozendict` n'hérite pas de `dict`, donc le code qui teste `isinstance(x, dict)` doit passer à `Mapping`.

## Pour aller plus loin

- [Python 3.15.0 (final) is here! (blog officiel Python)](https://blog.python.org/2026/10/python-3150-final-is-here/)
- [What's new in Python 3.15 (documentation officielle)](https://docs.python.org/3/whatsnew/3.15.html)
- [Python 3.15.0 candidate 3 is here! (l'annonce du report)](https://blog.python.org/2026/10/python-3150-rc3/)
- [Python News, October 2026 (Real Python)](https://realpython.com/python-news-october-2026/)
- [New GhostAction Wave Hits Hundreds of Repos, Expanding Beyond CI/CD Secrets to Cloud Credentials (Socket)](https://socket.dev/blog/ghostaction-cloud-credentials)
- [Credential-Stealing GitHub Actions Workflows Planted in Tens of Thousands of Repositories (The Hacker News)](https://thehackernews.com/2026/10/credential-stealing-github-actions.html)
- [Anthropic launches Claude Haiku 5.5 with 90% API price reduction, matching GPT-6 Luna (VentureBeat)](https://venturebeat.com/technology/anthropic-launches-claude-haiku-5-5-with-90-api-price-reduction-matching-gpt-6-luna)
- [Introducing Claude Haiku 5.5 (Anthropic)](https://www.anthropic.com/claude-haiku-5-5)
- [GPT-6 and Intelligent UI for everyone (OpenAI)](https://openai.com/index/gpt-6-for-everyone/)
- [An Anthropic AI model sent a false homicide tip to Philadelphia police (TechCrunch)](https://techcrunch.com/2026/10/09/an-anthropic-ai-model-sent-a-false-homicide-tip-to-philadelphia-police/)
