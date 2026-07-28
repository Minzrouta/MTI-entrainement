---
title: "ORM, migrations & N+1"
date: "2026-10-08"
category: "Data"
level: "Intermédiaire"
summary: "Ce qu'un ORM apporte, ce qu'il cache (le fameux N+1), et comment faire évoluer un schéma en production sans rien casser — un trio de questions quasi garanti en entretien backend."
---

## L'essentiel

Un **ORM** (Object-Relational Mapper — Prisma, SQLAlchemy, Hibernate, Entity Framework…) fait le pont entre les objets de votre langage et les tables relationnelles. Il apporte trois choses : le **mapping** (une ligne ↔ un objet, une clé étrangère ↔ une propriété), des **requêtes typées** (l'IDE autocomplète, le compilateur attrape la faute de frappe avant la prod) et des **migrations** qui versionnent le schéma comme du code.

Le coût est symétrique : chaque accès innocent à une propriété (`author.posts`) peut déclencher une requête SQL que vous n'avez jamais écrite. Un ORM est une **abstraction qui fuit** : dès que la performance compte, il faut lire le SQL généré. Le symptôme le plus courant — et la question d'entretien la plus posée sur le sujet — s'appelle le **N+1** : une requête pour charger une liste, puis une requête *par élément* dans la boucle qui suit.

À retenir avant tout le reste : l'ORM ne dispense pas de savoir SQL. Il l'écrit à votre place, et c'est vous qui relisez.

## Comment ça marche

**Le N+1, chiffré.** 100 auteurs, chacun avec ses articles. La version naïve semble propre — et déclenche 101 requêtes :

```javascript
// ❌ N+1 : 1 requête pour la liste, puis 1 PAR auteur
const authors = await prisma.author.findMany();     // 1 requête
for (const author of authors) {
  const posts = await prisma.post.findMany({
    where: { authorId: author.id },                 // ×100 !
  });
  console.log(author.name, posts.length);
}
// 101 requêtes × ~5 ms de round-trip réseau ≈ 500 ms

// ✅ Eager loading : tout en 2 requêtes
const authors = await prisma.author.findMany({
  include: { posts: true },  // JOIN ou WHERE authorId IN (...)
});
// 2 requêtes ≈ 10 ms — ~50× plus rapide, même logique métier
```

Le coût n'est pas le volume de données : c'est le **round-trip réseau** vers la base, payé N fois. Le N+1 passe inaperçu en dev (base locale, 10 lignes de seed) et explose en prod (latence réseau réelle, 10 000 lignes).

**Eager vs lazy loading** — deux stratégies pour charger une relation :

| | Lazy loading | Eager loading |
|---|---|---|
| Chargement | À l'accès, requête à la demande | Dès la requête initiale (`JOIN`/`IN`) |
| Nombre de requêtes | 1 + N (risque N+1 en boucle) | 1 à 2, constant |
| Mémoire | Minimale si la relation est ignorée | Charge tout, même l'inutile |
| Bon usage | Relation rarement consultée | Listes, boucles, réponses d'API |

Hibernate ou SQLAlchemy sont lazy par défaut : le N+1 se cache derrière un simple accès de propriété. Prisma ne charge une relation que si on la demande (`include`/`select`) : le N+1 y est au moins visible — c'est la requête dans la boucle. Dans tous les cas, la détection est la même : **compter les requêtes**.

> 💡 **Réflexe à montrer** — activer le log SQL en dev (`log: ['query']` chez Prisma, `echo=True` chez SQLAlchemy) et regarder ce qu'un seul écran déclenche. Si le nombre de requêtes croît avec le nombre d'éléments affichés, c'est un N+1.

## Concepts clés à maîtriser

- **Quand écrire du SQL brut** : rapports et agrégations complexes, window functions, bulk updates, et le hot path où le SQL généré est mauvais. Tous les ORM ont une trappe de sortie (`$queryRaw`, `text()`, native queries) — l'utiliser n'est pas un échec, c'est prévu pour. L'ORM garde les 90 % de CRUD répétitif.
- **Migrations versionnées** : chaque changement de schéma est un fichier horodaté, commité dans le repo, avec un **up** (appliquer) et idéalement un **down** (annuler). La base tient la liste de celles déjà appliquées : même schéma garanti du poste du stagiaire à la prod.
- **Ne jamais éditer une migration appliquée** : elle a déjà tourné ailleurs (chez les collègues, en CI, en prod). L'éditer fait diverger l'historique — les outils le détectent (checksum chez Prisma) et refusent d'avancer. Une erreur se corrige *en avant*, par une nouvelle migration.
- **Expand/contract** (ou parallel change) : la recette pour changer un schéma sans casser le code encore en ligne. Jamais de rename direct — trois phases, trois déploiements :

```text
Renommer name → full_name sans downtime

  EXPAND            MIGRATE            CONTRACT
  ajouter           double écriture    supprimer
  full_name         + backfill des     name
  (nullable)        anciennes lignes
──────────────────────────────────────────────▶ temps
  déploiement 1     déploiement 2      déploiement 3
  l'ancien code     le code lit        plus personne
  marche encore     full_name          ne lit name
```

- **Seeds & environnements** : les données initiales (comptes de test, référentiels) sont scriptées et versionnées, par environnement. Le dev veut des données réalistes, le CI un jeu minimal et déterministe, la prod — presque rien.

> 🎤 **En entretien** — si on vous demande de faire évoluer un schéma en production, dérouler expand/contract au tableau (ajouter → migrer → retirer, un déploiement par phase) montre plus de maturité que n'importe quel buzzword. C'est exactement ce qu'un senior veut entendre d'un stagiaire.

## En entretien

**« C'est quoi le problème N+1 et comment le corriger ? »** — Une requête pour la liste, puis une par élément dans la boucle : 100 auteurs = 101 requêtes, dominées par les round-trips réseau. Correction : eager loading (`include`, `JOIN`, `WHERE IN`) pour ramener le tout en 1-2 requêtes. Détection : logs SQL en dev, APM en prod. Donner le chiffre (101 → 2) fait toute la différence.

**« Eager ou lazy loading par défaut ? »** — Lazy évite de charger l'inutile mais transforme chaque boucle en N+1 ; eager garantit un nombre de requêtes constant mais peut sur-charger. Réponse mûre : lazy pour les relations rarement lues, eager explicite partout où on itère — et connaître le défaut de *son* ORM.

**« Quand écrirais-tu du SQL à la main ? »** — Rapports complexes, window functions, bulk operations, hot paths où le SQL généré est inefficace. La trappe de sortie (`$queryRaw`, `text()`) est assumée : l'ORM pour le CRUD, le SQL pour le reste.

**« Comment déployer un changement de schéma sans downtime ? »** — Expand/contract : ajouter le nouveau (colonne nullable, double écriture), migrer données et code, puis seulement retirer l'ancien. Trois déploiements. Pendant un déploiement, ancien et nouveau code cohabitent : le schéma doit satisfaire les deux.

**« Pourquoi ne pas modifier une migration déjà mergée ? »** — Elle a déjà été appliquée sur d'autres bases ; la modifier fait diverger l'historique (checksum invalide, environnements incohérents). On corrige en avant, avec une nouvelle migration.

## Pièges & idées reçues

> ⚠️ **La migration destructive du vendredi** — `DROP COLUMN` déployé à 17 h : le vieux code encore en ligne lit toujours la colonne, tout crashe pendant le week-end, et le down d'un DROP **ne restaure pas les données**. Une migration destructive part en début de semaine, en phase contract (plus aucun lecteur), après un backup vérifié.

- **« L'ORM m'évite d'apprendre SQL »** — c'est l'inverse : il faut savoir SQL pour *relire* ce que l'ORM génère. Le jour où l'endpoint rame, la réponse est dans `EXPLAIN`, pas dans la doc de l'ORM.
- **Faire confiance aux migrations auto-générées** — l'outil diffe le schéma, mais un rename devient souvent `DROP` + `ADD`, donc perte de données. Toujours relire le SQL généré avant de merger.
- **Le down comme filet de sécurité** — un down qui annule un `DROP COLUMN` recrée la colonne… vide. Le vrai filet, c'est backup + expand/contract.
- **Seeder la prod avec les seeds de dev** — un `db seed` lancé sur la prod avec les comptes de test finit en incident, parfois en fuite de données. Les seeds sont par environnement, et la prod n'en a presque jamais.

## Pour aller plus loin

- [Martin Fowler — ParallelChange](https://martinfowler.com/bliki/ParallelChange.html) et [Evolutionary Database Design](https://martinfowler.com/articles/evodb.html) : expand/contract à la source
- [Prisma — Relation queries](https://www.prisma.io/docs/orm/prisma-client/queries/relation-queries) : `include`, `select` et la chasse au N+1
- [Use The Index, Luke](https://use-the-index-luke.com/) : le SQL et les index expliqués aux développeurs
- [Django — Migrations](https://docs.djangoproject.com/en/stable/topics/migrations/) : la référence du schéma versionné, transposable à tous les frameworks
