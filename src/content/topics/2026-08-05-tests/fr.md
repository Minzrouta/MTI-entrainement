---
title: "Tester son code : de l'unitaire au E2E"
date: "2026-08-05"
category: "Qualité"
level: "Fondamental"
summary: "Pyramide de tests, mocks, TDD, couverture : les recruteurs adorent demander « comment testes-tu ton code ? » — voici de quoi répondre avec précision plutôt qu'avec des généralités."
---

## L'essentiel

Les tests automatisés ont un seul but : **détecter les régressions avant les utilisateurs**, et le faire assez vite pour qu'on ose modifier le code. Un code sans tests n'est pas « pas encore testé », il est **impossible à refactorer sereinement** — chaque changement est un pari.

Le modèle mental de référence est la **pyramide de tests** : beaucoup de **tests unitaires** (rapides, isolés, précis), moins de **tests d'intégration** (plusieurs composants ensemble, avec de vraies dépendances), très peu de **tests E2E** (l'application entière pilotée comme un utilisateur). Plus on monte, plus le test est réaliste — et plus il est lent, cher à maintenir et difficile à diagnostiquer quand il échoue. Un test unitaire qui casse pointe la fonction fautive ; un test E2E qui casse dit juste « quelque chose ne va pas quelque part ».

En entretien, on n'attend pas d'un stagiaire qu'il récite Kent Beck, mais qu'il sache dire **quoi tester à quel niveau et pourquoi**.

## Comment ça marche

Un bon test unitaire suit le pattern **AAA** : **Arrange** (préparer les données et l'objet testé), **Act** (appeler la fonction), **Assert** (vérifier le résultat). Trois qualités non négociables :

- **Isolation** : le test ne dépend ni du réseau, ni de la base, ni de l'horloge, ni d'un autre test. Les tests doivent pouvoir tourner en parallèle et dans n'importe quel ordre.
- **Déterminisme** : même code = même résultat, à chaque fois. Les ennemis : `Date.now()`, `Math.random()`, les timeouts, l'ordre d'itération non garanti. On injecte le temps et l'aléa comme des dépendances.
- **Tester le comportement, pas l'implémentation** : on vérifie *ce que fait* la fonction (entrées → sorties, effets observables), pas *comment* elle le fait. Un refactoring interne ne doit pas casser les tests — sinon ils freinent le changement au lieu de le protéger.

Pour isoler, on remplace les dépendances par des **doubles de test** — et le vocabulaire précis fait bonne impression :

- **Stub** : renvoie des réponses préprogrammées (« quand on appelle `getUser`, renvoie ça »). Sert à alimenter le test.
- **Mock** : programmé avec des **attentes sur les interactions** — le test échoue si `sendEmail` n'a pas été appelé avec les bons arguments. Sert à vérifier un effet de bord.
- **Spy** : enregistre les appels reçus (arguments, nombre) sans changer le comportement, pour inspection après coup.
- **Fake** : une vraie implémentation, simplifiée — un repository en mémoire avec une `Map` au lieu de Postgres. Plus robuste que les mocks pour les tests d'un peu plus haut niveau.

Le **TDD (Test-Driven Development)** inverse l'ordre d'écriture : **red** (écrire un test qui échoue), **green** (le code minimal qui le fait passer), **refactor** (nettoyer, les tests au vert). Ce que ça apporte vraiment : on définit le comportement attendu *avant* de coder (ce qui force à clarifier l'API), chaque ligne de code existe pour faire passer un test, et on obtient un filet de sécurité gratuit. Ce que ça n'est pas : une religion — beaucoup d'excellents devs pratiquent un TDD partiel (sur la logique métier complexe, pas sur le code de glue).

## Concepts clés à maîtriser

- **Tests d'intégration avec de vraies dépendances** : mocker un SQL complexe teste surtout votre imagination. **Testcontainers** lance un vrai Postgres (ou Redis, Kafka…) dans un conteneur Docker jetable le temps de la suite : on teste les vraies requêtes, les vraies contraintes, les vraies transactions. Compromis : quelques secondes de démarrage contre un réalisme incomparable.
- **E2E avec Playwright ou Cypress** : le navigateur est piloté comme un utilisateur (remplir le formulaire, cliquer, vérifier la page). Playwright s'est imposé : multi-navigateurs, parallélisation native, **auto-waiting** (il attend que l'élément soit actionnable au lieu d'exiger des `sleep`). Réserver le E2E aux parcours critiques : signup, login, checkout — pas à chaque variation de formulaire.
- **La flakiness E2E** : un test E2E échoue parfois sans qu'aucun code n'ait changé — course entre le test et le rendu, données résiduelles, réseau. Antidotes : attentes explicites sur l'état (jamais de `sleep(2000)`), isolation des données par test, sélecteurs stables (`data-testid` plutôt que le CSS).
- **Couverture de code** : le pourcentage de lignes exécutées par les tests. Utile **en tendance** (la couverture s'effondre = on a arrêté de tester) et pour repérer les zones mortes. Piégeuse **en objectif** : exécuter une ligne n'est pas la vérifier — un test sans assertion produit 100 % de couverture et 0 % de valeur. Loi de Goodhart : quand la couverture devient la cible, on écrit des tests pour couvrir, pas pour vérifier.
- **Tests en CI** : les tests n'existent vraiment que s'ils tournent à chaque push et bloquent le merge en cas d'échec. Unitaires sur chaque commit, intégration sur chaque PR, E2E éventuellement sur main ou en nightly s'ils sont lents.

## En entretien

**« C'est quoi un bon test unitaire ? »** — Rapide (millisecondes), isolé (ni réseau, ni base, ni ordre d'exécution), déterministe, structuré en Arrange-Act-Assert, et qui vérifie un comportement observable — pas les détails d'implémentation. Bonus : un bon test échoue pour une seule raison, et son nom dit laquelle.

**« Mock vs stub ? »** — Le stub *fournit* des données au test (réponses préprogrammées) ; le mock *vérifie* des interactions (le test échoue si la méthode attendue n'est pas appelée correctement). En une phrase : stub = état, mock = comportement. Ajouter fake (implémentation simplifiée mais réelle) et spy (enregistre sans modifier) montre que le vocabulaire est maîtrisé.

**« Tu pratiques le TDD ? Ça apporte quoi ? »** — Réponse honnête : red-green-refactor, pratiqué surtout sur la logique métier non triviale. Apports concrets : l'API se dessine du point de vue de l'appelant, le code est testable par construction, le refactoring est protégé. Dire qu'on ne l'applique pas mécaniquement partout (code de glue, prototypes) est un plus, pas un aveu.

**« Comment tester du code qui parle à une base de données ? »** — Deux niveaux : la logique métier en unitaire avec un fake du repository ; les requêtes réelles en intégration contre un vrai Postgres lancé par Testcontainers. Mocker le driver SQL est le piège : le test passe, la requête est fausse.

**« 100 % de couverture, c'est un bon objectif ? »** — Non : la couverture mesure ce qui est *exécuté*, pas ce qui est *vérifié*. Viser 100 % pousse à tester du code trivial et à écrire des tests sans assertions. Mieux : une couverture élevée sur la logique métier critique, surveillée en tendance, et des mutations testing si on veut vraiment mesurer la qualité des assertions.

## Pièges & idées reçues

- **L'abus de mocks** : quand un test mocke cinq dépendances et vérifie chaque appel interne, il ne teste plus le comportement mais recopie l'implémentation — le moindre refactoring casse dix tests qui étaient tous verts pour de mauvaises raisons. Préférer les fakes et tester des unités un peu plus grosses.
- **Tester l'implémentation** : vérifier qu'une méthode privée est appelée, asserter sur l'état interne… Ces tests gênent le refactoring qu'ils étaient censés permettre.
- **Le `sleep()` dans les tests E2E** : la cause n°1 de flakiness. Toujours attendre une condition (élément visible, requête terminée), jamais une durée.
- **« Les tests ralentissent le développement »** — vrai la première semaine, faux dès le premier refactoring ou le premier bug de régression évité. Le coût réel, c'est la maintenance de *mauvais* tests (couplés à l'implémentation, flaky).
- **La pyramide inversée** (le « cornet de glace ») : une suite dominée par des E2E lents et fragiles avec peu d'unitaires — feedback en 40 minutes, échecs inexploitables. Symptôme classique d'un code non testable unitairement.

## Pour aller plus loin

- [Martin Fowler — The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html) : l'article de référence, exemples inclus
- [Playwright — documentation](https://playwright.dev/docs/intro) et [Testcontainers](https://testcontainers.com/) pour les tests d'intégration réalistes
- [Vitest](https://vitest.dev/guide/) ou [pytest](https://docs.pytest.org/) selon votre stack : lire au moins la page sur les fixtures
- Exercice : reprendre un de vos projets, écrire les tests unitaires de la logique métier centrale puis un test d'intégration avec Testcontainers — et regarder combien de bugs remontent
