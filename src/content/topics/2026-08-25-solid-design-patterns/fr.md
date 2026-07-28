---
title: "SOLID, design patterns & architecture propre"
date: "2026-08-25"
category: "Architecture"
level: "Intermédiaire"
summary: "Les 5 principes SOLID avec violations et corrections, les patterns qu'on croise vraiment en entretien, et savoir quand NE PAS abstraire — la question d'architecture arrive dans presque tous les entretiens de stage."
---

## L'essentiel

**SOLID** est un acronyme de cinq principes de conception orientée objet, popularisés par Robert C. Martin. Ce ne sont pas des lois : ce sont des heuristiques pour obtenir du code **facile à modifier** — le vrai critère de qualité d'un logiciel qui vit.

- **S — Single Responsibility** : une classe n'a qu'une seule raison de changer. Violation : une classe `Invoice` qui calcule le total ET génère le PDF ET envoie l'email. Correction : trois classes (`Invoice`, `InvoicePdfRenderer`, `InvoiceMailer`) — quand le format PDF change, seule une classe bouge.
- **O — Open/Closed** : ouvert à l'extension, fermé à la modification. Violation : un `switch (paymentType)` qu'on rallonge à chaque nouveau moyen de paiement. Correction : une interface `PaymentMethod` et une classe par moyen de paiement — on ajoute du code, on n'en modifie pas.
- **L — Liskov Substitution** : un sous-type doit être utilisable partout où son parent l'est, sans surprise. Violation classique : `Square extends Rectangle` où `setWidth` modifie aussi la hauteur — le code qui manipule un `Rectangle` casse. Correction : ne pas hériter, ou modéliser autrement (deux types distincts).
- **I — Interface Segregation** : plusieurs petites interfaces spécifiques plutôt qu'une grosse. Violation : `Machine` avec `print()`, `scan()`, `fax()` — l'imprimante bas de gamme doit implémenter `fax()` en levant une exception. Correction : `Printer`, `Scanner`, `Fax` séparées, chaque classe implémente ce qu'elle sait faire.
- **D — Dependency Inversion** : dépendre d'abstractions, pas d'implémentations concrètes. Violation : `OrderService` qui fait `new MySqlOrderRepository()` en dur — impossible à tester sans MySQL. Correction : `OrderService` reçoit un `OrderRepository` (interface) par son constructeur.

## Comment ça marche

Le fil rouge des cinq principes : **isoler ce qui change de ce qui ne change pas**, et faire pointer les dépendances vers le stable. C'est exactement ce que formalise l'**architecture hexagonale** (ports & adapters) : le domaine métier au centre, sans aucune dépendance technique ; autour, des adapters interchangeables qui parlent au monde extérieur.

```text
        ┌──────────────────────────────────┐
        │            ADAPTERS              │
        │  HTTP (Express)   CLI    Tests   │
        │        │           │       │     │
        │        ▼           ▼       ▼     │
        │  ┌───── ports (interfaces) ────┐ │
        │  │                             │ │
        │  │       DOMAINE MÉTIER        │ │
        │  │   (règles, entités, use     │ │
        │  │    cases — zéro framework)  │ │
        │  │                             │ │
        │  └───── ports (interfaces) ────┘ │
        │        │           │       │     │
        │        ▼           ▼       ▼     │
        │  Postgres      Stripe    SMTP    │
        └──────────────────────────────────┘
    Règle : les flèches pointent vers le centre.
```

Le domaine définit des **ports** (interfaces : `OrderRepository`, `PaymentGateway`) ; l'infrastructure fournit des **adapters** qui les implémentent (`PostgresOrderRepository`, `StripeGateway`). Changer de base de données ou tester en mémoire = écrire un adapter, sans toucher au métier. C'est le principe D appliqué à l'échelle de l'application.

La **dependency injection** est le mécanisme concret : au lieu que la classe construise ses dépendances, on les lui fournit de l'extérieur (constructeur, le plus souvent). Un « container DI » (Spring, NestJS) automatise ce câblage, mais le principe tient sans framework.

```typescript
// Port : le domaine définit ce dont il a besoin, rien de plus
interface OrderRepository {
  save(order: Order): Promise<void>;
}

// Use case métier : aucune idée de Postgres, Stripe ou Express
class PlaceOrder {
  // la dépendance est INJECTÉE : jamais de `new PostgresRepo()` ici
  constructor(private readonly repo: OrderRepository) {}

  async execute(order: Order): Promise<void> {
    if (order.items.length === 0) throw new Error("Empty order");
    await this.repo.save(order); // on parle au port, pas à l'adapter
  }
}

// Composition root : le SEUL endroit qui connaît le concret
const placeOrder = new PlaceOrder(new PostgresOrderRepository(pool));

// En test : un faux repo en mémoire, zéro base de données
const testable = new PlaceOrder(new InMemoryOrderRepository());
```

> 💡 **Le lien à faire** — DI (injection, le mécanisme) applique le D de SOLID (inversion, le principe). Citer les deux et les distinguer, c'est exactement le niveau attendu d'un candidat stage.

## Concepts clés à maîtriser

Les patterns du GoF qu'on croise **vraiment** (les 23 par cœur n'intéressent personne) :

| Pattern | Intention | Exemple concret |
|---|---|---|
| Factory | Centraliser la création d'objets | `createLogger(env)` → console en dev, JSON en prod |
| Strategy | Rendre un algorithme interchangeable | Calcul de frais de port : standard / express / retrait |
| Observer | Notifier des abonnés d'un événement | `addEventListener`, signaux, event emitters Node |
| Adapter | Faire coïncider deux interfaces | Wrapper Stripe derrière votre port `PaymentGateway` |
| Singleton | Une instance unique globale | Pool de connexions DB — à manier avec méfiance |
| Dependency injection | Fournir les dépendances de l'extérieur | Constructeurs NestJS/Spring, exemple ci-dessus |

Pourquoi se méfier du **singleton** : c'est un état global déguisé. Il couple tout le code qui l'appelle, rend les tests interdépendants (l'état fuit d'un test à l'autre) et cache les dépendances (rien dans la signature n'indique que la classe l'utilise). Le besoin légitime (une seule instance d'un pool) se résout mieux en créant l'objet une fois au démarrage et en l'**injectant** — instance unique, sans accès global.

Et le contrepoids indispensable : **YAGNI** (*You Aren't Gonna Need It*). Une abstraction se paie comptant (indirection, fichiers, charge mentale) pour un bénéfice hypothétique. La bonne heuristique : abstraire à la **deuxième ou troisième occurrence réelle**, pas à la première intuition — une abstraction prématurée qui s'avère fausse coûte plus cher qu'une duplication temporaire, parce qu'il faut la défaire partout.

> ⚠️ **Sur-ingénierie** — une interface avec une seule implémentation « au cas où », une factory pour un seul produit, cinq couches pour un CRUD : c'est du SOLID de cargo cult. En entretien, dire « je n'abstrais qu'à la deuxième implémentation réelle » marque plus de points que réciter les 23 patterns du GoF. Les intervieweurs seniors ont tous été réveillés à 3h du matin par une architecture « propre » illisible.

## En entretien

**« Expliquez SOLID avec un exemple. »** — Dérouler l'acronyme en une phrase chacun, puis approfondir UN principe avec violation + correction. Le plus parlant : S (la classe qui fait tout → découpage par raison de changer) ou D (le `new` en dur → injection par interface, et enchaîner sur la testabilité).

**« C'est quoi l'injection de dépendances, et pourquoi ? »** — Fournir les dépendances de l'extérieur (constructeur) au lieu de les construire dedans. Trois bénéfices : testabilité (on injecte un faux), découplage (on dépend d'une interface), flexibilité (on change d'implémentation sans toucher la classe). Bonus : le container DI n'est qu'une automatisation, le principe existe sans lui.

**« Quel design pattern avez-vous utilisé récemment ? »** — Préparer une histoire vraie. Strategy est le plus facile à raconter : « trois modes de calcul de X, un switch qui grossissait, je l'ai remplacé par une interface et trois implémentations — ajouter un mode = ajouter une classe ». Concret > catalogue.

**« Pourquoi dit-on que le singleton est un anti-pattern ? »** — État global caché : couplage fort, tests interdépendants, dépendances invisibles dans les signatures. L'alternative : créer une instance unique au démarrage et l'injecter — même garantie, sans les inconvénients.

**« C'est quoi l'architecture hexagonale ? »** — Domaine métier au centre sans dépendance technique ; il définit des ports (interfaces) ; l'infrastructure fournit des adapters (DB, HTTP, APIs). Les dépendances pointent vers le centre. Bénéfice concret : tester le métier sans DB, changer d'infra sans toucher aux règles.

## Pièges & idées reçues

- **« Plus il y a de patterns, mieux c'est »** — non : un pattern est une solution nommée à un problème récurrent. Sans le problème, le pattern est du bruit. Le code le plus simple qui marche gagne.
- **« SOLID impose des interfaces partout »** — non : une interface se justifie quand il existe (ou va exister très bientôt) plusieurs implémentations, ou un besoin de substitution en test. Une interface à implémentation unique est une indirection gratuite.
- **« L'héritage, c'est de la POO donc c'est bien »** — l'héritage est le couplage le plus fort qui existe ; la composition est presque toujours préférable (*composition over inheritance*). Liskov est précisément le principe qu'on viole en héritant trop vite.
- **Confondre le pattern et la bibliothèque** — `addEventListener` EST l'observer pattern ; les hooks React s'apparentent à strategy/observer. Savoir nommer les patterns dans les outils qu'on utilise déjà impressionne plus que des UML théoriques.
- **Appliquer l'hexagonal à un CRUD de 500 lignes** — l'architecture propre a un coût d'entrée ; sur un petit projet, un découpage simple en couches (routes / services / repositories) suffit largement.

## Pour aller plus loin

- [Refactoring.Guru — Design Patterns](https://refactoring.guru/design-patterns) : le meilleur catalogue illustré, gratuit
- [The Clean Architecture — Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html) : l'article fondateur
- [Hexagonal Architecture — Alistair Cockburn](https://alistair.cockburn.us/hexagonal-architecture/) : ports & adapters à la source
- Exercice concret : prendre un de vos projets, repérer un `switch` qui grossit ou un `new` en dur dans un service, et refactorer en strategy ou en injection — c'est l'histoire à raconter en entretien
