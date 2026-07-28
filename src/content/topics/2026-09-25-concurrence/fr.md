---
title: "Concurrence : threads, race conditions & locks"
date: "2026-09-25"
category: "CS"
level: "Avancé"
summary: "Pourquoi `compteur++` perd des incréments, comment un mutex répare ça, quand un deadlock survient, et le critère qui tranche entre async et threads — le sujet système le plus discriminant en entretien."
---

## L'essentiel

Un **processus** est un programme en cours d'exécution avec son propre espace mémoire, isolé des autres par l'OS. Un **thread** est un fil d'exécution *à l'intérieur* d'un processus : tous les threads d'un même processus **partagent le tas (heap)** — variables globales, objets, buffers — mais chacun garde sa propre pile (stack) et ses propres registres. Communiquer entre threads est gratuit (même mémoire) ; entre processus, c'est explicite (pipes, sockets, mémoire partagée).

Ce partage est à double tranchant : il rend les threads légers et rapides à faire coopérer, et il est la source de **tous** les bugs de concurrence.

Deux notions à ne jamais confondre :

- **Concurrence** — *gérer* plusieurs tâches sur la même période ; elles peuvent s'entrelacer sur un seul cœur. Une question de structure du programme.
- **Parallélisme** — *exécuter* plusieurs tâches au même instant, sur plusieurs cœurs. Une question de matériel.

Node.js est massivement concurrent avec un seul thread (zéro parallélisme côté JS) ; un calcul découpé sur 8 cœurs est parallèle sans être spécialement concurrent.

> 🎤 **En entretien** — « c'est quoi une race condition ? » Réponse modèle en trois temps : « Un bug où le résultat dépend de l'ordre d'exécution de threads non synchronisés. Exemple canonique : deux threads font `compteur++` en même temps ; comme l'incrément est en réalité trois instructions (load, add, store), un entrelacement peut perdre une écriture. On corrige avec un mutex autour de la section critique, ou avec un atomic. » Vous avez défini, illustré et résolu en trente secondes.

## Comment ça marche

### `compteur++` déroulé instruction par instruction

`compteur++` a l'air d'une opération unique. Pour le processeur, c'en est trois : lire la valeur en mémoire vers un registre, incrémenter le registre, réécrire le résultat en mémoire. L'ordonnanceur peut suspendre un thread **entre n'importe lesquelles** de ces instructions :

```text
Thread A                 Thread B              compteur
────────                 ────────              ────────
LOAD  rA ← compteur(0)                            0
                         LOAD  rB ← compteur(0)   0
ADD   rA ← rA+1                                   0
                         ADD   rB ← rB+1          0
STORE compteur ← rA                               1
                         STORE compteur ← rB      1  ✗
```

Deux threads ont incrémenté, le compteur ne vaut que 1 : B travaillait sur une valeur périmée et a écrasé l'écriture de A. Sur 2 × 100 000 incréments, le résultat final varie d'une exécution à l'autre — ce non-déterminisme est ce qui rend ces bugs si durs à reproduire.

### Section critique et mutex

La portion de code qui lit-modifie-écrit l'état partagé est une **section critique**. Un **mutex** (*mutual exclusion*, un lock) garantit qu'un seul thread à la fois l'exécute : les autres bloquent à l'entrée jusqu'à la libération du verrou.

```python
import threading

counter = 0
lock = threading.Lock()

def worker_unsafe():
    global counter
    for _ in range(100_000):
        counter += 1          # RACE : load + add + store

def worker_safe():
    global counter
    for _ in range(100_000):
        with lock:            # un seul thread entre ici à la fois
            counter += 1      # section critique protégée
        # le `with` libère le lock même en cas d'exception
```

> 💡 **Règle d'or** — un lock protège **des données**, pas du code : chaque accès à l'état partagé (lectures comprises) doit passer par le même verrou. Un seul accès oublié, et la race est de retour.

### Deadlock : l'étreinte mortelle

Thread A tient le lock 1 et attend le lock 2 ; thread B tient le 2 et attend le 1 : plus personne n'avance, pour toujours. Un deadlock exige **quatre conditions simultanées** (conditions de Coffman) : exclusion mutuelle, rétention et attente (*hold & wait*), pas de préemption des verrous, attente circulaire. En casser une seule suffit — et la plus simple à casser en pratique est la dernière : **toujours acquérir les locks dans le même ordre global** (par identifiant croissant, par exemple). Autres armes : timeout à l'acquisition (`try_lock`), ou ne jamais tenir deux locks à la fois.

## Concepts clés à maîtriser

- **Atomics** — instructions matérielles indivisibles (`fetch_add`, compare-and-swap) : pour un simple compteur, `std::atomic<int>` ou `AtomicInteger` est plus léger qu'un mutex — pas de blocage, pas de deadlock possible.
- **Message passing** — au lieu de partager la mémoire, les tâches s'envoient des messages (channels Go, acteurs Erlang/Akka) : « *don't communicate by sharing memory; share memory by communicating* ». Pas d'état partagé → pas de race sur cet état.
- **Event loop JavaScript** — un seul thread exécute le JS : deux callbacks ne tournent jamais en même temps, donc aucune race sur les variables. La concurrence vient de l'entrelacement *entre* callbacks — les races logiques restent possibles (deux réponses HTTP qui arrivent dans le désordre).
- **GIL Python** — un verrou global fait qu'un seul thread exécute du bytecode Python à la fois : les threads Python conviennent à l'I/O (le GIL est relâché pendant les attentes) mais n'apportent rien au calcul pur, d'où `multiprocessing`.
- **Async vs threads — LE critère** : où le temps passe-t-il ?

| Charge | Exemples | Outil adapté |
|---|---|---|
| **I/O-bound** (on attend) | appels API, DB, fichiers, réseau | async/await + event loop, ou threads (GIL inclus) |
| **CPU-bound** (on calcule) | encodage, crypto, ML, gros parsing | multiprocessing / threads natifs, ≈ 1 par cœur |
| Mixte | serveur web + calculs lourds | event loop + pool de workers |

L'async n'accélère aucun calcul : il permet d'attendre des milliers d'I/O sans bloquer un thread par attente. Le parallélisme CPU, lui, exige plusieurs cœurs réellement utilisés.

## En entretien

**« Différence entre un processus et un thread ? »** — Le processus a son espace mémoire propre, isolé par l'OS ; le thread vit dans un processus et partage son heap avec les autres threads (piles séparées). Threads : création et communication peu coûteuses, mais synchronisation obligatoire. Processus : isolation forte, communication explicite (IPC), crash contenu.

**« Pourquoi `compteur++` n'est-il pas thread-safe ? »** — Parce que c'est trois instructions (load, add, store) et que l'ordonnanceur peut intercaler un autre thread entre elles : deux threads lisent la même valeur, l'un écrase l'écriture de l'autre. Fix : mutex autour de l'opération, ou incrément atomique.

**« C'est quoi un deadlock, et comment l'éviter ? »** — Une attente circulaire de verrous : A tient L1 et attend L2, B tient L2 et attend L1. Quatre conditions de Coffman ; il suffit d'en casser une. Le remède le plus courant : imposer un ordre global d'acquisition des locks. Sinon : timeouts, ou un seul lock à la fois.

**« Async/await ou threads : comment tu choisis ? »** — Selon la nature de la charge. I/O-bound → async (des milliers de connexions en attente sur un seul thread) ; CPU-bound → processus ou threads natifs pour occuper les cœurs. En Python, le GIL rend le critère encore plus tranché : threads pour l'I/O, multiprocessing pour le CPU.

**« Concurrence et parallélisme, c'est pareil ? »** — Non : la concurrence structure un programme en tâches qui progressent sur la même période (possible sur un seul cœur) ; le parallélisme les exécute physiquement en même temps (plusieurs cœurs). On peut avoir l'un sans l'autre.

## Pièges & idées reçues

> ⚠️ **Le bug qui disparaît en debug** — une race dépend du timing : ajouter un `print`, poser un breakpoint ou compiler en debug change l'ordonnancement… et le bug s'évapore (un « heisenbug »). Si un bug disparaît quand on l'observe, suspectez la concurrence. Les vrais outils : ThreadSanitizer (C/C++), `go test -race`, jstack/async-profiler côté JVM.

- **« Plus de threads = plus rapide »** — faux au-delà du nombre de cœurs pour du CPU-bound : le context switching peut même *ralentir*. Et pour l'I/O massif, un event loop bat 10 000 threads.
- **« Une lecture n'a pas besoin de lock »** — une lecture concurrente d'une écriture non protégée est déjà une data race : valeur périmée ou déchirée, comportement indéfini en C/C++.
- **`sleep()` comme synchronisation** — attendre 100 ms « pour laisser le temps » ne supprime pas la race, elle la rend juste plus rare. Utiliser `join`, events, barrières.
- **Check-then-act** — `if not exists: create()` sans verrou est une race classique (TOCTOU), même si chaque opération est atomique individuellement.

## Pour aller plus loin

- [Rob Pike — Concurrency is not Parallelism](https://go.dev/blog/waza-talk) : la distinction, en 30 minutes
- [OSTEP — partie Concurrency](https://pages.cs.wisc.edu/~remzi/OSTEP/) : threads, locks, sémaphores — gratuit et limpide
- [The Little Book of Semaphores](https://greenteapress.com/wp/semaphores/) : des dizaines de puzzles de synchronisation corrigés
- [MDN — The event loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop) : le modèle d'exécution de JavaScript
- Reproduire la race soi-même : deux threads Python sur `counter += 1` × 100 000, et constater le résultat
