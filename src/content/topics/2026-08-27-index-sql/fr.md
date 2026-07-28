---
title: "Index, modélisation & optimisation SQL"
date: "2026-08-27"
category: "Data"
level: "Intermédiaire"
summary: "B-tree, EXPLAIN, index composites et formes normales : savoir répondre posément à « cette requête est lente, tu fais quoi ? » — la question data qui départage les candidats."
---

## L'essentiel

Une base sans index lit ses tables comme on lirait un annuaire page par page : c'est le **sequential scan**, O(n). Un index est une **structure de données auxiliaire** — presque toujours un **B-tree** — que la base maintient à côté de la table pour localiser les lignes en **O(log n)**. C'est la différence entre une requête à 400 ms et la même à 0,1 ms.

Mais rien n'est gratuit : chaque `INSERT`, `UPDATE` ou `DELETE` doit mettre à jour **tous** les index de la table, et chacun consomme du disque et du cache. Optimiser, c'est arbitrer lecture contre écriture — et la **modélisation** (normalisation, dénormalisation) fixe en amont la forme des tables sur lesquelles cet arbitrage se joue.

> 💡 **La règle qui cadre tout** — on indexe ce que les requêtes **réelles** filtrent (`WHERE`), joignent (`JOIN … ON`) ou trient (`ORDER BY`). Jamais « toutes les colonnes au cas où » : un index inutilisé est une taxe pure sur les écritures.

## Comment ça marche

Le B-tree (« balanced tree ») est l'index par défaut de PostgreSQL comme de MySQL/InnoDB. Ses nœuds sont **larges** : une page de 8 Ko contient des centaines de clés, donc l'arbre est très plat — hauteur 3 ou 4 même pour des millions de lignes. Chercher une valeur, c'est descendre 3-4 nœuds : voilà le log n. Les feuilles sont **triées et chaînées** entre elles, ce qui sert aussi les ranges (`BETWEEN`, `>`) et les `ORDER BY`.

```text
              [ racine ]              hauteur 3-4,
             /    |     \             même pour des
      [int.]   [int.]   [int.]        millions de
      /  |  \    ...      ...         lignes
[feuille][feuille][feuille]
    │        │        │
    └── pointeurs vers les lignes (heap)
feuilles triées et chaînées → ranges efficaces
```

Pour voir ce que fait vraiment la base : `EXPLAIN` affiche le **plan estimé**, `EXPLAIN ANALYZE` **exécute** la requête et donne les temps réels.

```sql
-- Table orders : 5 M de lignes, pas d'index sur customer_id
EXPLAIN ANALYZE
SELECT * FROM orders WHERE customer_id = 4242;

-- AVANT : la table est lue en entier
-- Seq Scan on orders  (cost=0.00..93241.00 rows=48 ...)
--   Filter: (customer_id = 4242)
--   Rows Removed by Filter: 4999952   ← 5 M lues pour 48 gardées
-- Execution Time: 412.33 ms

CREATE INDEX idx_orders_customer ON orders (customer_id);

-- APRÈS : le B-tree cible directement les bonnes pages
-- Index Scan using idx_orders_customer on orders
--   (cost=0.43..12.15 rows=48 ...)
--   Index Cond: (customer_id = 4242)
-- Execution Time: 0.09 ms             ← ~4500× plus rapide
```

À repérer dans un plan : le type de scan (`Seq Scan` vs `Index Scan` vs `Index Only Scan`), l'écart entre `rows` estimées et réelles (statistiques périmées → lancer `ANALYZE`), et le nœud qui concentre le temps d'exécution.

## Concepts clés à maîtriser

- **Index composite & leftmost prefix** : un index sur `(last_name, first_name)` est trié comme un annuaire — par nom, puis prénom. Il sert pour `WHERE last_name = …` et pour `last_name = … AND first_name = …`, mais **pas** pour `first_name` seul (chercher tous les « Kevin » dans un annuaire oblige à tout lire). D'où le choix de l'ordre : les colonnes filtrées en égalité d'abord, les plus sélectives en tête.
- **Index couvrant** : si l'index contient toutes les colonnes demandées par la requête (clause `INCLUDE` en PostgreSQL), la base répond **sans toucher la table** — c'est l'`Index Only Scan`, le plus rapide des scans.
- **Quand un index ne sert à rien** : fonction appliquée à la colonne (`WHERE lower(email) = …` → il faut un index fonctionnel sur `lower(email)`), `LIKE '%terme'` (préfixe inconnu, l'arbre trié est inutilisable), faible sélectivité (un booléen à 50/50 : autant lire la table), types incompatibles (comparer une colonne `text` à un entier).
- **Le coût à l'écriture** : chaque écriture met à jour tous les B-trees de la table ; les pages se scindent, l'index se fragmente, les écritures ralentissent.
- **Normalisation 1NF → 3NF** — éliminer la redondance et les anomalies de mise à jour :

| Forme | Règle | Violation typique |
|---|---|---|
| 1NF | Valeurs atomiques, pas de listes dans une colonne | `tags = "a,b,c"` |
| 2NF | Pas de dépendance à une *partie* de la clé composite | `(order_id, product_id)` mais `product_name` ne dépend que de `product_id` |
| 3NF | Pas de dépendance transitive entre colonnes non-clés | `orders` stocke `customer_id` **et** `customer_city` |

- **Dénormalisation assumée** : dupliquer une donnée (compteur `likes_count`, `total_amount` précalculé) pour éviter un `JOIN` ou un `COUNT` coûteux. Légitime **si** c'est un choix documenté avec sa stratégie de synchronisation (trigger, job, événement) — pas un accident.
- **N+1 (aperçu)** : 1 requête pour charger 100 commandes, puis 100 requêtes pour leurs clients — le grand classique des ORM. Ça se voit dans les logs SQL et se corrige avec un `JOIN` ou l'eager loading (`select_related`, `includes`, `JOIN FETCH`).

> 🎤 **En entretien** — « cette requête est lente, tu fais quoi ? » Réponse structurée : 1) reproduire et mesurer, 2) `EXPLAIN ANALYZE`, 3) repérer le nœud coûteux (seq scan sur une grosse table ? estimations fausses ?), 4) vérifier qu'un index existe **et est utilisable** (fonction sur la colonne ? ordre du composite ?), 5) regarder côté applicatif (N+1, `SELECT *`), 6) en dernier recours : dénormaliser ou mettre en cache. La méthode vaut plus que la solution.

## En entretien

**« Pourquoi un index accélère-t-il la recherche ? »** — Parce que c'est un B-tree : un arbre équilibré à nœuds très larges (des centaines de clés par page), donc de hauteur 3-4 même pour des millions de lignes. Une recherche descend l'arbre en O(log n) au lieu de lire toute la table en O(n). Bonus : les feuilles triées et chaînées servent aussi les ranges et les `ORDER BY`.

**« Pourquoi ne pas indexer toutes les colonnes ? »** — Chaque index est mis à jour à chaque écriture et occupe disque et cache ; le planner n'en utilisera de toute façon qu'un ou deux par requête. Un index que personne n'interroge est un pur coût. On indexe en fonction des requêtes observées, pas du schéma.

**« Index sur `(a, b)` : quelles requêtes en profitent ? »** — Celles qui filtrent sur `a`, ou sur `a` et `b` (leftmost prefix). `WHERE b = …` seul ne peut pas l'utiliser : l'index est trié par `a` d'abord. Analogie annuaire : trouver un nom connaissant le prénom seul oblige à tout lire.

**« EXPLAIN vs EXPLAIN ANALYZE ? »** — `EXPLAIN` montre le plan et les coûts *estimés* par le planner ; `EXPLAIN ANALYZE` exécute réellement la requête et ajoute temps et lignes *réels*. L'écart entre les deux révèle des statistiques périmées. Piège : `ANALYZE` exécute vraiment — sur un `UPDATE`, l'encadrer de `BEGIN; … ROLLBACK;`.

**« Normaliser ou dénormaliser ? »** — Normaliser en 3NF par défaut : une seule source de vérité, pas d'anomalies de mise à jour. Dénormaliser ensuite, ponctuellement et en connaissance de cause, quand une lecture critique le justifie — en documentant comment la copie reste synchrone.

## Pièges & idées reçues

> ⚠️ **Piège vécu** — `EXPLAIN ANALYZE` **exécute** la requête. Sans conséquence sur un `SELECT`, mais sur un `UPDATE` ou un `DELETE` les lignes sont réellement modifiées. Réflexe : `BEGIN; EXPLAIN ANALYZE …; ROLLBACK;`.

- **« L'index existe, donc il est utilisé »** — non : fonction sur la colonne, mauvais ordre du composite, statistiques périmées ou faible sélectivité peuvent le rendre invisible pour le planner. Toujours vérifier au plan.
- **`LIKE '%terme%'` n'utilise pas un B-tree** — seul un préfixe fixe (`'terme%'`) le peut. Pour la recherche « contient », PostgreSQL propose `pg_trgm` avec un index GIN.
- **Les clés étrangères ne sont pas auto-indexées en PostgreSQL** (elles le sont côté InnoDB). Les colonnes FK utilisées dans les `JOIN` méritent presque toujours leur index.
- **La clé primaire, elle, est toujours indexée** — inutile d'en rajouter un.
- Les ORM cachent le SQL, pas son coût : activer les logs de requêtes en dev pour attraper les N+1 avant la prod.

## Pour aller plus loin

- [Use The Index, Luke!](https://use-the-index-luke.com/) — le livre en ligne de référence sur les index, gratuit
- [PostgreSQL — Indexes](https://www.postgresql.org/docs/current/indexes.html) et [Using EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html)
- [explain.dalibo.com](https://explain.dalibo.com/) — coller un plan `EXPLAIN ANALYZE` et le visualiser
- Exercice concret : générer 1 M de lignes avec `generate_series`, mesurer avant/après index — les ordres de grandeur se retiennent mieux quand on les a vus
