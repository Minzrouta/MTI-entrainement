---
title: "Debugger méthodiquement"
date: "2026-09-18"
category: "Qualité"
level: "Fondamental"
summary: "Reproduire, réduire, formuler une hypothèse, tester une variable à la fois : la méthode scientifique appliquée aux bugs — et comment raconter votre pire bug en entretien sans partir dans tous les sens."
---

## L'essentiel

Debugger n'est pas une affaire de talent ou de chance : c'est une **méthode scientifique** appliquée au code. Le débutant modifie des lignes au hasard jusqu'à ce que « ça marche » ; le développeur méthodique **reproduit** le bug de façon fiable, **réduit** le cas au minimum, formule **une hypothèse falsifiable**, puis mène **une expérience en ne changeant qu'une variable à la fois**. La différence entre les deux se voit en cinq minutes de pair programming — et les recruteurs le savent : « raconte-moi ton bug le plus difficile » est l'une des questions comportementales les plus fréquentes en entretien de stage.

L'étape zéro, avant toute méthode : **lire vraiment le message d'erreur**. En entier. Une proportion déprimante de bugs est littéralement expliquée dans le message que l'on a scrollé sans lire.

| Symptôme | Premier réflexe |
|---|---|
| Exception + stack trace | Lire le message **en entier**, trouver la première frame dans *votre* code |
| « Ça marchait hier » | Régression → `git log` des derniers commits, puis `git bisect` |
| Marche en local, casse en prod | Diff des environnements : versions, variables d'env, config, données |
| Bug intermittent | Suspecter concurrence / timing / données non déterministes ; logger, ne pas « réessayer » |
| Comportement « impossible » | Vérifier que vous exécutez bien le code que vous croyez (build stale, cache, mauvais serveur, mauvaise branche) |

## Comment ça marche

La boucle complète tient dans un encadré :

```text
┌──────────────────────────────────────────────┐
│ 1. reproduire  (de façon fiable, à volonté)  │
│ 2. réduire     (cas minimal, par dichotomie) │
│ 3. hypothèse   (une seule, falsifiable)      │
│ 4. expérience  (UNE variable à la fois)      │
│      ├─ confirmée → corriger + test          │
│      └─ réfutée   → retour en 3              │
└──────────────────────────────────────────────┘
```

- **Reproduire d'abord.** Un bug qu'on ne sait pas reproduire est un bug qu'on ne saura pas vérifier corrigé. Noter les étapes exactes, les données, l'environnement.
- **Réduire ensuite.** Supprimer la moitié du code, la moitié des données d'entrée : le bug persiste ? Continuer dans cette moitié. C'est une **dichotomie**, comme une recherche binaire — on passe de « 3 000 lignes suspectes » à 10 en quelques itérations.
- **Une variable à la fois.** Si vous changez deux choses et que le bug disparaît, vous ne savez pas laquelle était la cause — et vous avez peut-être introduit un second bug qui masque le premier. Chaque expérience doit pouvoir *réfuter* l'hypothèse.
- **Corriger, puis verrouiller** : un test de non-régression qui échoue sans le fix et passe avec. Sinon le bug reviendra, et personne ne s'en apercevra avant la prod.

Pour les régressions (« ça marchait avant »), la dichotomie a un outil dédié : **`git bisect`**, qui fait une recherche binaire dans l'historique. 1 000 commits suspects = ~10 étapes, pas 1 000.

```bash
# La feature marchait en v2.3.0, cassée sur main : régression.
git bisect start
git bisect bad                 # HEAD est cassé
git bisect good v2.3.0         # ce tag marchait
# → git checkout un commit à mi-chemin ; on teste :
npm test
git bisect good                # ou "bad" selon le résultat
# ... ~log2(N) itérations, puis :
# "abc1234 is the first bad commit"

# Version automatisée : exit code 0 = good, autre = bad
git bisect run npm test
git bisect reset               # revenir où on était
```

> 💡 **Le bug est dans TON code** — statistiquement, le compilateur, le framework et la lib à 40 millions de téléchargements hebdomadaires ne sont pas cassés. « J'ai trouvé un bug dans React » est possible, mais c'est l'hypothèse à tester *en dernier*, après avoir éliminé tout votre code. Ce réflexe d'humilité fait gagner des heures — et il s'entend très bien en entretien.

## Concepts clés à maîtriser

- **Lire une stack trace** : identifier le message (le *quoi*), puis descendre jusqu'à la **première frame qui appartient à votre code** (le *où*). Les frames du framework autour sont du contexte, pas des suspects. Attention : certaines stacks listent l'appel le plus profond en haut (Python : en bas).
- **Debugger vs printf** : un debugger permet de **poser un breakpoint** (y compris conditionnel : `i == 4217`), d'**inspecter tout l'état** sans redéployer, de **step over/into** ligne par ligne et de poser des **watch** sur des expressions. Le `printf`/`console.log` garde deux avantages : il capture une **chronologie** (précieux pour l'asynchrone) et il marche en prod — les logs sont le debugger de la production. Les deux sont des outils légitimes ; savoir dire *quand* utiliser lequel est le vrai signal senior.
- **Heisenbugs** : un bug qui disparaît sous debugger ou dès qu'on ajoute un `print` est presque toujours un problème de **timing** — race condition, deadlock évité par le ralentissement, mémoire non initialisée. Le debugger *modifie l'expérience* : il fige les threads, change l'ordonnancement. Réflexe : logging léger + horodaté, thread sanitizer, relire les sections critiques.
- **Rubber duck debugging** : expliquer le problème à voix haute, ligne par ligne, à un canard en plastique (ou un collègue silencieux). Ça marche parce que verbaliser force à **vérifier chaque hypothèse implicite** — et c'est en général l'une d'elles qui est fausse. La moitié des questions posées à un senior se résolvent pendant qu'on les formule.
- **Poser une bonne question** : un **cas minimal reproductible** (le code le plus court qui montre le bug), ce que vous **attendiez**, ce qui **se passe**, ce que vous avez **déjà essayé**, versions et environnement. Construire ce cas minimal résout le problème une fois sur deux ; les autres fois, vous obtenez une réponse en minutes au lieu de jours.

> ⚠️ **Le shotgun debugging** — modifier des lignes au hasard jusqu'à ce que le symptôme disparaisse. Même quand « ça marche », vous n'avez rien appris, vous avez probablement masqué la cause racine, et le bug reviendra sous une autre forme. Un fix dont on ne peut pas expliquer *pourquoi* il fonctionne n'est pas un fix.

## En entretien

**« Raconte-moi le bug le plus difficile que tu aies résolu. »** — Structurez : ① contexte en une phrase, ② symptôme observable, ③ démarche (hypothèses successives, outils utilisés, fausses pistes assumées), ④ cause racine, ⑤ fix + ce que vous avez mis en place pour qu'il ne revienne pas. Le recruteur évalue votre **méthode**, pas la difficulté du bug — un bug simple raconté avec une démarche limpide vaut mieux qu'un bug épique raconté en vrac.

**« Un bug apparaît en prod mais pas en local, tu commences par quoi ? »** — Par les **différences** : versions (runtime, dépendances), variables d'environnement, config, données réelles vs données de test, charge/concurrence. Puis les **logs de prod** autour de l'incident. Le bug vit forcément dans un des deltas.

**« C'est quoi `git bisect` ? »** — Une recherche binaire dans l'historique Git pour trouver le commit qui a introduit une régression : on donne un commit `good` et un commit `bad`, Git checkout le milieu, on teste, on répond `good`/`bad`, et on converge en O(log n). Bonus : `git bisect run <cmd>` automatise tout si un test reproduit le bug.

**« Debugger ou console.log ? »** — Les deux, selon le contexte : debugger pour explorer un état complexe à un instant T (breakpoints conditionnels, watch, step) ; logs pour les chronologies asynchrones, les bugs intermittents et la prod. Répondre « uniquement l'un des deux » est un drapeau rouge.

**« Un bug disparaît quand tu ajoutes un print, qu'est-ce que ça t'évoque ? »** — Une **race condition** (ou un problème de timing) : le print ralentit le thread et change l'ordonnancement. C'est un indice, pas une solution — le bug est toujours là, il attend la prod.

## Pièges & idées reçues

- **Corriger le symptôme, pas la cause** : attraper l'exception et continuer, ajouter un `if null` sans comprendre pourquoi c'est null. Le bug se déplace, il ne disparaît pas.
- **« Impossible, ce code n'a pas changé »** — mais l'environnement, les données, une dépendance ou l'horloge ont changé. Un code inchangé dans un monde qui change peut casser.
- **Googler le nom générique de l'exception** (`NullPointerException`) au lieu de *votre* message complet avec son contexte. Le message précis est votre meilleure requête.
- **S'acharner seul pendant des heures** : au-delà de 30-45 minutes sans progrès, canard en plastique, pause, ou question bien posée à un humain. La ténacité, c'est de la méthode, pas de l'isolement.
- **Ne pas écrire le test de non-régression** après le fix : le même bug reviendra au prochain refactor, et il aura coûté deux fois.

> 🎤 **En entretien** — préparez *à l'avance* deux histoires de bugs (une technique, une « détective ») en suivant la structure symptôme → démarche → cause → fix → prévention. C'est une question quasi certaine, et l'improvisation se voit. Mentionner une fausse piste assumée (« j'ai d'abord cru à X, l'expérience l'a réfuté ») rend le récit crédible et montre la méthode.

## Pour aller plus loin

- [A debugging manifesto — Julia Evans](https://jvns.ca/blog/2022/12/08/a-debugging-manifesto/) et sa zine [The Pocket Guide to Debugging](https://wizardzines.com/zines/debugging-guide/)
- [git bisect — documentation officielle](https://git-scm.com/docs/git-bisect), avec la section `bisect run`
- [How to ask — Stack Overflow](https://stackoverflow.com/help/how-to-ask) et [Minimal reproducible example](https://stackoverflow.com/help/minimal-reproducible-example) : la checklist d'une bonne question
- *Debugging: The 9 Indispensable Rules* — David J. Agans : court, ancien, toujours juste
