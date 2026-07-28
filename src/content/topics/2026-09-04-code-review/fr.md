---
title: "La code review : donner et recevoir"
date: "2026-09-04"
category: "Qualité"
level: "Fondamental"
summary: "Reviewer une PR et encaisser des commentaires sans le prendre personnellement : la compétence d'équipe que les recruteurs sondent systématiquement en entretien de stage."
---

## L'essentiel

La code review est la relecture d'un changement de code par au moins un autre développeur avant son merge. Premier réflexe à corriger avant l'entretien : la review ne sert pas d'abord à « trouver des bugs ». Elle en attrape, mais sa vraie valeur est ailleurs :

- **Partage de connaissance** — le reviewer découvre une partie du code qu'il n'a pas écrite, l'auteur reçoit du contexte qu'il n'avait pas. C'est l'assurance contre le *bus factor* : personne ne doit être le seul à comprendre un module.
- **Cohérence du codebase** — mêmes patterns, mêmes conventions d'architecture, mêmes façons de gérer les erreurs. Dix développeurs, un seul style de projet.
- **Qualité de conception** — une deuxième paire d'yeux voit l'API maladroite, le cas limite oublié, le test manquant, le problème de sécurité.

Et ce à quoi elle ne sert **pas** : le style. Indentation, guillemets, ordre des imports — les linters et formatters (ESLint, Prettier, Black, clang-format) font ça automatiquement en CI. Un humain qui commente une virgule gaspille le temps de deux personnes ; en entretien, dire « le style, c'est le travail du linter, pas du reviewer » marque immédiatement des points.

La qualité d'une review se joue dans la qualité de ses commentaires :

| Mauvais commentaire | Bon commentaire |
|---|---|
| « C'est faux. » | « blocking: `parseInt(s)` sans radix parse `"08"` comme octal sur les vieux runtimes — ajouter `, 10`. » |
| « Pourquoi tu as fait ça ?? » | « question: quel cas d'usage couvre ce fallback ? Je ne le vois pas testé. » |
| « Renomme ta variable. » | « nit: `data` → `invoices` dirait ce que contient le tableau. Non bloquant. » |
| « Moi j'aurais fait une Map. » | « suggestion: une `Map` éviterait le lookup O(n) dans la boucle — à mesurer si la liste grossit. » |

La différence tient en un mot : **actionnable**. Le bon commentaire dit ce qui pose problème, pourquoi, et ce qui débloquerait la situation.

## Comment ça marche

Le cycle de vie d'une PR tient dans un schéma — noter que la boucle de re-review est la partie coûteuse, celle que les petites PR raccourcissent :

```text
code ─▶ auto-review ─▶ PR ─▶ review ─▶ approve ─▶ merge
                             ▲  │
                   re-review │  │ changes requested
                             │  ▼
                      push des correctifs
```

**Côté reviewer**, la méthode en trois temps :

1. **Comprendre l'intention d'abord.** Lire le titre, la description, le ticket lié — *avant* la première ligne de diff. Reviewer du code sans savoir ce qu'il essaie d'accomplir, c'est corriger une dictée sans connaître le sujet.
2. **Du général au particulier.** L'approche est-elle la bonne ? Le changement est-il au bon endroit ? Seulement ensuite : la logique ligne à ligne, les cas limites, les tests. Un « cette approche ne tiendra pas la charge » vaut plus que vingt remarques de détail sur un code qui sera réécrit.
3. **Commenter en distinguant deux niveaux.** Ce qui **bloque** le merge (bug, faille, données perdues, incohérence d'architecture) et ce qui n'est qu'une **suggestion** ou une préférence. Tout mettre au même niveau noie les vrais problèmes et épuise l'auteur.

Et une règle de ton : **des questions plutôt que des ordres**. « Que se passe-t-il si `items` est vide ? » ouvre une discussion ; « gère le tableau vide » présuppose que le reviewer a raison — or il n'a pas tout le contexte. La question laisse la porte ouverte à « c'est garanti non vide par la validation en amont », réponse qui clôt le sujet en dix secondes.

Les **conventional comments** (conventionalcomments.org) formalisent ce double niveau avec un préfixe par commentaire : `blocking:` (à résoudre avant merge), `question:` (besoin d'une réponse, pas forcément d'un changement), `suggestion:` (amélioration proposée), `nit:` (détail mineur, jamais bloquant), `praise:` (souligner ce qui est bien fait — oui, ça se fait, et ça change l'ambiance d'une review). Le préfixe supprime toute ambiguïté : l'auteur sait instantanément ce qui l'empêche de merger.

Un extrait de review annoté avec ces commentaires types :

```diff
# PR « Validation de l'email à l'inscription » — extrait
# annoté avec les commentaires du reviewer

- if (email.includes("@")) {
+ if (EMAIL_REGEX.test(email)) {
    await createUser(email);
  }
# blocking: EMAIL_REGEX n'est importé nulle part, la CI
# est rouge — la PR ne peut pas partir en l'état.

+ console.log("created: " + email);
# blocking: on logge une donnée personnelle en clair.
# Peut-on logger l'id utilisateur plutôt que l'email ?

+ const t = Date.now();
# question: à quoi sert ce timestamp ? Je ne le vois
# utilisé nulle part — un reste de debug ?

- function create_user(email) {
+ async function createUser(email) {
# nit: renommage bienvenu mais hors sujet de la PR —
# une PR séparée la prochaine fois ? Non bloquant.
```

## Concepts clés à maîtriser

- **Petites PR.** La qualité d'une review s'effondre avec la taille du diff : au-delà de quelques centaines de lignes, le reviewer survole et approuve — c'est l'effet « LGTM » (*looks good to me*). Une grosse feature se découpe en PR successives : d'abord le modèle de données, puis la logique, puis l'UI.
- **Auto-review avant de soumettre.** Relire son propre diff dans l'interface de PR, comme si on était le reviewer : on y attrape le `console.log` oublié, le fichier commité par erreur, le commentaire mort. Compléter avec une description qui donne le contexte (quoi, pourquoi, comment tester). Chaque minute d'auto-review économise un aller-retour de review — soit des heures de latence.
- **Bloquant vs non-bloquant.** Un reviewer qui bloque une PR pour un nommage impose sa préférence ; un reviewer qui laisse passer une injection SQL pour ne pas froisser ne fait pas son travail. Savoir classer chaque remarque dans la bonne catégorie est *la* compétence de review.
- **Recevoir une review.** Trois règles : ce n'est **pas personnel** (on review le code, pas la personne — et le code, dans trois mois, ne sera plus « le vôtre » mais celui de l'équipe) ; **répondre à tout** (chaque commentaire reçoit un fix, une réponse ou un ticket — jamais un silence) ; **le désaccord s'argumente** (« je garde cette approche parce que X » est légitime, appliquer en silence un changement qu'on juge mauvais ne l'est pas).
- **Le standard de merge.** La règle du guide Google : on approuve dès que le changement **améliore la santé globale du code**, même s'il n'est pas parfait. Exiger la perfection paralyse l'équipe ; le « moi j'aurais fait autrement » n'est pas un motif de blocage si l'approche de l'auteur fonctionne et reste cohérente.

> 💡 **La PR de 200 lignes max** — c'est l'ordre de grandeur à retenir (les études classiques de SmartBear situent le décrochage d'attention vers 400 lignes ; viser 200 garde de la marge). Une PR de 200 lignes est relue en profondeur en vingt minutes ; une PR de 2000 lignes reçoit un « LGTM » en trois. Petite PR = review meilleure, feedback plus rapide, conflits de merge réduits, revert facile.

> 🎤 **En entretien** — « comment réagis-tu à une review négative ? » est une question piège classique : le recruteur teste l'ego, pas la technique. La réponse attendue : je dissocie le code de ma personne, je lis tous les commentaires avant de répondre, je corrige ce qui est fondé, et quand je ne suis pas d'accord je le dis **avec des arguments** — un désaccord technique argumenté est une marque de maturité, pas d'arrogance. Bonus : mentionner qu'une review dense signifie que le reviewer a pris le temps de lire, et que c'est préférable à un LGTM distrait.

## En entretien

**« À quoi sert une code review ? »** — Trois choses : partager la connaissance (personne n'est le seul à connaître un module), garantir la cohérence du codebase, et améliorer la conception via une deuxième paire d'yeux. Préciser ce qu'elle ne fait pas : le style, automatisé par les linters en CI. Réduire la review à « chercher des bugs » est la réponse faible.

**« Comment écris-tu un bon commentaire de review ? »** — Actionnable : ce qui pose problème, pourquoi, et une piste de sortie. Sous forme de question quand je n'ai pas tout le contexte. Étiqueté par gravité — `blocking:` vs `nit:` — pour que l'auteur sache ce qui empêche le merge. Et jamais sur le style : le linter s'en charge.

**« Un reviewer te demande un changement que tu trouves injustifié, tu fais quoi ? »** — Je réponds au commentaire avec mes arguments (contrainte, mesure, contexte qu'il n'a pas). S'il maintient avec de bonnes raisons, j'applique ; si le désaccord persiste sur un point non bloquant, la convention d'équipe ou l'avis d'un tiers tranche. Ce que je ne fais jamais : ignorer le commentaire, ou appliquer en silence en pensant que c'est faux.

**« Quelle taille idéale pour une PR et pourquoi ? »** — L'ordre de grandeur : 200 lignes, quelques centaines maximum. Au-delà, l'attention du reviewer décroche et la review devient un survol. Une grosse feature se découpe en PR empilées, chacune relisible en une session.

**« Que fais-tu avant de soumettre une PR ? »** — Une auto-review du diff complet dans l'interface, comme si j'étais le reviewer : debug oublié, fichiers parasites, code mort. Puis une description avec le contexte, le lien vers le ticket et comment tester. Une PR qui arrive propre économise un aller-retour complet de review.

## Pièges & idées reçues

> ⚠️ **L'effet LGTM** — le piège le plus courant en équipe : les grosses PR et les reviews « pour la forme » s'auto-renforcent. Plus la PR est grosse, moins elle est vraiment lue, plus les approbations deviennent des tampons — et plus la review perd sa crédibilité, donc son utilité. La discipline des petites PR n'est pas du confort : c'est ce qui maintient la review vivante.

- **« La review sert à vérifier le style »** — non : linters et formatters le font en CI, sans fatigue ni débat. Si votre équipe débat des guillemets en review, il manque un outil, pas de la rigueur.
- **« Un commentaire de review est un ordre »** — non : c'est le début d'une conversation. L'auteur peut répondre, argumenter, refuser avec de bonnes raisons. Seuls les `blocking:` conditionnent le merge.
- **« Une review sévère = le reviewer me juge »** — la review porte sur le code, jamais sur la personne. Symétriquement, côté reviewer : bannir le « tu » accusateur (« tu as oublié… ») au profit du code (« ce chemin ne gère pas le cas vide »).
- **Laisser des commentaires sans réponse** — merger en ignorant des remarques détruit la confiance. Chaque commentaire mérite un fix, une réponse, ou un ticket de suivi explicite.
- **Exiger la perfection** — le standard, c'est « mieux qu'avant », pas « parfait ». Bloquer une PR fonctionnelle pour des préférences personnelles est un abus de review.

## Pour aller plus loin

- [Conventional Comments](https://conventionalcomments.org/) — le format `label: sujet` (`nit:`, `question:`, `blocking:`…) prêt à adopter dès votre prochain stage
- [Google Engineering Practices — Code Review Developer Guide](https://google.github.io/eng-practices/review/) — les deux volets, reviewer et auteur ; la référence du « standard de merge »
- [How to Do Code Reviews Like a Human (Michael Lynch)](https://mtlynch.io/human-code-reviews-1/) — le versant humain : formulation, ton, ego
- Exercice concret : ouvrez une PR mergée d'un projet open source connu et lisez le fil de review — vous verrez les conventions en pratique, désaccords compris
