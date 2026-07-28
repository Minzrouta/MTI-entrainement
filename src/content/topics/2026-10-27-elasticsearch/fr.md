---
title: "Recherche full-text & Elasticsearch"
date: "2026-10-27"
category: "Data"
level: "Avancé"
summary: "Index inversé, analyse, BM25, synchro avec la base : comprendre comment fonctionne un moteur de recherche — et savoir dire en entretien quand Postgres suffit."
---

## L'essentiel

Le réflexe naïf pour chercher « chaussures de running » dans une table de produits, c'est `WHERE description LIKE '%running%'`. Ça marche en démo, ça meurt en prod : un `LIKE '%…%'` **ne peut pas utiliser d'index B-tree** (le motif commence par un joker), donc la base scanne toute la table à chaque requête — O(n) sur des millions de lignes. Et même en acceptant la lenteur, le résultat est mauvais : pas de « chaussure » au singulier, pas de tolérance aux fautes, pas de tri par pertinence.

La recherche full-text inverse le problème avec l'**index inversé** : au lieu de parcourir les documents pour y trouver des termes, on précalcule, pour **chaque terme, la liste des documents** qui le contiennent. Chercher devient une lecture directe : « running » → documents 2, 7, 42. C'est la structure au cœur de Lucene, donc d'**Elasticsearch** et d'**OpenSearch** (son fork Apache 2.0), mais aussi du full-text search de **Postgres**.

En entretien, on attend les deux : la mécanique (index inversé, analyse, pertinence) **et** le discernement — Elasticsearch est puissant mais c'est un second système à opérer et à synchroniser ; Postgres full-text couvre déjà énormément de besoins.

## Comment ça marche

**1. L'index inversé.** À l'indexation, chaque document est découpé en termes ; l'index stocke terme → liste de documents (postings), avec les positions pour les recherches de phrases :

```text
Documents
  d1: "Chaussures de running légères"
  d2: "Running : programme débutant"
  d3: "Chaussures de ville en cuir"

Index inversé (après analyse)
  chaussur  → [d1, d3]
  running   → [d1, d2]
  leger     → [d1]
  programm  → [d2]
  debutant  → [d2]
  ville     → [d3]
  cuir      → [d3]

Requête "chaussures running"
  chaussur ∩ running = [d1]   (AND)
  chaussur ∪ running = [d1, d2, d3]  (OR, trié par score)
```

**2. L'analyse (analysis).** Le texte ne rentre jamais brut dans l'index : il passe par un **analyzer** — tokenization (découpage en mots), **lowercase**, suppression des **stop words** (« de », « the »…), **stemming** (réduction à la racine : « chaussures » → « chaussur », « running » → « run » selon l'analyzer). Point crucial : l'analyse est **par langue** (le stemmer français ne sait rien de l'anglais) et la **requête subit la même analyse** que les documents — c'est ce qui fait que « Chaussure » matche « chaussures ».

**3. La pertinence.** Tous les documents qui matchent ne se valent pas. L'intuition **TF-IDF** : un terme compte davantage s'il est fréquent dans *ce* document (TF) et rare dans *l'ensemble* du corpus (IDF) — « running » discrimine, « de » ne discrimine rien. **BM25**, le défaut d'Elasticsearch et de Lucene moderne, raffine cette idée : saturation du TF (le 50ᵉ « running » n'apporte presque rien de plus que le 5ᵉ) et normalisation par la longueur du document (un match dans un titre court pèse plus que dans un pavé).

**4. Elasticsearch en pratique.** Des **documents JSON** dans des index, un **mapping** qui déclare le type de chaque champ — distinction clé : `text` (analysé, pour la recherche) vs `keyword` (brut, pour filtres exacts, tris et agrégations) — et un **query DSL** en JSON :

```json
// GET /products/_search — requête + filtres + score
{
  "query": {
    "bool": {
      "must": [                       // participe au score BM25
        { "match": {                  // "match" analyse le texte cherché
          "name": {
            "query": "chaussure running",
            "fuzziness": "AUTO"       // tolère les fautes de frappe
          }
        }}
      ],
      "filter": [                     // filtre binaire, sans score, cacheable
        { "term":  { "category": "shoes" } },
        { "range": { "price": { "lte": 150 } } }
      ]
    }
  }
}
```

`must` note les documents (pertinence), `filter` élimine sans noter (exact, plus rapide, mis en cache). C'est la requête type d'une recherche e-commerce.

## Concepts clés à maîtriser

- **Le pattern DB + index de recherche** : la base relationnelle reste la **source de vérité** (transactions, contraintes) ; l'index de recherche en est une **projection dénormalisée**, optimisée pour la lecture. Toute écriture doit être propagée : c'est le **problème de la synchro**. Options : double écriture applicative (simple mais fragile — que se passe-t-il si l'indexation échoue après le commit ?), file de messages, ou **CDC** (Change Data Capture : Debezium lit le WAL et rejoue les changements). L'index est en **cohérence à terme** : quelques secondes de décalage, à assumer dans l'UX.
- **Reindexation** : changer un analyzer ou un mapping impose souvent de reconstruire l'index. Pattern : indexer vers `products_v2`, puis basculer un **alias** — zéro downtime.
- **Postgres full-text** : `tsvector` (le document analysé) + `tsquery` (la requête), opérateur `@@`, index **GIN**, dictionnaires par langue (`'french'`), `ts_rank` pour trier. Dans la même base que les données : **pas de synchro**, transactions incluses. Souvent suffisant.
- **Facettes & agrégations** : les compteurs par catégorie/marque/prix des sites e-commerce = agrégations Elasticsearch (`terms`, `range`) calculées sur les résultats filtrés.
- **Autocomplete** : préfixes via `edge_ngram` à l'indexation (« chau » → « chaussure ») ou champ `search_as_you_type` ; la fuzziness gère les fautes.

| | Postgres FTS | Elasticsearch / OpenSearch |
|---|---|---|
| Infra | Déjà là (votre DB) | Cluster séparé à opérer |
| Synchro | Aucune (même base, transactionnel) | Obligatoire (double écriture, CDC) |
| Pertinence | `ts_rank` correct | BM25, tuning fin, suggesteurs |
| Fuzzy / fautes | Limité (`pg_trgm` en complément) | Natif (`fuzziness`) |
| Facettes/aggs | GROUP BY (correct) | Agrégations natives, très rapides |
| Échelle | Très loin sur une instance | Distribué : sharding, réplicas |
| Bon choix quand… | Recherche « feature » d'une app | La recherche EST le produit |

> 💡 **Commence par Postgres FTS** — si vos données sont déjà dans Postgres, `tsvector` + index GIN donnent une vraie recherche full-text (stemming, ranking, multi-langue) sans nouveau système, sans synchro, sans cluster à opérer. Migrez vers Elasticsearch quand vous butez sur ses limites réelles (fuzzy avancé, facettes massives, volumétrie) — pas avant. C'est la réponse qui fait mouche en entretien.

## En entretien

**« Pourquoi `LIKE '%mot%'` ne scale pas ? »** — Le joker en tête empêche l'usage d'un index B-tree (qui range par préfixe) : scan complet de la table à chaque requête, O(n). Et fonctionnellement : pas de stemming, pas de pertinence, pas de tolérance aux fautes. La réponse structurelle est l'index inversé — terme → documents — où la recherche devient une lecture directe.

**« C'est quoi un index inversé ? »** — La structure qui inverse la relation document→termes en terme→documents. À l'indexation, chaque document est analysé (tokenization, lowercase, stemming) et chaque terme pointe vers sa liste de documents (postings, avec positions). Une requête est analysée pareil, puis on intersecte (AND) ou unit (OR) les listes et on trie par score BM25.

**« Comment un moteur trie-t-il par pertinence ? »** — Intuition TF-IDF : fréquent dans le document (TF) × rare dans le corpus (IDF). BM25 raffine : saturation du TF et normalisation par longueur du document. Bonus : mentionner qu'on peut booster des champs (titre > description) et que `filter` ne participe pas au score.

**« Comment gardes-tu Elasticsearch synchronisé avec ta base ? »** — La DB reste source de vérité, l'index est une projection. Double écriture applicative pour commencer (en gérant l'échec d'indexation : retry, file), CDC avec Debezium pour du robuste (lecture du WAL). Dans tous les cas, cohérence à terme — et prévoir une réindexation complète pour rattraper les dérives.

**« Elasticsearch ou Postgres full-text ? »** — Postgres FTS d'abord si les données y sont : zéro synchro, transactionnel, `tsvector`/GIN couvrent stemming et ranking. Elasticsearch quand la recherche est centrale au produit : fuzzy natif, facettes massives, autocomplete avancé, échelle horizontale. Le coût caché d'Elasticsearch n'est pas la recherche, c'est l'opération du cluster et la synchro.

## Pièges & idées reçues

> ⚠️ **Elasticsearch n'est pas une base de données primaire** — pas de transactions, durabilité pensée pour un index reconstructible. Si l'index brûle, on le reconstruit depuis la DB ; si la DB brûle et que vos données n'étaient *que* dans Elasticsearch, elles sont perdues. Source de vérité : toujours ailleurs.

- **Oublier que la requête est analysée aussi** — chercher `Running` en `term` (non analysé) sur un champ `text` (analysé, donc « running » en minuscule dans l'index) ne matche rien. Le grand classique du débutant : `match` pour le texte analysé, `term` pour les champs `keyword`.
- **`text` vs `keyword` mal choisis** — trier ou agréger sur un champ analysé n'a pas de sens (on trierait sur des racines stemmées) ; chercher du plein texte sur un `keyword` exige l'égalité exacte. Le mapping se réfléchit avant l'indexation.
- **Sous-estimer la synchro** — la double écriture « fire and forget » perd des documents en silence (crash entre le commit DB et l'indexation). Il faut un mécanisme de rattrapage : file avec retry, CDC, ou réindexation périodique.
- **Résultats « en retard »** — l'index est en cohérence à terme (refresh ~1s par défaut, plus le délai de synchro) : un produit créé peut ne pas apparaître immédiatement dans la recherche. À expliquer au product owner avant qu'il n'ouvre un bug.

> 🎤 **En entretien** — la question « comment ajouterais-tu une recherche à cette app ? » teste votre discernement, pas votre connaissance du query DSL. Réponse gagnante : « d'abord Postgres FTS puisque les données y sont — tsvector, index GIN, ts_rank ; si les besoins dépassent (fuzzy, facettes, volumétrie), Elasticsearch avec la DB comme source de vérité et une synchro par CDC ». Vous venez de montrer l'architecture *et* le pragmatisme.

## Pour aller plus loin

- [Elasticsearch — the definitive guide : inverted index](https://www.elastic.co/guide/en/elasticsearch/guide/current/inverted-index.html) : la mécanique expliquée par Elastic
- [PostgreSQL — Full Text Search](https://www.postgresql.org/docs/current/textsearch.html) : `tsvector`, `tsquery`, GIN — tout y est
- [Understanding BM25 (Elastic blog)](https://www.elastic.co/blog/practical-bm25-part-2-the-bm25-algorithm-and-its-variables) : la formule de scoring décortiquée variable par variable
- [Debezium](https://debezium.io/) : le CDC open source pour la synchro DB → index
- Exercice : indexer trois phrases à la main (tokenize, lowercase, stem) et construire l'index inversé sur papier — c'est l'exercice type de whiteboard
