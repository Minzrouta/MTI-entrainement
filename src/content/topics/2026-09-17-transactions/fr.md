---
title: "Transactions & niveaux d'isolation"
date: "2026-09-17"
category: "Data"
level: "Avancé"
summary: "ACID, dirty reads, MVCC, SELECT FOR UPDATE, deadlocks : le sujet qui sépare ceux qui « font du SQL » de ceux qui comprennent ce qui se passe quand deux requêtes arrivent en même temps."
---

## L'essentiel

Une **transaction** est une séquence d'opérations que la base traite comme un tout indivisible : soit tout est appliqué (`COMMIT`), soit rien (`ROLLBACK`). Entre `BEGIN` et `COMMIT`, la base garantit les quatre propriétés **ACID** :

- **Atomicité** — tout ou rien. Un crash au milieu d'un virement ne laisse jamais le débit sans le crédit.
- **Cohérence** — chaque transaction fait passer la base d'un état valide à un état valide (contraintes, clés étrangères, checks respectés).
- **Isolation** — les transactions concurrentes ne voient pas leurs états intermédiaires respectifs… *dans une certaine mesure* : c'est tout le sujet des niveaux d'isolation.
- **Durabilité** — une fois le `COMMIT` acquitté, la donnée survit à un crash (write-ahead log écrit sur disque avant l'acquittement).

L'atomicité et la durabilité sont binaires ; **l'isolation est un curseur**. L'isolation parfaite (tout se passe comme si les transactions s'exécutaient une par une) coûte cher en concurrence : le standard SQL définit donc quatre niveaux, du plus laxiste au plus strict, qui autorisent ou interdisent des **anomalies** précises.

## Comment ça marche

Les quatre anomalies classiques, en mini-scénarios (T1 et T2 sont deux transactions concurrentes) :

- **Dirty read** : T1 lit une valeur que T2 a modifiée *sans avoir commité*. T2 rollback → T1 a travaillé sur une donnée qui n'a jamais existé.
- **Non-repeatable read** : T1 lit une ligne, T2 la modifie et commit, T1 relit → valeur différente au sein d'une même transaction.
- **Phantom read** : T1 exécute `SELECT COUNT(*) WHERE …`, T2 insère une ligne qui matche et commit, T1 réexécute → des lignes « fantômes » sont apparues.
- **Lost update** : T1 et T2 lisent la même valeur, calculent chacune en mémoire, écrivent chacune leur résultat → la seconde écriture écrase la première. Le grand classique du double débit :

```text
   T1 (retrait 80€)          T2 (retrait 50€)
   BEGIN                     BEGIN
   SELECT solde  → 100
                             SELECT solde  → 100
   UPDATE solde = 100-80
   COMMIT        (solde=20)
                             UPDATE solde = 100-50
                             COMMIT        (solde=50)

   Résultat : 130€ retirés, solde final 50€.
   Le débit de T1 est perdu — lost update.
```

Les quatre niveaux d'isolation du standard, et ce qu'ils empêchent :

| Niveau | Dirty read | Non-repeatable | Phantom |
|---|---|---|---|
| Read uncommitted | Possible | Possible | Possible |
| Read committed *(défaut Postgres)* | Empêché | Possible | Possible |
| Repeatable read | Empêché | Empêché | Possible* |
| Serializable | Empêché | Empêché | Empêché |

\* En Postgres, `REPEATABLE READ` empêche aussi les phantoms (snapshot complet) — un bon point à mentionner. Le **lost update** n'est pas dans le tableau du standard : en `READ COMMITTED` il reste possible et doit être traité explicitement (verrou ou update atomique) ; en `REPEATABLE READ` Postgres, la deuxième écriture échoue avec une erreur de sérialisation à retenter.

Comment Postgres tient l'isolation sans tout verrouiller : **MVCC** (Multi-Version Concurrency Control). Chaque `UPDATE` crée une **nouvelle version** de la ligne plutôt que d'écraser l'ancienne ; chaque transaction voit un **snapshot** cohérent — les versions commitées avant son début. Résultat fondamental : **les lecteurs ne bloquent jamais les écrivains, et inversement**. Les vieilles versions sont nettoyées plus tard par `VACUUM`. Seules deux écritures sur la *même ligne* se bloquent entre elles.

> 💡 **La phrase qui fait mouche** — « Postgres ne pose pas de verrou en lecture : chaque transaction lit un snapshot MVCC, c'est pour ça qu'un gros SELECT analytique ne bloque pas la prod. » Une phrase, et vous venez de dépasser 80 % des candidats.

## Concepts clés à maîtriser

- **`SELECT … FOR UPDATE`** : lit la ligne **et la verrouille** jusqu'à la fin de la transaction. Toute autre transaction voulant la verrouiller ou la modifier attend. C'est le verrou pessimiste — l'arme anti-lost-update quand la logique doit passer par l'applicatif.
- **Verrou optimiste** (l'alternative sans verrou) : une colonne `version`, et `UPDATE … WHERE id = ? AND version = ?` ; zéro ligne affectée = quelqu'un est passé avant, on recharge et on réessaie. Idéal quand les conflits sont rares.
- **Update atomique** : le plus simple quand il suffit — `UPDATE comptes SET solde = solde - 80` calcule *dans* la base, sous verrou de ligne implicite. Pas de fenêtre read-modify-write, pas de lost update.
- **Deadlock** : T1 verrouille A puis veut B ; T2 verrouille B puis veut A — attente circulaire. La base le détecte et **tue une des deux** (erreur 40P01 en Postgres). Prévention : **toujours verrouiller les ressources dans le même ordre** (par id croissant, par exemple) et garder les transactions courtes. Guérison : réessayer la transaction tuée.
- **Transactions courtes** : une transaction ouverte pendant un appel API externe garde ses verrous et son snapshot pendant tout ce temps — connexions saturées, VACUUM bloqué, deadlocks. Règle : jamais d'I/O externe dans une transaction.

Le lost update et ses corrections, en SQL :

```sql
-- ❌ BUGGY : fenêtre entre la lecture et l'écriture
BEGIN;
SELECT solde FROM comptes WHERE id = 1;      -- lit 100
-- ... l'applicatif calcule 100 - 80 ...
-- (une autre transaction peut lire 100 ici aussi !)
UPDATE comptes SET solde = 20 WHERE id = 1;  -- écrase aveuglément
COMMIT;

-- ✅ Correction 1 : update atomique (à privilégier si possible)
UPDATE comptes SET solde = solde - 80
WHERE id = 1 AND solde >= 80;                -- le calcul ET la garde
-- se font dans la base, sous verrou de ligne ; 0 ligne = solde insuffisant

-- ✅ Correction 2 : verrou pessimiste (logique applicative complexe)
BEGIN;
SELECT solde FROM comptes WHERE id = 1 FOR UPDATE;  -- verrouille la ligne
-- toute transaction concurrente sur cette ligne ATTEND ici
UPDATE comptes SET solde = 20 WHERE id = 1;
COMMIT;                                       -- libère le verrou
```

> 🎤 **En entretien** — le virement bancaire est LE scénario à dérouler : « je débite A et crédite B dans une seule transaction (atomicité : jamais l'un sans l'autre). Contre les retraits concurrents, update atomique avec garde `solde >= montant`, ou `SELECT FOR UPDATE`. Et pour éviter le deadlock entre un virement A→B et un virement B→A simultanés, je verrouille toujours les comptes dans le même ordre — par id croissant. » Atomicité, concurrence, deadlock : trois points en trente secondes.

## En entretien

**« Explique ACID avec un exemple concret. »** — Le virement : atomicité (débit + crédit, tout ou rien), cohérence (contrainte `solde >= 0` jamais violée), isolation (une transaction concurrente ne voit pas l'état intermédiaire débité-mais-pas-crédité), durabilité (commit acquitté = écrit dans le WAL, survit au crash).

**« Quelle différence entre non-repeatable read et phantom read ? »** — Non-repeatable : une ligne **existante** relue a changé (UPDATE commité entre les deux lectures). Phantom : l'**ensemble** des lignes matchant un critère a changé (INSERT/DELETE commité) — des lignes apparaissent ou disparaissent. La nuance compte car `REPEATABLE READ` du standard bloque le premier mais pas le second.

**« Pourquoi ne met-on pas tout en SERIALIZABLE ? »** — Coût : la base doit détecter les dépendances entre transactions et en **avorter** certaines (erreurs de sérialisation à retenter) ; débit en baisse, code de retry obligatoire. `READ COMMITTED` + verrous ciblés là où ça compte est le compromis pragmatique par défaut.

**« Comment Postgres permet-il de lire sans bloquer les écritures ? »** — MVCC : chaque UPDATE crée une nouvelle version de ligne, chaque transaction lit un snapshot cohérent des versions commitées à son début. Lecteurs et écrivains ne se bloquent jamais mutuellement ; seules deux écritures sur la même ligne se sérialisent. VACUUM recycle les versions mortes.

**« Deux virements croisés A→B et B→A deadlockent. Que se passe-t-il et comment l'éviter ? »** — Chacun tient un verrou et attend l'autre : attente circulaire. Postgres la détecte et tue une transaction (à retenter côté applicatif). Prévention : ordonner les acquisitions de verrous (toujours l'id le plus petit d'abord) — plus de cycle possible — et transactions courtes.

## Pièges & idées reçues

> ⚠️ **L'autocommit piège** — sans `BEGIN` explicite, chaque statement est sa propre transaction. Deux `UPDATE` consécutifs dans votre code ne sont **pas** atomiques : un crash entre les deux laisse la base incohérente. Les ORM ouvrent souvent des transactions implicites — sachez ce que fait le vôtre (`prisma.$transaction`, `@Transactional`…).

- **« Une transaction, ça verrouille la table »** — non : MVCC verrouille au pire des lignes, et la lecture ne verrouille rien du tout. Croire ça mène à sur-verrouiller « par prudence » et à créer les deadlocks qu'on voulait éviter.
- **« READ COMMITTED me protège du lost update »** — non : il empêche seulement les dirty reads. Le read-modify-write applicatif reste vulnérable ; il faut un update atomique, `FOR UPDATE` ou un verrou optimiste.
- **`SERIALIZABLE` sans retry** : ce niveau *avorte* des transactions par design. Sans boucle de retry sur les erreurs de sérialisation, vous avez juste ajouté des 500 aléatoires.
- **Transactions longues** : appel HTTP, envoi d'email ou attente utilisateur dans une transaction = verrous tenus des secondes, VACUUM bloqué, contention en cascade. I/O externe toujours hors transaction.
- **Compter sur le défaut sans le connaître** : Postgres et MySQL/InnoDB ne partagent ni le même défaut (`READ COMMITTED` vs `REPEATABLE READ`) ni la même implémentation des niveaux. « Ça dépend du moteur » est une réponse d'expert, pas une esquive.

## Pour aller plus loin

- [PostgreSQL — Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html) — le chapitre à lire en entier, avec les subtilités Postgres vs standard
- [PostgreSQL — Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html) : `FOR UPDATE`, `FOR SHARE`, deadlocks
- *Designing Data-Intensive Applications* (Kleppmann), chapitre 7 « Transactions » — la meilleure explication écrite des anomalies et de la sérialisabilité
- Manipuler : ouvrir deux `psql` côte à côte, `BEGIN` dans chaque, et rejouer le lost update puis le deadlock — dix minutes qui valent toutes les fiches
